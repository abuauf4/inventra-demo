import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dashboard - Role-based workspace data
export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get('role') || 'staff'
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Common queries for all roles
    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      salesTodayAggregate,
      purchasesTodayAggregate,
      salesAllAggregate,
      purchasesAllAggregate,
      variantsWithProducts,
      recentPurchases,
      recentSales,
      recentActivityLogs,
      pendingPurchaseCount,
      pendingSaleCount,
      warehouseCount,
      totalWarehouses,
    ] = await Promise.all([
      // Count active products
      db.product.count({
        where: { isActive: true, variants: { some: { isActive: true } } },
      }),
      // Count customers
      db.customer.count(),
      // Count suppliers
      db.supplier.count(),
      // Sum of today's sales (COMPLETED + PAID)
      db.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          status: { in: ['COMPLETED', 'PAID'] },
          date: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Sum of today's purchases (RECEIVED)
      db.purchase.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          status: 'RECEIVED',
          date: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Sum of all sales (COMPLETED + PAID)
      db.sale.aggregate({
        _sum: { total: true },
        where: { status: { in: ['COMPLETED', 'PAID'] } },
      }),
      // Sum of all purchases (RECEIVED)
      db.purchase.aggregate({
        _sum: { total: true },
        where: { status: 'RECEIVED' },
      }),
      // All variants with product info for low stock check
      db.productVariant.findMany({
        where: { isActive: true },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
      // Recent purchases
      db.purchase.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          transNo: true,
          date: true,
          total: true,
          status: true,
          supplier: { select: { name: true } },
        },
      }),
      // Recent sales
      db.sale.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          transNo: true,
          date: true,
          total: true,
          status: true,
          customer: { select: { name: true, code: true } },
        },
      }),
      // Recent activity logs
      db.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true },
          },
        },
      }),
      // Pending purchase orders (DRAFT + APPROVED)
      db.purchase.count({
        where: { status: { in: ['DRAFT', 'APPROVED'] } },
      }),
      // Pending sales orders (DRAFT + PAID)
      db.sale.count({
        where: { status: { in: ['DRAFT', 'PAID'] } },
      }),
      // Warehouse stock count (for warehouse role)
      db.warehouseStock.count({
        where: { stock: { lte: 0 } },
      }),
      // Total warehouses
      db.warehouse.count({ where: { isActive: true } }),
    ])

    // Filter low stock variants
    const lowStockVariants = variantsWithProducts
      .filter((v) => v.stock <= v.minStock)
      .map((v) => ({
        variantId: v.id,
        variantName: v.name,
        variantSku: v.sku,
        stock: v.stock,
        minStock: v.minStock,
        productId: v.product.id,
        productName: v.product.name,
        productSku: v.product.sku,
        category: v.product.category?.name || null,
      }))

    // Combine recent transactions
    const recentTransactions = [
      ...recentPurchases.map((p) => ({
        type: 'purchase' as const,
        id: p.id,
        transNo: p.transNo,
        date: p.date,
        total: p.total,
        status: p.status,
        party: p.supplier?.name,
      })),
      ...recentSales.map((s) => ({
        type: 'sale' as const,
        id: s.id,
        transNo: s.transNo,
        date: s.date,
        total: s.total,
        status: s.status,
        party: s.customer?.name,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    // Stock in/out today (from activity logs or stock mutations)
    const stockInToday = await db.stockMutation.count({
      where: { type: 'IN', createdAt: { gte: todayStart, lte: todayEnd } },
    })
    const stockOutToday = await db.stockMutation.count({
      where: { type: 'OUT', createdAt: { gte: todayStart, lte: todayEnd } },
    })

    // New customers this week
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 7)
    const newCustomersThisWeek = await db.customer.count({
      where: { createdAt: { gte: weekStart } },
    })

    // Base data for all roles
    const baseData = {
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalWarehouses,
      // Today's metrics
      salesToday: salesTodayAggregate._sum.total ?? 0,
      salesTodayCount: salesTodayAggregate._count,
      purchasesToday: purchasesTodayAggregate._sum.total ?? 0,
      purchasesTodayCount: purchasesTodayAggregate._count,
      // All-time metrics
      totalSales: salesAllAggregate._sum.total ?? 0,
      totalPurchases: purchasesAllAggregate._sum.total ?? 0,
      // Alerts
      lowStockProducts: lowStockVariants,
      lowStockCount: lowStockVariants.length,
      pendingPurchaseCount,
      pendingSaleCount,
      // Stock movement today
      stockInToday,
      stockOutToday,
      // New customers
      newCustomersThisWeek,
      // Lists
      recentTransactions,
      recentActivityLogs,
    }

    return NextResponse.json({
      success: true,
      data: baseData,
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data workspace' },
      { status: 500 }
    )
  }
}
