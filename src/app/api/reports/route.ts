import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// Helper: get current month start/end as ISO date strings
function getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const firstDay = new Date(y, m, 1)
  const lastDay = new Date(y, m + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    dateFrom: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
    dateTo: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
  }
}

// Helper: resolve dateFrom/dateTo, defaulting to current month if not provided
function resolveDateRange(dateFrom: string | null, dateTo: string | null): { dateFrom: string; dateTo: string } {
  const current = getCurrentMonthRange()
  return {
    dateFrom: dateFrom || current.dateFrom,
    dateTo: dateTo || current.dateTo,
  }
}

// Helper: get period key from date based on period type
function getPeriodKey(date: Date, period: string): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  switch (period) {
    case 'daily':
      return `${y}-${m}-${d}`
    case 'weekly': {
      const tempDate = new Date(date.getTime())
      tempDate.setHours(0, 0, 0, 0)
      tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7))
      const week1 = new Date(tempDate.getFullYear(), 0, 4)
      const weekNumber = String(
        1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
      ).padStart(2, '0')
      return `${tempDate.getFullYear()}-W${weekNumber}`
    }
    case 'monthly':
      return `${y}-${m}`
    default:
      return `${y}-${m}-${d}`
  }
}

// Helper: build date range filter for sales
function buildSaleDateFilter(dateFrom: string, dateTo: string): Prisma.SaleWhereInput {
  const filter: Prisma.SaleWhereInput = {}
  if (dateFrom || dateTo) {
    filter.date = {}
    if (dateFrom) filter.date.gte = new Date(dateFrom)
    if (dateTo) filter.date.lte = new Date(dateTo)
  }
  return filter
}

// Helper: build date range filter for purchases
function buildPurchaseDateFilter(dateFrom: string, dateTo: string): Prisma.PurchaseWhereInput {
  const filter: Prisma.PurchaseWhereInput = {}
  if (dateFrom || dateTo) {
    filter.date = {}
    if (dateFrom) filter.date.gte = new Date(dateFrom)
    if (dateTo) filter.date.lte = new Date(dateTo)
  }
  return filter
}

interface GroupedPeriod {
  period: string
  totalAmount: number
  count: number
  transactions: { date: Date | string; total: number; transNo: string; id: string; status: string }[]
}

// Helper: group transactions by period
function groupByPeriod(
  transactions: { date: Date | string; total: number; transNo: string; id: string; status: string }[],
  period: string
): GroupedPeriod[] {
  const groups: Record<string, GroupedPeriod> = {}

  for (const tx of transactions) {
    const key = getPeriodKey(new Date(tx.date), period)
    if (!groups[key]) {
      groups[key] = {
        period: key,
        totalAmount: 0,
        count: 0,
        transactions: [],
      }
    }
    groups[key].totalAmount += tx.total
    groups[key].count += 1
    groups[key].transactions.push(tx)
  }

  return Object.values(groups).sort((a, b) => b.period.localeCompare(a.period))
}

