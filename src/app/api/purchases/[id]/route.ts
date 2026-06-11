import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog, StockInsufficientError } from '@/lib/stock'

// Valid purchase status transitions
const VALID_PURCHASE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['CANCELLED'],
  CANCELLED: [], // No transitions allowed from CANCELLED
}

// GET /api/purchases/[id] - Get single purchase with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            variant: {
              select: { id: true, name: true, sku: true, buyPrice: true, sellPrice: true, stock: true },
            },
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: 'Pembelian tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: purchase })
  } catch (error) {
    console.error('Get purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pembelian' },
      { status: 500 }
    )
  }
}

// PUT /api/purchases/[id] - Update purchase (mainly status changes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Status wajib diisi' },
        { status: 400 }
      )
    }

    const validStatuses = ['DRAFT', 'APPROVED', 'RECEIVED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Gunakan: DRAFT, APPROVED, RECEIVED, CANCELLED' },
        { status: 400 }
      )
    }

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: 'Pembelian tidak ditemukan' },
        { status: 404 }
      )
    }

    const currentStatus = purchase.status
    const newStatus = status

    const allowedTransitions = VALID_PURCHASE_TRANSITIONS[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      if (currentStatus === newStatus) {
        return NextResponse.json({ success: true, data: purchase })
      }
      return NextResponse.json(
        {
          success: false,
          message: `Transisi status dari ${currentStatus} ke ${newStatus} tidak diizinkan. Transisi yang diizinkan: ${allowedTransitions.join(', ') || 'tidak ada'}`,
        },
        { status: 400 }
      )
    }

    const updatedPurchase = await db.$transaction(async (tx) => {
      // Determine the default warehouse once
      const defaultWarehouse = await tx.warehouse.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      const warehouseId = defaultWarehouse?.id

      // When status changes to "RECEIVED", update stock and create IN mutations
      if (newStatus === 'RECEIVED') {
        for (const item of purchase.items) {
          const variant = item.variantId
            ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
            : await tx.productVariant.findFirst({ where: { productId: item.productId!, isActive: true } })

          if (!variant) {
            throw new Error(`Variant tidak ditemukan untuk item pembelian`)
          }

          // C1: atomic stock update, C4: returns previousStock/newStock
          const stockResult = await updateVariantStock(variant.id, item.qty, warehouseId, tx)

          // C3: Store warehouseId in mutation for reversal tracking
          await tx.stockMutation.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              warehouseId,  // ★ C3: Store warehouse for reversal
              type: 'IN',
              qty: item.qty,
              note: `Pembelian ${purchase.transNo} - Status RECEIVED`,
              referenceId: purchase.id,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
          })
        }
      }

      // When status changes to "CANCELLED" from "RECEIVED", reverse stock
      if (newStatus === 'CANCELLED' && currentStatus === 'RECEIVED') {
        // ★ C3: Look up original IN mutations to find correct warehouse
        const originalInMutations = await tx.stockMutation.findMany({
          where: {
            referenceId: purchase.id,
            type: 'IN',
          },
        })

        // Build map: variantId → warehouseId from original mutations
        const variantWarehouseMap = new Map<string, string | null>()
        for (const mut of originalInMutations) {
          variantWarehouseMap.set(mut.variantId!, mut.warehouseId)
        }

        for (const item of purchase.items) {
          const variant = item.variantId
            ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
            : await tx.productVariant.findFirst({ where: { productId: item.productId!, isActive: true } })

          if (!variant) {
            throw new Error(`Variant tidak ditemukan untuk item pembelian`)
          }

          // ★ C3: Use the SAME warehouse that stock was added to originally
          const originalWarehouseId = variantWarehouseMap.get(item.variantId!) || undefined

          // C1: atomic stock update (deducting, so WHERE stock >= qty guard applies)
          const stockResult = await updateVariantStock(variant.id, -item.qty, originalWarehouseId, tx)

          await tx.stockMutation.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              warehouseId: originalWarehouseId || null,  // ★ C3: Return from SAME warehouse
              type: 'ADJUSTMENT',
              qty: item.qty,
              note: `Pembatalan pembelian ${purchase.transNo}`,
              referenceId: purchase.id,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
          })
        }
      }

      return await tx.purchase.update({
        where: { id },
        data: { status: newStatus },
        include: {
          supplier: true,
          items: {
            include: {
              variant: {
                select: { id: true, name: true, sku: true },
              },
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      })
    })

    await createActivityLog({
      action: 'STATUS_CHANGE',
      entity: 'Purchase',
      entityId: purchase.id,
      entityCode: purchase.transNo,
      details: `Pembelian ${purchase.transNo} status diubah dari ${currentStatus} ke ${newStatus}`,
      previousData: JSON.stringify({ status: currentStatus }),
      newData: JSON.stringify({ status: newStatus }),
    })

    return NextResponse.json({ success: true, data: updatedPurchase })
  } catch (error) {
    // C1: Handle StockInsufficientError
    if (error instanceof StockInsufficientError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      )
    }

    console.error('Update purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui pembelian' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchases/[id] - Delete purchase (only if status is DRAFT)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: 'Pembelian tidak ditemukan' },
        { status: 404 }
      )
    }

    if (purchase.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya pembelian dengan status DRAFT yang dapat dihapus' },
        { status: 400 }
      )
    }

    await db.purchase.delete({
      where: { id },
    })

    await createActivityLog({
      action: 'DELETE',
      entity: 'Purchase',
      entityId: id,
      entityCode: purchase.transNo,
      details: `Menghapus Pembelian ${purchase.transNo} (DRAFT)`,
    })

    return NextResponse.json({
      success: true,
      message: 'Pembelian berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus pembelian' },
      { status: 500 }
    )
  }
}
