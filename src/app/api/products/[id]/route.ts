import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/products/[id] - Update product with variant handling
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      sku,
      categoryId,
      supplierId,
      description,
      image,
      buyPrice,
      sellPrice,
      minStock,
      isActive,
      variants,
      version, // D4: optimistic locking — client must send current version
    } = body

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

    // D4: Optimistic locking — check version matches
    if (version !== undefined && version !== existingProduct.version) {
      return NextResponse.json(
        {
          success: false,
          message: 'Produk telah diubah oleh pengguna lain. Silakan refresh dan coba lagi.',
          currentVersion: existingProduct.version,
        },
        { status: 409 }
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
    if (description !== undefined) updateData.description = description || null
    if (image !== undefined) updateData.image = image || null
    if (buyPrice !== undefined) updateData.buyPrice = buyPrice
    if (sellPrice !== undefined) updateData.sellPrice = sellPrice
    if (minStock !== undefined) updateData.minStock = minStock
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle variants if provided
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        // If variant has an id, update it; otherwise create new
        if (v.id) {
          // Check SKU uniqueness if changed
          if (v.sku) {
            const existingVariant = await db.productVariant.findUnique({
              where: { sku: v.sku },
            })
            if (existingVariant && existingVariant.id !== v.id) {
              return NextResponse.json(
                { success: false, message: `SKU variant "${v.sku}" sudah digunakan` },
                { status: 409 }
              )
            }
          }

          const variantUpdate: Record<string, unknown> = {}
          if (v.name !== undefined) variantUpdate.name = v.name
          if (v.sku !== undefined) variantUpdate.sku = v.sku
          if (v.attributes !== undefined) variantUpdate.attributes = v.attributes
          if (v.buyPrice !== undefined) variantUpdate.buyPrice = v.buyPrice
          if (v.sellPrice !== undefined) variantUpdate.sellPrice = v.sellPrice
          if (v.stock !== undefined) variantUpdate.stock = v.stock
          if (v.minStock !== undefined) variantUpdate.minStock = v.minStock
          if (v.isActive !== undefined) variantUpdate.isActive = v.isActive
          if (v.barcode !== undefined) variantUpdate.barcode = v.barcode || null

          await db.productVariant.update({
            where: { id: v.id },
            data: variantUpdate,
          })
        } else {
          // Create new variant
          // Check SKU uniqueness
          if (v.sku) {
            const existingVariant = await db.productVariant.findUnique({
              where: { sku: v.sku },
            })
            if (existingVariant) {
              return NextResponse.json(
                { success: false, message: `SKU variant "${v.sku}" sudah digunakan` },
                { status: 409 }
              )
            }
          }

          await db.productVariant.create({
            data: {
              productId: id,
              name: v.name || 'Default',
              sku: v.sku || `${existingProduct.sku}-NEW`,
              attributes: v.attributes || '{}',
              buyPrice: v.buyPrice ?? buyPrice ?? 0,
              sellPrice: v.sellPrice ?? sellPrice ?? 0,
              stock: v.stock ?? 0,
              minStock: v.minStock ?? minStock ?? 0,
              isActive: v.isActive ?? true,
              barcode: v.barcode || null,
            },
          })
        }
      }
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 }, // D4: increment version on every update
      },
      include: {
        category: true,
        supplier: true,
        variants: {
          orderBy: { name: 'asc' },
        },
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

// DELETE /api/products/[id] - Delete product (only if no purchase/sale items reference it or its variants)
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
        variants: {
          include: {
            _count: {
              select: {
                purchaseItems: true,
                saleItems: true,
              },
            },
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
    let totalRefs = existingProduct._count.purchaseItems + existingProduct._count.saleItems

    // Also check variant references
    for (const variant of existingProduct.variants) {
      totalRefs += variant._count.purchaseItems + variant._count.saleItems
    }

    if (totalRefs > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Produk tidak dapat dihapus karena masih memiliki ${totalRefs} referensi transaksi`,
        },
        { status: 409 }
      )
    }

    // D2: Soft delete — set deletedAt instead of hard delete
    await db.product.update({
      where: { id },
      data: { deletedAt: new Date() },
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
