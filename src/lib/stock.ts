import { db } from './db'
import { Prisma } from '@prisma/client'

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]

// ─── Custom Error for Insufficient Stock ───

export class StockInsufficientError extends Error {
  variantId: string
  variantName: string
  requested: number
  available: number

  constructor(variantId: string, variantName: string, requested: number, available: number) {
    super(`Stok tidak cukup untuk ${variantName}. Tersedia: ${available}, diminta: ${requested}`)
    this.name = 'StockInsufficientError'
    this.variantId = variantId
    this.variantName = variantName
    this.requested = requested
    this.available = available
  }
}

// ─── Helper: get stock before/after for audit trail ───

async function getVariantStockSnapshot(
  variantId: string,
  client: TransactionClient
): Promise<{ stock: number; name: string }> {
  const variant = await client.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, name: true },
  })
  if (!variant) throw new Error(`Variant ${variantId} not found`)
  return variant
}

async function getWarehouseStockSnapshot(
  warehouseId: string,
  variantId: string,
  client: TransactionClient
): Promise<number> {
  const ws = await client.warehouseStock.findUnique({
    where: {
      warehouseId_productVariantId: { warehouseId, productVariantId: variantId },
    },
    select: { stock: true },
  })
  return ws?.stock ?? 0
}

/**
 * Update variant stock AND sync warehouse stock atomically.
 * This is the ONLY way stock should be modified to ensure consistency.
 *
 * C1: Uses atomic conditional UPDATE with `WHERE stock >= qty` for decrements.
 *     Throws StockInsufficientError if stock would go negative.
 *
 * C4: Returns { previousStock, newStock } for audit trail recording.
 *
 * If `tx` is provided, the operations run inside the caller's transaction.
 * If `tx` is NOT provided, the operations are wrapped in their own $transaction.
 *
 * @param variantId - The product variant ID
 * @param qty - The quantity change (positive = add, negative = subtract)
 * @param warehouseId - Optional warehouse ID. If not provided, updates the first active warehouse.
 * @param tx - Optional Prisma transaction client. Pass this when calling from within db.$transaction()
 */
export async function updateVariantStock(
  variantId: string,
  qty: number,
  warehouseId?: string,
  tx?: TransactionClient
): Promise<{ previousStock: number; newStock: number; warehousePreviousStock: number; warehouseNewStock: number }> {
  const execute = async (client: TransactionClient) => {
    // ─── C1: Atomic stock update with negative guard ───
    // For decrements (qty < 0), use raw SQL with WHERE stock >= abs(qty) to prevent negative stock
    // For increments (qty > 0), use normal Prisma increment (can't go negative)

    const absQty = Math.abs(qty)
    let previousStock: number
    let newStock: number

    if (qty < 0) {
      // Atomic decrement with stock >= absQty guard
      const result = await client.$executeRaw`
        UPDATE "ProductVariant" 
        SET stock = stock - ${absQty}, "updatedAt" = ${new Date()}
        WHERE id = ${variantId} AND stock >= ${absQty}
      `

      if (result === 0) {
        // Stock insufficient — fetch current stock for error message
        const variant = await client.productVariant.findUnique({
          where: { id: variantId },
          select: { stock: true, name: true },
        })
        throw new StockInsufficientError(
          variantId,
          variant?.name || variantId,
          absQty,
          variant?.stock ?? 0
        )
      }

      // Fetch the updated stock for audit trail
      const updated = await client.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true },
      })
      previousStock = (updated?.stock ?? 0) + absQty
      newStock = updated?.stock ?? 0
    } else {
      // Normal increment — get before value first
      const before = await client.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true },
      })
      previousStock = before?.stock ?? 0

      await client.productVariant.update({
        where: { id: variantId },
        data: {
          stock: { increment: qty },
        },
      })

      newStock = previousStock + qty
    }

    // ─── Determine warehouse ───
    let whId = warehouseId
    if (!whId) {
      const defaultWarehouse = await client.warehouse.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      whId = defaultWarehouse?.id
    }

    // ─── Update warehouse stock ───
    let warehousePreviousStock = 0
    let warehouseNewStock = 0

    if (whId) {
      const existingStock = await client.warehouseStock.findUnique({
        where: {
          warehouseId_productVariantId: {
            warehouseId: whId,
            productVariantId: variantId,
          },
        },
      })

      if (existingStock) {
        warehousePreviousStock = existingStock.stock

        if (qty < 0) {
          // Atomic decrement for warehouse stock too
          const wsResult = await client.$executeRaw`
            UPDATE "WarehouseStock" 
            SET stock = stock - ${absQty}, "updatedAt" = ${new Date()}
            WHERE id = ${existingStock.id} AND stock >= ${absQty}
          `

          if (wsResult === 0) {
            // Warehouse stock insufficient — but variant stock already decremented above!
            // We need to rollback. Since we're inside a transaction, the error will cause rollback.
            throw new StockInsufficientError(
              variantId,
              'WarehouseStock',
              absQty,
              existingStock.stock
            )
          }

          warehouseNewStock = warehousePreviousStock - absQty
        } else {
          await client.warehouseStock.update({
            where: { id: existingStock.id },
            data: {
              stock: { increment: qty },
            },
          })
          warehouseNewStock = warehousePreviousStock + qty
        }
      } else {
        // No warehouse stock entry yet
        const initialStock = qty > 0 ? qty : 0
        if (qty < 0) {
          console.warn(
            `[STOCK WARNING] Attempting negative stock update (${qty}) for variant ${variantId} with no warehouse stock entry. Creating with 0.`
          )
        }
        await client.warehouseStock.create({
          data: {
            warehouseId: whId,
            productVariantId: variantId,
            stock: initialStock,
          },
        })
        warehousePreviousStock = 0
        warehouseNewStock = initialStock
      }
    }

    return { previousStock, newStock, warehousePreviousStock, warehouseNewStock }
  }

  if (tx) {
    return execute(tx)
  }

  return db.$transaction(async (innerTx) => execute(innerTx))
}

/**
 * Create an activity log entry with enhanced audit data.
 */
export async function createActivityLog(params: {
  userId?: string
  action: string // CREATE, UPDATE, DELETE, LOGIN, STATUS_CHANGE
  entity: string // Product, Purchase, Sale, User, etc.
  entityId?: string
  entityCode?: string // Human-readable code (e.g., "PO-20260607-0001", "CUS000013")
  details: string // JSON or human-readable description
  previousData?: string // JSON string of previous values
  newData?: string // JSON string of new values
}) {
  try {
    let userId = params.userId
    if (!userId) {
      const owner = await db.user.findFirst({ where: { role: 'owner' } })
      userId = owner?.id || 'system'
    }

    await db.activityLog.create({
      data: {
        userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityCode: params.entityCode,
        details: params.details,
        previousData: params.previousData,
        newData: params.newData,
      },
    })
  } catch (error) {
    console.error('Failed to create activity log:', error)
  }
}
