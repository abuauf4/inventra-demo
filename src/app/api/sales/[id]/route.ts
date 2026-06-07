import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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
            product: {
              select: { id: true, name: true, sku: true, buyPrice: true, sellPrice: true, stock: true },
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

// DELETE /api/sales/[id] - Delete sale and reverse stock
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

    // Reverse stock for each item and create adjustment stock mutations
    for (const item of sale.items) {
      // Add qty back to product stock
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.qty,
          },
        },
      })

      // Create stock mutation for reversal
      await db.stockMutation.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          qty: item.qty,
          note: `Pembatalan penjualan ${sale.transNo}`,
          referenceId: sale.id,
        },
      })
    }

    // Delete the sale (cascade will delete items)
    await db.sale.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Penjualan berhasil dihapus dan stok dikembalikan',
    })
  } catch (error) {
    console.error('Delete sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus penjualan' },
      { status: 500 }
    )
  }
}
