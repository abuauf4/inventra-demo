import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/products - List products with category and supplier info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const supplierId = searchParams.get('supplierId') || ''
    const lowStock = searchParams.get('lowStock') === 'true'

    // Build where clause
    const where: Prisma.ProductWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter lowStock in JS because Prisma SQLite doesn't support column-to-column comparison in where
    const filtered = lowStock
      ? products.filter((p) => p.stock <= p.minStock)
      : products

    return NextResponse.json({ success: true, data: filtered })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data produk' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, sku, categoryId, supplierId, buyPrice, sellPrice, stock, minStock, isActive } = body

    // Validation
    if (!name || !sku || !categoryId) {
      return NextResponse.json(
        { success: false, message: 'Nama, SKU, dan kategori wajib diisi' },
        { status: 400 }
      )
    }

    // Check SKU uniqueness
    const existingProduct = await db.product.findUnique({
      where: { sku },
    })

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'SKU sudah digunakan' },
        { status: 409 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        sku,
        categoryId,
        supplierId: supplierId || null,
        buyPrice: buyPrice ?? 0,
        sellPrice: sellPrice ?? 0,
        stock: stock ?? 0,
        minStock: minStock ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        category: true,
        supplier: true,
      },
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat produk' },
      { status: 500 }
    )
  }
}
