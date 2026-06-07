import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/product-variants - List product variants
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId') || ''
    const search = searchParams.get('search') || ''

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'productId wajib diisi' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: Prisma.ProductVariantWhereInput = {
      productId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ]
    }

    const variants = await db.productVariant.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ success: true, data: variants })
  } catch (error) {
    console.error('Get product variants error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data varian produk' },
      { status: 500 }
    )
  }
}

// POST /api/product-variants - Create product variant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, name, sku, attributes, buyPrice, sellPrice, stock, minStock, isActive, barcode } = body

    // Validation
    if (!productId || !name || !sku) {
      return NextResponse.json(
        { success: false, message: 'productId, nama, dan SKU wajib diisi' },
        { status: 400 }
      )
    }

    // Check SKU uniqueness
    const existingVariant = await db.productVariant.findUnique({
      where: { sku },
    })

    if (existingVariant) {
      return NextResponse.json(
        { success: false, message: 'SKU sudah digunakan' },
        { status: 409 }
      )
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    const variant = await db.productVariant.create({
      data: {
        productId,
        name,
        sku,
        attributes: attributes || '{}',
        buyPrice: buyPrice ?? 0,
        sellPrice: sellPrice ?? 0,
        stock: stock ?? 0,
        minStock: minStock ?? 0,
        isActive: isActive ?? true,
        barcode: barcode || null,
      },
      include: {
        product: true,
      },
    })

    return NextResponse.json({ success: true, data: variant }, { status: 201 })
  } catch (error) {
    console.error('Create product variant error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat varian produk' },
      { status: 500 }
    )
  }
}
