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

    // Check if purchase exists with items
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

    // Validate status transition is allowed
    const allowedTransitions = VALID_PURCHASE_TRANSITIONS[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      if (currentStatus === newStatus) {
        // No state change needed
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

    // When status changes to "RECEIVED", update stock and create IN mutations
    if (newStatus === 'RECEIVED') {
      for (const item of purchase.items) {
        const variant = await resolveVariant(item.variantId, item.productId)
        if (!variant) {
          return NextResponse.json(
            { success: false, message: `Variant tidak ditemukan untuk item pembelian` },
            { status: 404 }
          )
        }

        // Update variant stock AND warehouse stock
        await updateVariantStock(variant.id, item.qty)

        // Create stock mutation
        await db.stockMutation.create({
          data: {
            variantId: variant.id,
            productId: variant.productId,
            type: 'IN',
            qty: item.qty,
            note: `Pembelian ${purchase.transNo} - Status RECEIVED`,
            referenceId: purchase.id,
          },
        })
      }
    }

    // When status changes to "CANCELLED" from "RECEIVED", reverse stock
    if (newStatus === 'CANCELLED' && currentStatus === 'RECEIVED') {
      for (const item of purchase.items) {
        const variant = await resolveVariant(item.variantId, item.productId)
        if (!variant) continue

        // Reverse variant stock AND warehouse stock
        await updateVariantStock(variant.id, -item.qty)

        // Create stock mutation for reversal
        await db.stockMutation.create({
          data: {
            variantId: variant.id,
            productId: variant.productId,
            type: 'ADJUSTMENT',
            qty: item.qty,
            note: `Pembatalan pembelian ${purchase.transNo}`,
            referenceId: purchase.id,
          },
        })
      }
    }

    // Update the purchase status
    const updatedPurchase = await db.purchase.update({
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

    // Activity log with enhanced data
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

    // Check if purchase exists with items
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

    // Only allow deletion if status is DRAFT
    if (purchase.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya pembelian dengan status DRAFT yang dapat dihapus' },
        { status: 400 }
      )
    }

    // Delete the purchase (cascade will delete items)
    await db.purchase.delete({
      where: { id },
    })

    // Activity log
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
