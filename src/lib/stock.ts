import { db } from './db'

/**
 * Update variant stock AND sync warehouse stock atomically.
 * This is the ONLY way stock should be modified to ensure consistency.
 * Wrapped in $transaction to prevent data inconsistency on partial failures.
 * 
 * @param variantId - The product variant ID
 * @param qty - The quantity change (positive = add, negative = subtract)
 * @param warehouseId - Optional warehouse ID. If not provided, updates the first active warehouse.
 */
export async function updateVariantStock(
  variantId: string,
  qty: number,
  warehouseId?: string
) {
  return await db.$transaction(async (tx) => {
    // 1. Update variant total stock
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: {
        stock: qty > 0 ? { increment: qty } : { decrement: Math.abs(qty) },
      },
    })

    // 2. Determine warehouse
    let whId = warehouseId
    if (!whId) {
      // Default to the first active warehouse
      const defaultWarehouse = await tx.warehouse.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      whId = defaultWarehouse?.id
    }

    // 3. Update warehouse stock
    if (whId) {
      const existingStock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productVariantId: {
            warehouseId: whId,
            productVariantId: variantId,
          },
        },
      })

      if (existingStock) {
        await tx.warehouseStock.update({
          where: { id: existingStock.id },
          data: {
            stock: qty > 0 ? { increment: qty } : { decrement: Math.abs(qty) },
          },
        })
      } else {
        // Create warehouse stock entry if it doesn't exist
        // BUGFIX: If qty is negative and no existing stock row, this means we're
        // trying to deduct from a non-existent warehouse stock. We create with 0
        // but log a warning because this indicates a data inconsistency.
        const initialStock = qty > 0 ? qty : 0
        if (qty < 0) {
          console.warn(
            `[STOCK WARNING] Attempting negative stock update (${qty}) for variant ${variantId} with no warehouse stock entry. ` +
            `Creating warehouse stock with 0 instead. This may indicate a data inconsistency.`
          )
        }
        await tx.warehouseStock.create({
          data: {
            warehouseId: whId,
            productVariantId: variantId,
            stock: initialStock,
          },
        })
      }
    }

    return updatedVariant
  })
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
    // If no userId provided, try to find the owner
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
    // Don't let activity log failures break the main operation
    console.error('Failed to create activity log:', error)
  }
}
