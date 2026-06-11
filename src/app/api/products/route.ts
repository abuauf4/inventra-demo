import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateCode } from '@/lib/autoCode'
import { createActivityLog } from '@/lib/stock'
import { sanitizeObject, sanitizeNumber } from '@/lib/sanitize'

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const mode = searchParams.get('mode') || 'full'
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, any> = {}

    // D2: Filter out soft-deleted records by default
    where.deletedAt = null

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

    // For low stock filter: we need to fetch variants and filter in JS
    // because Prisma can't compare two columns (stock <= minStock).
    // When lowStock is requested, we fetch without skip/take first, filter, then slice.
    if (lowStock) {
      // We'll filter after fetch
    }

    // mode=list: lightweight — no variants, just summary fields
    // mode=full (default): include variants for typeahead/detail
    const isListMode = mode === 'list'

    const productSelect: Record<string, any> = {
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
      category: {
        select: { id: true, name: true },
      },
      supplier: {
        select: { id: true, name: true, code: true },
      },
    }

    if (!isListMode) {
      productSelect.variants = {
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
      }
    }

    // When lowStock filter is active, we can't use DB-level pagination because
    // the filter depends on variant data (stock <= minStock). So we fetch all
    // matching products, filter in JS, then manually paginate.
    if (lowStock) {
      const allProducts = await db.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: 'desc' },
      })

      let data = allProducts.map((p: any) => {
        const activeVariants = (p.variants || []).filter((v: any) => v.isActive)
        const totalStock = activeVariants.reduce((sum: number, v: any) => sum + v.stock, 0)
        const lowStockVariantCount = activeVariants.filter((v: any) => v.stock <= v.minStock).length

        const result: Record<string, any> = {
          ...p,
          totalStock,
          lowStockVariantCount,
          variantCount: activeVariants.length,
          categoryName: p.category?.name || null,
          supplierName: p.supplier?.name || null,
        }

        if (isListMode) {
          delete result.variants
        }

        return result
      })

      // Filter low stock in JS
      data = data.filter((p) => p.lowStockVariantCount > 0)

      const total = data.length
      const paginatedData = data.slice(skip, skip + limit)

      return NextResponse.json({
        success: true,
        data: paginatedData,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      })
    }

    // Normal (non-lowStock) path: use DB-level pagination
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    // Compute stock summary per product
    const data = products.map((p: any) => {
      const activeVariants = (p.variants || []).filter((v: any) => v.isActive)
      const totalStock = activeVariants.reduce((sum: number, v: any) => sum + v.stock, 0)
      const lowStockVariantCount = activeVariants.filter((v: any) => v.stock <= v.minStock).length

      const result: Record<string, any> = {
        ...p,
        totalStock,
        lowStockVariantCount,
        variantCount: activeVariants.length,
        categoryName: p.category?.name || null,
        supplierName: p.supplier?.name || null,
      }

      // In list mode, strip variants array to reduce payload
      if (isListMode) {
        delete result.variants
      }

      return result
    })

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
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
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody, { allowHtmlFields: ['description', 'notes'] })
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

    // Sanitize numeric fields
    body.buyPrice = sanitizeNumber(body.buyPrice, 0)
    body.sellPrice = sanitizeNumber(body.sellPrice, 0)
    body.minStock = sanitizeNumber(body.minStock, 0)

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
