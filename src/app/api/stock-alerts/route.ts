import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/stock-alerts — Low stock alert items
// Returns all ProductVariants where stock <= minStock AND minStock > 0 AND isActive = true
// Includes warehouse breakdown
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity') || 'all' // all, critical, low, warning
    const sort = searchParams.get('sort') || 'stock-asc' // stock-asc, stock-desc, name-asc

    // Use raw SQL since Prisma doesn't support comparing two columns in WHERE
    const alerts = await db.$queryRaw<Array<{
      id: string
      name: string
      sku: string
      stock: number
      minStock: number
      productId: string
      productName: string
      productSku: string
      categoryName: string | null
    }>>`
      SELECT
        pv.id, pv.name, pv.sku, pv.stock, pv."minStock",
        p.id as "productId", p.name as "productName", p.sku as "productSku",
        c.name as "categoryName"
      FROM "ProductVariant" pv
      JOIN "Product" p ON pv."productId" = p.id
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE pv."isActive" = true AND pv."minStock" > 0 AND pv.stock <= pv."minStock"
    `

    // Fetch warehouse breakdown for all alert variants
    const variantIds = alerts.map(v => v.id)

    const warehouseStocks = variantIds.length > 0
      ? await db.warehouseStock.findMany({
          where: { productVariantId: { in: variantIds } },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        })
      : []

    // Build warehouse breakdown map
    const warehouseMap = new Map<string, Array<{ warehouseId: string; warehouseName: string; warehouseCode: string; stock: number }>>()
    for (const ws of warehouseStocks) {
      if (!warehouseMap.has(ws.productVariantId)) {
        warehouseMap.set(ws.productVariantId, [])
      }
      warehouseMap.get(ws.productVariantId)!.push({
        warehouseId: ws.warehouse.id,
        warehouseName: ws.warehouse.name,
        warehouseCode: ws.warehouse.code,
        stock: ws.stock,
      })
    }

    // Build result
    const allResults = alerts.map(v => ({
      variantId: v.id,
      variantName: v.name,
      variantSku: v.sku,
      stock: Number(v.stock),
      minStock: Number(v.minStock),
      productId: v.productId,
      productName: v.productName,
      productSku: v.productSku,
      category: v.categoryName,
      severity: Number(v.stock) === 0
        ? 'critical' as const
        : Number(v.stock) < Number(v.minStock) / 2
          ? 'low' as const
          : 'warning' as const,
      warehouseBreakdown: warehouseMap.get(v.id) || [],
    }))

    // Compute summary from ALL results (before filtering)
    const summary = {
      total: allResults.length,
      critical: allResults.filter(r => r.severity === 'critical').length,
      low: allResults.filter(r => r.severity === 'low').length,
      warning: allResults.filter(r => r.severity === 'warning').length,
    }

    // Filter by severity
    let result = allResults
    if (severity !== 'all') {
      result = result.filter(r => r.severity === severity)
    }

    // Sort
    switch (sort) {
      case 'stock-desc':
        result.sort((a, b) => b.stock - a.stock)
        break
      case 'name-asc':
        result.sort((a, b) => a.productName.localeCompare(b.productName))
        break
      case 'stock-asc':
      default:
        result.sort((a, b) => a.stock - b.stock)
        break
    }

    return NextResponse.json({
      success: true,
      data: result,
      summary,
    })
  } catch (error) {
    console.error('Get stock alerts error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data peringatan stok' },
      { status: 500 }
    )
  }
}

// POST /api/stock-alerts — Create alert setting (placeholder for future)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variantId } = body

    if (!variantId) {
      return NextResponse.json(
        { success: false, message: 'variantId diperlukan' },
        { status: 400 }
      )
    }

    // Check current stock status and create inbox notification if needed
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { name: true } },
      },
    })

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Varian tidak ditemukan' },
        { status: 404 }
      )
    }

    if (variant.minStock > 0 && variant.stock <= variant.minStock) {
      // Check if we already have a recent unread notification for this variant
      const existingNotification = await db.inbox.findFirst({
        where: {
          type: 'stock_low',
          entityId: variant.id,
          isRead: false,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      })

      if (!existingNotification) {
        await db.inbox.create({
          data: {
            type: 'stock_low',
            title: 'Stok Rendah',
            message: `${variant.product.name} — ${variant.name} stok tinggal ${variant.stock} (minimum: ${variant.minStock})`,
            entity: 'ProductVariant',
            entityId: variant.id,
            entityCode: variant.sku,
            priority: variant.stock === 0 ? 'urgent' : 'warning',
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: { alertCreated: true, stock: variant.stock, minStock: variant.minStock },
      })
    }

    return NextResponse.json({
      success: true,
      data: { alertCreated: false, stock: variant.stock, minStock: variant.minStock },
    })
  } catch (error) {
    console.error('Create stock alert error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat peringatan stok' },
      { status: 500 }
    )
  }
}
