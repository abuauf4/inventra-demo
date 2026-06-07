import { db } from './db'

/**
 * Update variant stock AND sync warehouse stock.
 * This is the ONLY way stock should be modified to ensure consistency.
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
  // 1. Update variant total stock
  const updatedVariant = await db.productVariant.update({
    where: { id: variantId },
    data: {
      stock: qty > 0 ? { increment: qty } : { decrement: Math.abs(qty) },
    },
  })

  // 2. Determine warehouse
  let whId = warehouseId
  if (!whId) {
    // Default to the first active warehouse
    const defaultWarehouse = await db.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    whId = defaultWarehouse?.id
  }

  // 3. Update warehouse stock
  if (whId) {
    const existingStock = await db.warehouseStock.findUnique({
      where: {
        warehouseId_productVariantId: {
          warehouseId: whId,
          productVariantId: variantId,
        },
      },
    })

    if (existingStock) {
      await db.warehouseStock.update({
        where: { id: existingStock.id },
        data: {
          stock: qty > 0 ? { increment: qty } : { decrement: Math.abs(qty) },
        },
      })
    } else {
      // Create warehouse stock entry if it doesn't exist
      await db.warehouseStock.create({
        data: {
          warehouseId: whId,
          productVariantId: variantId,
          stock: qty > 0 ? qty : 0,
        },
      })
    }
  }

  return updatedVariant
}

/**
 * Create an activity log entry.
 */
export async function createActivityLog(params: {
  userId?: string
  action: string // CREATE, UPDATE, DELETE, LOGIN, STATUS_CHANGE
  entity: string // Product, Purchase, Sale, User, etc.
  entityId?: string
  details: string // JSON or human-readable description
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
        details: params.details,
      },
    })
  } catch (error) {
    // Don't let activity log failures break the main operation
    console.error('Failed to create activity log:', error)
  }
}
