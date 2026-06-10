import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dashboard - Optimized: single raw SQL query to minimize Supabase roundtrips
// Previous: 15 Prisma queries → 8 groups → still ~1100ms warm
// Now: 1 raw SQL + 2 lightweight Prisma queries → target <700ms warm
export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 7)

    // Single raw SQL query that computes ALL dashboard aggregates at once
    // This reduces 11+ Prisma queries to just 1 database roundtrip
    const dashboardAgg = await db.$queryRaw<Array<{
      totalProducts: bigint
      totalCustomers: bigint
      totalSuppliers: bigint
      totalWarehouses: bigint
      salesToday: number | null
      salesTodayCount: bigint
      purchasesToday: number | null
      purchasesTodayCount: bigint
      totalSales: number | null
      totalPurchases: number | null
      pendingSaleCount: bigint
      pendingPurchaseCount: bigint
      stockInToday: bigint
      stockOutToday: bigint
      newCustomersThisWeek: bigint
    }>>`
      SELECT
        (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true AND id IN (SELECT "productId" FROM "ProductVariant" WHERE "isActive" = true)) as "totalProducts",
        (SELECT COUNT(*) FROM "Customer") as "totalCustomers",
        (SELECT COUNT(*) FROM "Supplier") as "totalSuppliers",
        (SELECT COUNT(*) FROM "Warehouse" WHERE "isActive" = true) as "totalWarehouses",
        (SELECT COALESCE(SUM(total), 0) FROM "Sale" WHERE status IN ('COMPLETED', 'PAID') AND date >= ${todayStart} AND date <= ${todayEnd}) as "salesToday",
        (SELECT COUNT(*) FROM "Sale" WHERE status IN ('COMPLETED', 'PAID') AND date >= ${todayStart} AND date <= ${todayEnd}) as "salesTodayCount",
        (SELECT COALESCE(SUM(total), 0) FROM "Purchase" WHERE status = 'RECEIVED' AND date >= ${todayStart} AND date <= ${todayEnd}) as "purchasesToday",
        (SELECT COUNT(*) FROM "Purchase" WHERE status = 'RECEIVED' AND date >= ${todayStart} AND date <= ${todayEnd}) as "purchasesTodayCount",
        (SELECT COALESCE(SUM(total), 0) FROM "Sale" WHERE status IN ('COMPLETED', 'PAID')) as "totalSales",
        (SELECT COALESCE(SUM(total), 0) FROM "Purchase" WHERE status = 'RECEIVED') as "totalPurchases",
        (SELECT COUNT(*) FROM "Sale" WHERE status IN ('DRAFT', 'PAID')) as "pendingSaleCount",
        (SELECT COUNT(*) FROM "Purchase" WHERE status IN ('DRAFT', 'APPROVED')) as "pendingPurchaseCount",
        (SELECT COUNT(*) FROM "StockMutation" WHERE type = 'IN' AND "createdAt" >= ${todayStart} AND "createdAt" <= ${todayEnd}) as "stockInToday",
        (SELECT COUNT(*) FROM "StockMutation" WHERE type = 'OUT' AND "createdAt" >= ${todayStart} AND "createdAt" <= ${todayEnd}) as "stockOutToday",
        (SELECT COUNT(*) FROM "Customer" WHERE "createdAt" >= ${weekStart}) as "newCustomersThisWeek"
    `

    // Fetch recent transactions + low stock in parallel (2 more roundtrips)
    const [recentSales, recentPurchases, lowStockProducts] = await Promise.all([
      db.sale.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true, transNo: true, date: true, total: true, status: true,
          customer: { select: { name: true } },
        },
      }),
      db.purchase.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true, transNo: true, date: true, total: true, status: true,
          supplier: { select: { name: true } },
        },
      }),
      db.$queryRaw<Array<{
        id: string, name: string, sku: string, stock: number, minStock: number,
        productId: string, productName: string, productSku: string, categoryName: string | null
      }>>`
        SELECT
          pv.id, pv.name, pv.sku, pv.stock, pv."minStock",
          p.id as "productId", p.name as "productName", p.sku as "productSku",
          c.name as "categoryName"
        FROM "ProductVariant" pv
        JOIN "Product" p ON pv."productId" = p.id
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE pv."isActive" = true AND pv.stock <= pv."minStock"
        ORDER BY pv.stock ASC
        LIMIT 10
      `,
    ])

    // Unpack aggregate results
    const agg = dashboardAgg[0]

    // Merge recent transactions
    const recentTransactions = [
      ...recentSales.map((s) => ({
        type: 'sale' as const, id: s.id, transNo: s.transNo,
        date: s.date, total: s.total, status: s.status, party: s.customer?.name,
      })),
      ...recentPurchases.map((p) => ({
        type: 'purchase' as const, id: p.id, transNo: p.transNo,
        date: p.date, total: p.total, status: p.status, party: p.supplier?.name,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    // Map low stock variants
    const lowStock = lowStockProducts.map((v) => ({
      variantId: v.id, variantName: v.name, variantSku: v.sku,
      stock: Number(v.stock), minStock: Number(v.minStock),
      productId: v.productId, productName: v.productName,
      productSku: v.productSku, category: v.categoryName,
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: Number(agg.totalProducts),
        totalCustomers: Number(agg.totalCustomers),
        totalSuppliers: Number(agg.totalSuppliers),
        totalWarehouses: Number(agg.totalWarehouses),
        salesToday: Number(agg.salesToday ?? 0),
        salesTodayCount: Number(agg.salesTodayCount),
        purchasesToday: Number(agg.purchasesToday ?? 0),
        purchasesTodayCount: Number(agg.purchasesTodayCount),
        totalSales: Number(agg.totalSales ?? 0),
        totalPurchases: Number(agg.totalPurchases ?? 0),
        lowStockProducts: lowStock,
        lowStockCount: lowStock.length,
        pendingPurchaseCount: Number(agg.pendingPurchaseCount),
        pendingSaleCount: Number(agg.pendingSaleCount),
        stockInToday: Number(agg.stockInToday),
        stockOutToday: Number(agg.stockOutToday),
        newCustomersThisWeek: Number(agg.newCustomersThisWeek),
        recentTransactions,
        recentActivityLogs: [] as any[],
      },
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data workspace' },
      { status: 500 }
    )
  }
}
