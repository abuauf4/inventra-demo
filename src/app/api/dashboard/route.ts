import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/dashboard - Return dashboard statistics (V1.1 with variant-level stock)
export async function GET() {
  try {
    // Run independent queries in parallel
    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      salesAggregate,
      purchasesAggregate,
      variantsWithProducts,
      recentPurchases,
      recentSales,
      recentActivityLogs,
    ] = await Promise.all([
      // Count active products that have at least one active variant
      db.product.count({
        where: {
          isActive: true,
          variants: {
            some: { isActive: true },
          },
        },
      }),

      // Count customers
      db.customer.count(),

      // Count suppliers
      db.supplier.count(),

      // Sum of all sale totals (only COMPLETED)
      db.sale.aggregate({
        _sum: {
          total: true,
        },
        where: { status: { in: ['COMPLETED', 'PAID'] } },
      }),

      // Sum of all purchase totals (only RECEIVED)
      db.purchase.aggregate({
        _sum: {
          total: true,
        },
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
              category: {
                select: { name: true },
              },
            },
          },
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
          status: true,
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
          status: true,
        },
      }),

      // Recent activity logs (last 10)
      db.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ])

    // Filter low stock variants: variant.stock <= variant.minStock
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

    // Combine recent transactions and sort by date
    const recentTransactions = [
      ...recentPurchases.map((p) => ({
        type: 'purchase' as const,
        transNo: p.transNo,
        date: p.date,
        total: p.total,
        status: p.status,
      })),
      ...recentSales.map((s) => ({
        type: 'sale' as const,
        transNo: s.transNo,
        date: s.date,
        total: s.total,
        status: s.status,
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
        lowStockProducts: lowStockVariants,
        recentTransactions,
        recentActivityLogs,
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
