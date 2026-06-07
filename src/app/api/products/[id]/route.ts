import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, sku, categoryId, supplierId, buyPrice, sellPrice, stock, minStock, isActive } = body

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // If SKU is changed, check uniqueness
    if (sku && sku !== existingProduct.sku) {
      const skuTaken = await db.product.findUnique({
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
    if (categoryId !== undefined) updateData.categoryId = categoryId
    if (supplierId !== undefined) updateData.supplierId = supplierId || null
    if (buyPrice !== undefined) updateData.buyPrice = buyPrice
    if (sellPrice !== undefined) updateData.sellPrice = sellPrice
    if (stock !== undefined) updateData.stock = stock
    if (minStock !== undefined) updateData.minStock = minStock
    if (isActive !== undefined) updateData.isActive = isActive

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        supplier: true,
      },
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui produk' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product (only if no purchase items or sale items reference it)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if product exists
    const existingProduct = await db.product.findUnique({
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

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if product has purchase items or sale items
    if (existingProduct._count.purchaseItems > 0 || existingProduct._count.saleItems > 0) {
      const totalRefs = existingProduct._count.purchaseItems + existingProduct._count.saleItems
      return NextResponse.json(
        {
          success: false,
          message: `Produk tidak dapat dihapus karena masih memiliki ${totalRefs} referensi transaksi`,
        },
        { status: 409 }
      )
    }

    await db.product.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus produk' },
      { status: 500 }
    )
  }
}
