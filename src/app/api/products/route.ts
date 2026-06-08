import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { generateCode } from '@/lib/autoCode'
import { createActivityLog } from '@/lib/stock'

// GET /api/products - List products with category, supplier, and variants
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
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
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
        variants: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter lowStock in JS: check if ANY variant has stock <= variant.minStock
    const filtered = lowStock
      ? products.filter((p) =>
          p.variants.some((v) => v.stock <= v.minStock)
        )
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

// POST /api/products - Create product with optional variants, auto-generate SKU if not provided
export async function POST(request: NextRequest) {
  try {
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
    } = body

    // Auto-generate SKU if not provided
    let productSku = sku
    if (!productSku) {
      productSku = await generateCode('CL', 'product')
    }

    // Validation
    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, message: 'Nama dan kategori wajib diisi' },
        { status: 400 }
      )
    }

    // Check SKU uniqueness on product
    const existingProduct = await db.product.findUnique({
      where: { sku: productSku },
    })

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'SKU sudah digunakan' },
        { status: 409 }
      )
    }

    // Check variant SKU uniqueness if variants provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
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
      }
    }

    // Build variant create data
    const variantCreateData = variants && Array.isArray(variants) && variants.length > 0
      ? variants.map(
          (v: {
            name: string
            sku: string
            attributes?: string
            buyPrice?: number
            sellPrice?: number
            stock?: number
            minStock?: number
            isActive?: boolean
            barcode?: string
          }) => ({
            name: v.name || 'Default',
            sku: v.sku || `${productSku}-DEF`,
            attributes: v.attributes || '{}',
            buyPrice: v.buyPrice ?? buyPrice ?? 0,
            sellPrice: v.sellPrice ?? sellPrice ?? 0,
            stock: v.stock ?? 0,
            minStock: v.minStock ?? minStock ?? 0,
            isActive: v.isActive ?? true,
            barcode: v.barcode || null,
          })
        )
      : undefined

    const product = await db.product.create({
      data: {
        name,
        sku: productSku,
        categoryId,
        supplierId: supplierId || null,
        description: description || null,
        image: image || null,
        buyPrice: buyPrice ?? 0,
        sellPrice: sellPrice ?? 0,
        minStock: minStock ?? 0,
        isActive: isActive ?? true,
        ...(variantCreateData && {
          variants: {
            create: variantCreateData,
          },
        }),
      },
      include: {
        category: true,
        supplier: true,
        variants: {
          orderBy: { name: 'asc' },
        },
      },
    })

    // Create WarehouseStock entries for variants with initial stock
    if (product.variants) {
      const warehouses = await db.warehouse.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
      const defaultWarehouse = warehouses[0]
      
      for (const variant of product.variants) {
        if (variant.stock > 0 && defaultWarehouse) {
          await db.warehouseStock.create({
            data: {
              warehouseId: defaultWarehouse.id,
              productVariantId: variant.id,
              stock: variant.stock,
            },
          })
        }
      }
    }

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      entityCode: productSku,
      details: `Membuat Product ${productSku} ${name}`,
      newData: JSON.stringify({ name, sku: productSku, categoryId, buyPrice, sellPrice }),
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