// GET /api/reports - Return reports data based on type
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || ''

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Parameter type wajib diisi (sales, purchases, stock)' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'sales': {
        const period = searchParams.get('period') || 'daily'
        const resolved = resolveDateRange(searchParams.get('dateFrom'), searchParams.get('dateTo'))
        const dateFrom = resolved.dateFrom
        const dateTo = resolved.dateTo
        const customerId = searchParams.get('customerId') || ''

        const where: Prisma.SaleWhereInput = { ...buildSaleDateFilter(dateFrom, dateTo) }

        // Filter by customer
        if (customerId) {
          where.customerId = customerId
        }

        // Filter by status — only COMPLETED and PAID count as revenue
        // But we fetch all and separate in response
        const sales = await db.sale.findMany({
          where,
          take: 500,
          include: {
            customer: { select: { id: true, name: true, code: true } },
            items: {
              include: {
                variant: {
                  select: { id: true, name: true, sku: true },
                },
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
        })

        // Separate revenue (COMPLETED + PAID) from all transactions
        const revenueSales = sales.filter(s => s.status === 'COMPLETED' || s.status === 'PAID')
        const allSales = sales.filter(s => s.status !== 'CANCELLED' && s.status !== 'DRAFT')

        const grouped = groupByPeriod(
          allSales.map((s) => ({ date: s.date, total: s.total, transNo: s.transNo, id: s.id, status: s.status })),
          period
        )

        const grandTotal = allSales.reduce((sum, s) => sum + s.total, 0)
        const revenue = revenueSales.reduce((sum, s) => sum + s.total, 0)
        const totalTransactions = allSales.length
        const totalAllTransactions = sales.length

        // Top selling products (by revenue) — aggregate from items
        const productRevenueMap: Record<string, { name: string; sku: string; qty: number; revenue: number; cost: number }> = {}
        for (const sale of revenueSales) {
          for (const item of sale.items) {
            const key = item.variantId || item.productId || 'unknown'
            const label = item.variant?.name || item.product?.name || 'Unknown'
            const sku = item.variant?.sku || item.product?.sku || '-'
            if (!productRevenueMap[key]) {
              productRevenueMap[key] = { name: label, sku, qty: 0, revenue: 0, cost: 0 }
            }
            productRevenueMap[key].qty += item.qty
            productRevenueMap[key].revenue += item.qty * item.sellPrice
            // Estimate cost from buyPrice if available
            const buyPrice = (item.variant as any)?.buyPrice || (item.product as any)?.buyPrice || 0
            productRevenueMap[key].cost += item.qty * buyPrice
          }
        }
        const topProductsByRevenue = Object.values(productRevenueMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
        const topProductsByQty = Object.values(productRevenueMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10)

        // Total estimated cost for profit calculation
        const totalCost = Object.values(productRevenueMap).reduce((sum, p) => sum + p.cost, 0)
        const estimatedProfit = revenue - totalCost

        // Customer ranking
        const customerMap: Record<string, { name: string; code: string; totalSpent: number; orderCount: number }> = {}
        for (const sale of revenueSales) {
          const cId = sale.customerId || 'walk-in'
          if (!customerMap[cId]) {
            customerMap[cId] = {
              name: sale.customer?.name || 'Umum',
              code: sale.customer?.code || '-',
              totalSpent: 0,
              orderCount: 0,
            }
          }
          customerMap[cId].totalSpent += sale.total
          customerMap[cId].orderCount += 1
        }
        const topCustomers = Object.values(customerMap)
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 10)

        return NextResponse.json({
          success: true,
          data: {
            period,
            dateFrom,
            dateTo,
            grouped,
            grandTotal,
            revenue,
            totalTransactions,
            totalAllTransactions,
            totalCost,
            estimatedProfit,
            topProductsByRevenue,
            topProductsByQty,
            topCustomers,
          },
        })
      }

      case 'purchases': {
        const period = searchParams.get('period') || 'daily'
        const resolved = resolveDateRange(searchParams.get('dateFrom'), searchParams.get('dateTo'))
        const dateFrom = resolved.dateFrom
        const dateTo = resolved.dateTo
        const supplierId = searchParams.get('supplierId') || ''

        const where: Prisma.PurchaseWhereInput = { ...buildPurchaseDateFilter(dateFrom, dateTo) }

        // Filter by supplier
        if (supplierId) {
          where.supplierId = supplierId
        }

        const purchases = await db.purchase.findMany({
          where,
          take: 500,
          include: {
            supplier: { select: { id: true, name: true, code: true } },
            items: {
              include: {
                variant: {
                  select: { id: true, name: true, sku: true },
                },
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
        })

        // Only RECEIVED purchases count as actual costs
        const receivedPurchases = purchases.filter(p => p.status === 'RECEIVED')
        const allPurchases = purchases.filter(p => p.status !== 'CANCELLED' && p.status !== 'DRAFT')

        const grouped = groupByPeriod(
          allPurchases.map((p) => ({ date: p.date, total: p.total, transNo: p.transNo, id: p.id, status: p.status })),
          period
        )

        const grandTotal = allPurchases.reduce((sum, p) => sum + p.total, 0)
        const cost = receivedPurchases.reduce((sum, p) => sum + p.total, 0)
        const totalTransactions = allPurchases.length
        const totalAllTransactions = purchases.length

        // Top purchased products (by cost) — aggregate from items
        const productCostMap: Record<string, { name: string; sku: string; qty: number; cost: number }> = {}
        for (const purchase of receivedPurchases) {
          for (const item of purchase.items) {
            const key = item.variantId || item.productId || 'unknown'
            const label = item.variant?.name || item.product?.name || 'Unknown'
            const sku = item.variant?.sku || item.product?.sku || '-'
            if (!productCostMap[key]) {
              productCostMap[key] = { name: label, sku, qty: 0, cost: 0 }
            }
            productCostMap[key].qty += item.qty
            productCostMap[key].cost += item.qty * item.buyPrice
          }
        }
        const topProductsByCost = Object.values(productCostMap)
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 10)
        const topProductsByQty = Object.values(productCostMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10)

        // Supplier ranking
        const supplierMap: Record<string, { name: string; code: string; totalSpent: number; orderCount: number }> = {}
        for (const purchase of allPurchases) {
          const sId = purchase.supplierId || 'unknown'
          if (!supplierMap[sId]) {
            supplierMap[sId] = {
              name: purchase.supplier?.name || 'Unknown',
              code: purchase.supplier?.code || '-',
              totalSpent: 0,
              orderCount: 0,
            }
          }
          supplierMap[sId].totalSpent += purchase.total
          supplierMap[sId].orderCount += 1
        }
        const topSuppliers = Object.values(supplierMap)
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 10)

        return NextResponse.json({
          success: true,
          data: {
            period,
            dateFrom,
            dateTo,
            grouped,
            grandTotal,
            cost,
            totalTransactions,
            totalAllTransactions,
            topProductsByCost,
            topProductsByQty,
            topSuppliers,
          },
        })
      }

      case 'stock': {
        const categoryId = searchParams.get('categoryId') || ''
        const supplierId = searchParams.get('supplierId') || ''
        const productId = searchParams.get('productId') || ''
        const lowStockOnly = searchParams.get('lowStockOnly') === 'true'

        const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true }
        const productWhere: Prisma.ProductWhereInput = { isActive: true }
        if (categoryId) productWhere.categoryId = categoryId
        if (supplierId) productWhere.supplierId = supplierId
        if (productId) productWhere.id = productId
        if (Object.keys(productWhere).length > 1) { // >1 because isActive is always set
          variantWhere.product = productWhere
        }

        const variants = await db.productVariant.findMany({
          where: variantWhere,
          take: 500,
          include: {
            product: {
              include: {
                category: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        })

        const stockData = variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          attributes: v.attributes,
          productId: v.product.id,
          productName: v.product.name,
          productSku: v.product.sku,
          category: v.product.category?.name || null,
          stock: v.stock,
          minStock: v.minStock,
          buyPrice: v.buyPrice,
          sellPrice: v.sellPrice,
          stockValue: v.stock * v.buyPrice,
          isLowStock: v.stock <= v.minStock,
        }))

        const lowStockItems = stockData.filter((v) => v.isLowStock)
        const filteredStockData = lowStockOnly ? stockData.filter((v) => v.isLowStock) : stockData
        const totalInventoryValue = stockData.reduce((sum, v) => sum + v.stockValue, 0)
        const totalVariants = stockData.length

        const uniqueProductIds = new Set(variants.map((v) => v.productId))
        const totalProducts = uniqueProductIds.size

        return NextResponse.json({
          success: true,
          data: {
            variants: filteredStockData,
            lowStockItems,
            totalInventoryValue,
            totalProducts,
            totalVariants,
            lowStockCount: lowStockItems.length,
          },
        })
      }

      case 'stock-mutations': {
        const resolved = resolveDateRange(searchParams.get('dateFrom'), searchParams.get('dateTo'))
        const dateFrom = resolved.dateFrom
        const dateTo = resolved.dateTo

        const where: Prisma.StockMutationWhereInput = {}
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom)
        if (dateTo) {
          // Include the entire end date by setting time to end of day
          const endDate = new Date(dateTo)
          endDate.setHours(23, 59, 59, 999)
          where.createdAt.lte = endDate
        }

        const mutations = await db.stockMutation.findMany({
          where,
          take: 500,
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } },
            },
            warehouse: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Group by type for summary
        const byType: Record<string, { count: number; totalQty: number; mutations: any[] }> = {
          IN: { count: 0, totalQty: 0, mutations: [] },
          OUT: { count: 0, totalQty: 0, mutations: [] },
          ADJUSTMENT: { count: 0, totalQty: 0, mutations: [] },
          TRANSFER: { count: 0, totalQty: 0, mutations: [] },
        }

        for (const m of mutations) {
          const t = m.type as string
          if (!byType[t]) {
            byType[t] = { count: 0, totalQty: 0, mutations: [] }
          }
          byType[t].count += 1
          byType[t].totalQty += Math.abs(m.qty)
          byType[t].mutations.push(m)
        }

        const mappedMutations = mutations.map((m) => ({
          id: m.id,
          type: m.type,
          qty: m.qty,
          note: m.note,
          createdAt: m.createdAt,
          productName: m.variant?.product?.name || m.product?.name || '-',
          variantName: m.variant?.name || '-',
          sku: m.variant?.sku || m.product?.sku || '-',
          warehouseName: m.warehouse?.name || '-',
        }))

        return NextResponse.json({
          success: true,
          data: {
            dateFrom,
            dateTo,
            byType,
            mutations: mappedMutations,
            totalMutations: mutations.length,
          },
        })
      }

      default:
        return NextResponse.json(
          { success: false, message: 'Tipe laporan tidak valid. Gunakan: sales, purchases, stock, atau stock-mutations' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data laporan' },
      { status: 500 }
    )
  }
}
