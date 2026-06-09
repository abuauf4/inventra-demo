import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog } from '@/lib/stock'

// Helper: resolve variant from item (prefer variantId, fallback to first variant of product)
async function resolveVariant(variantId: string | null | undefined, productId: string | null | undefined) {
  if (variantId) {
    return await db.productVariant.findUnique({ where: { id: variantId } })
  }
  if (productId) {
    return await db.productVariant.findFirst({ where: { productId, isActive: true } })
  }
  return null
}

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
        // No state change needed
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

    // Resolve variants for stock operations BEFORE the transaction
    const resolvedVariants = []
    for (const item of sale.items) {
      const variant = await resolveVariant(item.variantId, item.productId)
      if (!variant && (newStatus === 'COMPLETED' || (newStatus === 'CANCELLED' && currentStatus === 'COMPLETED'))) {
        return NextResponse.json(
          { success: false, message: `Variant tidak ditemukan untuk item penjualan` },
          { status: 404 }
        )
      }
      if (variant) {
        // Check stock availability before COMPLETED
        if (newStatus === 'COMPLETED' && item.qty > variant.stock) {
          return NextResponse.json(
            {
              success: false,
              message: `Stok tidak cukup untuk variant ${variant.name}. Stok tersedia: ${variant.stock}, diminta: ${item.qty}`,
            },
            { status: 400 }
          )
        }
        resolvedVariants.push({ item, variant })
      }
    }

    // Wrap status update + stock changes + mutations in ONE transaction
    const updatedSale = await db.$transaction(async (tx) => {
      // When status changes to "COMPLETED", update stock and create OUT mutations
      if (newStatus === 'COMPLETED') {
        for (const { item, variant } of resolvedVariants) {
          // Update variant stock AND warehouse stock (inside same transaction)
          await updateVariantStock(variant.id, -item.qty, undefined, tx)

          // Create stock mutation (inside same transaction)
          await tx.stockMutation.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              type: 'OUT',
              qty: item.qty,
              note: `Penjualan ${sale.transNo} - Status COMPLETED`,
              referenceId: sale.id,
            },
          })
        }
      }

      // When status changes to "CANCELLED" from "COMPLETED", reverse stock
      if (newStatus === 'CANCELLED' && currentStatus === 'COMPLETED') {
        for (const { item, variant } of resolvedVariants) {
          // Add qty back to variant stock AND warehouse stock (inside same transaction)
          await updateVariantStock(variant.id, item.qty, undefined, tx)

          // Create stock mutation for reversal (inside same transaction)
          await tx.stockMutation.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              type: 'ADJUSTMENT',
              qty: item.qty,
              note: `Pembatalan penjualan ${sale.transNo}`,
              referenceId: sale.id,
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

    // Only allow deletion if status is DRAFT
    if (sale.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya penjualan dengan status DRAFT yang dapat dihapus' },
        { status: 400 }
      )
    }

    // Delete the sale (cascade will delete items)
    await db.sale.delete({
      where: { id },
    })

    // Activity log
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
