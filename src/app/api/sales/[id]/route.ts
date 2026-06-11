import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog, StockInsufficientError } from '@/lib/stock'

// Valid sale status transitions
const VALID_SALE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PAID', 'COMPLETED', 'CANCELLED'],
  PAID: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  CANCELLED: [], // No transitions allowed from CANCELLED
}

// GET /api/sales/[id] - Get single sale with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        customer: true,
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

    if (!sale) {
      return NextResponse.json(
        { success: false, message: 'Penjualan tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: sale })
  } catch (error) {
    console.error('Get sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data penjualan' },
      { status: 500 }
    )
  }
}

// PUT /api/sales/[id] - Update sale (mainly status changes)
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

    const validStatuses = ['DRAFT', 'PAID', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Gunakan: DRAFT, PAID, COMPLETED, CANCELLED' },
        { status: 400 }
      )
    }

    // Check if sale exists with items
    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, message: 'Penjualan tidak ditemukan' },
        { status: 404 }
      )
    }

    const currentStatus = sale.status
    const newStatus = status

    // Validate status transition is allowed
    const allowedTransitions = VALID_SALE_TRANSITIONS[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      if (currentStatus === newStatus) {
        return NextResponse.json({ success: true, data: sale })
      }
      return NextResponse.json(
        {
          success: false,
          message: `Transisi status dari ${currentStatus} ke ${newStatus} tidak diizinkan. Transisi yang diizinkan: ${allowedTransitions.join(', ') || 'tidak ada'}`,
        },
        { status: 400 }
      )
    }

    // ─── C3: Multi-Warehouse Reversal ───
    // When COMPLETING: Store the warehouseId in the OUT mutation
    // When CANCELLING: Look up the original OUT mutations to find which warehouse to return stock to

    // Wrap status update + stock changes + mutations in ONE transaction
    const updatedSale = await db.$transaction(async (tx) => {
      // When status changes to "COMPLETED", update stock and create OUT mutations
      if (newStatus === 'COMPLETED') {
        // Determine the default warehouse once
        const defaultWarehouse = await tx.warehouse.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        })
        const warehouseId = defaultWarehouse?.id

        for (const item of sale.items) {
          // Resolve variant inside transaction
          const variant = item.variantId
            ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
            : await tx.productVariant.findFirst({ where: { productId: item.productId!, isActive: true } })

          if (!variant) {
            throw new Error(`Variant tidak ditemukan untuk item penjualan`)
          }

          // Update variant stock AND warehouse stock (C1: atomic with negative guard)
          const stockResult = await updateVariantStock(variant.id, -item.qty, warehouseId, tx)

          // Create stock mutation WITH warehouseId (C3: store for reversal)
          await tx.stockMutation.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              warehouseId,  // ★ C3: Store warehouse so we know where to return stock on cancel
              type: 'OUT',
              qty: item.qty,
              note: `Penjualan ${sale.transNo} - Status COMPLETED`,
              referenceId: sale.id,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
          })
        }
      }

      // When status changes to "CANCELLED" from "COMPLETED", reverse stock
      if (newStatus === 'CANCELLED' && currentStatus === 'COMPLETED') {
        // ★ C3: Look up original OUT mutations directly and reverse each one.
        // Using mutations directly (instead of a Map) correctly handles the case
        // where the same variantId appears in multiple sale items — each OUT
        // mutation has its own warehouseId and qty, and we reverse them 1:1.
        const originalOutMutations = await tx.stockMutation.findMany({
          where: {
            referenceId: sale.id,
            type: 'OUT',
          },
          orderBy: { createdAt: 'asc' },
        })

        for (const mut of originalOutMutations) {
          // Resolve variant inside transaction
          const variant = mut.variantId
            ? await tx.productVariant.findUnique({ where: { id: mut.variantId } })
            : null

          if (!variant) {
            throw new Error(`Variant tidak ditemukan untuk mutasi OUT ${mut.id}`)
          }

          // ★ C3: Return stock to the SAME warehouse it was taken from
          const originalWarehouseId = mut.warehouseId || undefined

          const stockResult = await updateVariantStock(variant.id, mut.qty, originalWarehouseId, tx)

          // Create reversal mutation with the original warehouseId
          await tx.stockMutation.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              warehouseId: mut.warehouseId,  // ★ C3: Return to SAME warehouse
              type: 'IN',
              qty: mut.qty,
              note: `Pembatalan penjualan ${sale.transNo} (reversal OUT ${mut.id})`,
              referenceId: sale.id,
              previousStock: stockResult.previousStock,
              newStock: stockResult.newStock,
            },
          })
        }
      }

      // Update the sale status
      return await tx.sale.update({
        where: { id },
        data: { status: newStatus },
        include: {
          customer: true,
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

    // Activity log with enhanced data
    await createActivityLog({
      action: 'STATUS_CHANGE',
      entity: 'Sale',
      entityId: sale.id,
      entityCode: sale.transNo,
      details: `Penjualan ${sale.transNo} status diubah dari ${currentStatus} ke ${newStatus}`,
      previousData: JSON.stringify({ status: currentStatus }),
      newData: JSON.stringify({ status: newStatus }),
    })

    return NextResponse.json({ success: true, data: updatedSale })
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

    console.error('Update sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui penjualan' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales/[id] - Delete sale (only if status is DRAFT)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, message: 'Penjualan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (sale.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya penjualan dengan status DRAFT yang dapat dihapus' },
        { status: 400 }
      )
    }

    // D2: Soft delete — set deletedAt instead of hard delete
    await db.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await createActivityLog({
      action: 'DELETE',
      entity: 'Sale',
      entityId: id,
      entityCode: sale.transNo,
      details: `Menghapus Penjualan ${sale.transNo} (DRAFT)`,
    })

    return NextResponse.json({
      success: true,
      message: 'Penjualan berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus penjualan' },
      { status: 500 }
    )
  }
}
