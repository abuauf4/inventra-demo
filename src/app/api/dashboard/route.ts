import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dashboard - Role-based workspace data (optimized with limits)
export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 7)

    // Core lightweight queries — counts & aggregates only, no full table scans
    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      salesTodayAggregate,
      purchasesTodayAggregate,
      salesAllAggregate,
      purchasesAllAggregate,
      allVariants,
      recentPurchases,
      recentSales,
      pendingPurchaseCount,
      pendingSaleCount,
      totalWarehouses,
      stockInToday,
      stockOutToday,
      newCustomersThisWeek,
    ] = await Promise.all([
      db.product.count({
        where: { isActive: true, variants: { some: { isActive: true } } },
      }),
      db.customer.count(),
      db.supplier.count(),
      db.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          status: { in: ['COMPLETED', 'PAID'] },
          date: { gte: todayStart, lte: todayEnd },
        },
      }),
      db.purchase.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          status: 'RECEIVED',
          date: { gte: todayStart, lte: todayEnd },
        },
      }),
      db.sale.aggregate({
        _sum: { total: true },
        where: { status: { in: ['COMPLETED', 'PAID'] } },
      }),
      db.purchase.aggregate({
        _sum: { total: true },
        where: { status: 'RECEIVED' },
      }),
      // Fetch only active variants with product info (for low stock filter in JS)
      // Limited to reduce payload — only need low stock ones
      db.productVariant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: { select: { name: true } },
            },
          },
        },
        take: 100,
      }),
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
      db.purchase.count({
        where: { status: { in: ['DRAFT', 'APPROVED'] } },
      }),
      db.sale.count({
        where: { status: { in: ['DRAFT', 'PAID'] } },
      }),
      db.warehouse.count({ where: { isActive: true } }),
      db.stockMutation.count({
        where: { type: 'IN', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.stockMutation.count({
        where: { type: 'OUT', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.customer.count({ where: { createdAt: { gte: weekStart } } }),
    ])

    // Filter low stock variants in JS, limit to top 10
    const lowStockProducts = allVariants
      .filter((v) => v.stock <= v.minStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
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
      .slice(0, 5)

    const baseData = {
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalWarehouses,
      salesToday: salesTodayAggregate._sum.total ?? 0,
      salesTodayCount: salesTodayAggregate._count,
      purchasesToday: purchasesTodayAggregate._sum.total ?? 0,
      purchasesTodayCount: purchasesTodayAggregate._count,
      totalSales: salesAllAggregate._sum.total ?? 0,
      totalPurchases: purchasesAllAggregate._sum.total ?? 0,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      pendingPurchaseCount,
      pendingSaleCount,
      stockInToday,
      stockOutToday,
      newCustomersThisWeek,
      recentTransactions,
      recentActivityLogs: [] as any[], // Removed from dashboard to reduce load
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
