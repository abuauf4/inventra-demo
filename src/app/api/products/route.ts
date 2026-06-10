import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateCode } from '@/lib/autoCode'
import { createActivityLog } from '@/lib/stock'

// GET /api/products - Optimized list mode
// Returns flat fields for list/cards: id, sku, name, categoryName, supplierName,
// stock summary (totalStock, lowStockVariantCount), price summary, isActive
// Variants are NOT included in list mode — fetch via /api/products/[id] for detail view
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const supplierId = searchParams.get('supplierId') || ''
    const lowStock = searchParams.get('lowStock') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build where clause
    const where: Record<string, any> = {}

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

    // For low stock filter: use raw SQL subquery approach via $queryRaw
    // Prisma ORM doesn't support comparing two columns (stock <= minStock)
    // So we fetch all with the basic filters, then filter in JS
    // This is acceptable since product counts are typically small (<1000)
    if (lowStock) {
      // We'll filter after fetch
    }

    // Use select instead of include to avoid fetching full nested objects
    // This dramatically reduces the query complexity and payload size
    const products = await db.product.findMany({
      where,
      take: limit,
      select: {
        id: true,
        name: true,
        sku: true,
        buyPrice: true,
        sellPrice: true,
        minStock: true,
        isActive: true,
        description: true,
        image: true,
        categoryId: true,
        supplierId: true,
        createdAt: true,
        updatedAt: true,
        // Only fetch category name (not full object)
        category: {
          select: { id: true, name: true },
        },
        // Only fetch supplier name + code (not full object)
        supplier: {
          select: { id: true, name: true, code: true },
        },
        // Fetch variant summaries only: stock, minStock for low stock detection + count
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            minStock: true,
            buyPrice: true,
            sellPrice: true,
            isActive: true,
            attributes: true,
            barcode: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Compute stock summary per product (total stock across variants)
    // This is done in JS because Prisma doesn't support computed fields
    // But it's fast since data is already in memory from the select above
    let data = products.map((p) => {
      const activeVariants = p.variants.filter((v) => v.isActive)
      const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0)
      const lowStockVariantCount = activeVariants.filter((v) => v.stock <= v.minStock).length

      return {
        ...p,
        totalStock,
        lowStockVariantCount,
        variantCount: activeVariants.length,
      }
    })

    // Filter low stock in JS if requested (Prisma can't compare stock <= minStock)
    if (lowStock) {
      data = data.filter((p) => p.lowStockVariantCount > 0)
    }

    return NextResponse.json({ success: true, data })
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
