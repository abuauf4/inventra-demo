import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/dashboard - Return dashboard statistics
export async function GET() {
  try {
    // Run independent queries in parallel
    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      salesAggregate,
      purchasesAggregate,
      lowStockProducts,
      recentPurchases,
      recentSales,
    ] = await Promise.all([
      // Count active products
      db.product.count({
        where: { isActive: true },
      }),

      // Count customers
      db.customer.count(),

      // Count suppliers
      db.supplier.count(),

      // Sum of all sale totals
      db.sale.aggregate({
        _sum: {
          total: true,
        },
      }),

      // Sum of all purchase totals
      db.purchase.aggregate({
        _sum: {
          total: true,
        },
      }),

      // Products where stock <= minStock
      db.product.findMany({
        where: { isActive: true },
        select: {
          name: true,
          sku: true,
          stock: true,
          minStock: true,
        },
      }),

      // Recent purchases (last 5)
      db.purchase.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          transNo: true,
          date: true,
          total: true,
        },
      }),

      // Recent sales (last 5)
      db.sale.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          transNo: true,
          date: true,
          total: true,
        },
      }),
    ])

    // Filter low stock products in JS (Prisma SQLite doesn't support column comparison)
    const lowStockFiltered = lowStockProducts.filter((p) => p.stock <= p.minStock)

    // Combine recent transactions and sort by date
    const recentTransactions = [
      ...recentPurchases.map((p) => ({
        type: 'purchase' as const,
        transNo: p.transNo,
        date: p.date,
        total: p.total,
      })),
      ...recentSales.map((s) => ({
        type: 'sale' as const,
        transNo: s.transNo,
        date: s.date,
        total: s.total,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        totalSuppliers,
        totalSales: salesAggregate._sum.total ?? 0,
        totalPurchases: purchasesAggregate._sum.total ?? 0,
        lowStockProducts: lowStockFiltered,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data dashboard' },
      { status: 500 }
    )
  }
}
