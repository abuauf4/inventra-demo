import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/product-variants/[id] - Update variant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, sku, attributes, buyPrice, sellPrice, stock, minStock, isActive, barcode } = body

    // Check if variant exists
    const existingVariant = await db.productVariant.findUnique({
      where: { id },
    })

    if (!existingVariant) {
      return NextResponse.json(
        { success: false, message: 'Varian produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // If SKU is changed, check uniqueness
    if (sku && sku !== existingVariant.sku) {
      const skuTaken = await db.productVariant.findUnique({
        where: { sku },
      })
      if (skuTaken) {
        return NextResponse.json(
          { success: false, message: 'SKU sudah digunakan' },
          { status: 409 }
        )
      }
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (sku !== undefined) updateData.sku = sku
    if (attributes !== undefined) updateData.attributes = attributes
    if (buyPrice !== undefined) updateData.buyPrice = buyPrice
    if (sellPrice !== undefined) updateData.sellPrice = sellPrice
    if (stock !== undefined) updateData.stock = stock
    if (minStock !== undefined) updateData.minStock = minStock
    if (isActive !== undefined) updateData.isActive = isActive
    if (barcode !== undefined) updateData.barcode = barcode || null

    const variant = await db.productVariant.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
      },
    })

    return NextResponse.json({ success: true, data: variant })
  } catch (error) {
    console.error('Update product variant error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui varian produk' },
      { status: 500 }
    )
  }
}

// DELETE /api/product-variants/[id] - Delete variant (only if no purchase items or sale items reference it)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if variant exists
    const existingVariant = await db.productVariant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseItems: true,
            saleItems: true,
          },
        },
      },
    })

    if (!existingVariant) {
      return NextResponse.json(
        { success: false, message: 'Varian produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if variant has purchase items or sale items
    if (existingVariant._count.purchaseItems > 0 || existingVariant._count.saleItems > 0) {
      const totalRefs = existingVariant._count.purchaseItems + existingVariant._count.saleItems
      return NextResponse.json(
        {
          success: false,
          message: `Varian tidak dapat dihapus karena masih memiliki ${totalRefs} referensi transaksi`,
        },
        { status: 409 }
      )
    }

    await db.productVariant.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Varian produk berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete product variant error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus varian produk' },
      { status: 500 }
    )
  }
}
