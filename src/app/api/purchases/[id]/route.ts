import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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
            product: {
              select: { id: true, name: true, sku: true, buyPrice: true, sellPrice: true, stock: true },
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

// DELETE /api/purchases/[id] - Delete purchase and reverse stock
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

    // Reverse stock for each item and create adjustment stock mutations
    for (const item of purchase.items) {
      // Subtract qty from product stock
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.qty,
          },
        },
      })

      // Create stock mutation for reversal
      await db.stockMutation.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          qty: item.qty,
          note: `Pembatalan pembelian ${purchase.transNo}`,
          referenceId: purchase.id,
        },
      })
    }

    // Delete the purchase (cascade will delete items)
    await db.purchase.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Pembelian berhasil dihapus dan stok dikembalikan',
    })
  } catch (error) {
    console.error('Delete purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus pembelian' },
      { status: 500 }
    )
  }
}
