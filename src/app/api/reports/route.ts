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

// Default page size for detail lists
const DEFAULT_PAGE_SIZE = 500
const MAX_PAGE_SIZE = 5000

function parsePagination(searchParams: URLSearchParams): { skip: number; take: number; page: number; pageSize: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10)))
  const skip = (page - 1) * pageSize
  const take = pageSize
  return { skip, take, page, pageSize }
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
        const { page, pageSize } = parsePagination(searchParams)

        const where: Prisma.SaleWhereInput = { ...buildSaleDateFilter(dateFrom, dateTo) }

        // Filter by customer
        if (customerId) {
          where.customerId = customerId
        }

        // ─── AGGREGATION: Accurate totals from DB (no truncation) ───

        // Total count of ALL matching sales
        const totalAllCount = await db.sale.count({ where })

        // Count & sum for non-DRAFT, non-CANCELLED sales (grand total)
        const activeWhere: Prisma.SaleWhereInput = {
          ...where,
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        }
        const activeAgg = await db.sale.aggregate({
          where: activeWhere,
          _count: true,
          _sum: { total: true },
        })
        const grandTotal = activeAgg._sum.total || 0
        const totalTransactions = activeAgg._count

        // Count & sum for revenue sales (COMPLETED + PAID only)
        const revenueWhere: Prisma.SaleWhereInput = {
          ...where,
          status: { in: ['COMPLETED', 'PAID'] },
        }
        const revenueAgg = await db.sale.aggregate({
          where: revenueWhere,
          _count: true,
          _sum: { total: true },
        })
        const revenue = revenueAgg._sum.total || 0

        // ─── HISTORICAL COST: Sum buyPrice*qty from SaleItem for revenue sales ───
        // This uses the snapshot buyPrice stored on each SaleItem at sale time
        const costAgg = await db.saleItem.aggregate({
          where: {
            sale: revenueWhere,
          },
          _sum: {
            qty: true,
            sellPrice: true,
            buyPrice: true,
          },
        })
        // Calculate total cost using historical buyPrice per item
        // Since aggregate._sum.buyPrice gives us SUM(buyPrice), not SUM(buyPrice * qty),
        // we need to fetch items and calculate manually, OR use a different approach.
        // Best approach: fetch all revenue sale items and calculate in JS
        const revenueSaleItems = await db.saleItem.findMany({
          where: {
            sale: revenueWhere,
          },
          select: {
            variantId: true,
            productId: true,
            qty: true,
            sellPrice: true,
            buyPrice: true,
            variant: {
              select: { id: true, name: true, sku: true },
            },
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        })

        // Calculate total cost using historical buyPrice from SaleItem
        let totalCost = 0
        const productRevenueMap: Record<string, { name: string; sku: string; qty: number; revenue: number; cost: number }> = {}
        for (const item of revenueSaleItems) {
          const key = item.variantId || item.productId || 'unknown'
          const label = item.variant?.name || item.product?.name || 'Unknown'
          const sku = item.variant?.sku || item.product?.sku || '-'

          // Use historical buyPrice from SaleItem (captured at sale time)
          const historicalBuyPrice = item.buyPrice
          const lineRevenue = item.qty * item.sellPrice
          const lineCost = item.qty * historicalBuyPrice

          totalCost += lineCost

          if (!productRevenueMap[key]) {
            productRevenueMap[key] = { name: label, sku, qty: 0, revenue: 0, cost: 0 }
          }
          productRevenueMap[key].qty += item.qty
          productRevenueMap[key].revenue += lineRevenue
          productRevenueMap[key].cost += lineCost
        }

        const estimatedProfit = revenue - totalCost

        const topProductsByRevenue = Object.values(productRevenueMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
        const topProductsByQty = Object.values(productRevenueMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10)

        // ─── Customer ranking (from aggregated revenue sales) ───
        const revenueSalesForCustomers = await db.sale.findMany({
          where: revenueWhere,
          select: {
            customerId: true,
            total: true,
            customer: { select: { id: true, name: true, code: true } },
          },
        })
        const customerMap: Record<string, { name: string; code: string; totalSpent: number; orderCount: number }> = {}
        for (const sale of revenueSalesForCustomers) {
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

        // ─── Grouped period data (paginated detail list) ───
        // Fetch active (non-DRAFT/CANCELLED) sales for period grouping with pagination
        const activeSales = await db.sale.findMany({
          where: activeWhere,
          include: {
            customer: { select: { id: true, name: true, code: true } },
          },
          orderBy: { date: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })

        const grouped = groupByPeriod(
          activeSales.map((s) => ({ date: s.date, total: s.total, transNo: s.transNo, id: s.id, status: s.status })),
          period
        )

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
            totalAllTransactions: totalAllCount,
            totalCost,
            estimatedProfit,
            topProductsByRevenue,
            topProductsByQty,
            topCustomers,
            // Pagination metadata
            pagination: {
              page,
              pageSize,
              totalRecords: totalTransactions,
              totalPages: Math.ceil(totalTransactions / pageSize),
            },
          },
        })
      }

      case 'purchases': {
        const period = searchParams.get('period') || 'daily'
        const resolved = resolveDateRange(searchParams.get('dateFrom'), searchParams.get('dateTo'))
        const dateFrom = resolved.dateFrom
        const dateTo = resolved.dateTo
        const supplierId = searchParams.get('supplierId') || ''
        const { page, pageSize } = parsePagination(searchParams)

        const where: Prisma.PurchaseWhereInput = { ...buildPurchaseDateFilter(dateFrom, dateTo) }

        // Filter by supplier
        if (supplierId) {
          where.supplierId = supplierId
        }

        // ─── AGGREGATION: Accurate totals from DB (no truncation) ───

        const totalAllCount = await db.purchase.count({ where })

        // Count & sum for non-DRAFT, non-CANCELLED purchases
        const activeWhere: Prisma.PurchaseWhereInput = {
          ...where,
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        }
        const activeAgg = await db.purchase.aggregate({
          where: activeWhere,
          _count: true,
          _sum: { total: true },
        })
        const grandTotal = activeAgg._sum.total || 0
        const totalTransactions = activeAgg._count

        // Count & sum for RECEIVED purchases only (actual cost)
        const receivedWhere: Prisma.PurchaseWhereInput = {
          ...where,
          status: 'RECEIVED',
        }
        const receivedAgg = await db.purchase.aggregate({
          where: receivedWhere,
          _count: true,
          _sum: { total: true },
        })
        const cost = receivedAgg._sum.total || 0

        // ─── Top purchased products (from RECEIVED purchase items) ───
        const receivedPurchaseItems = await db.purchaseItem.findMany({
          where: {
            purchase: receivedWhere,
          },
          select: {
            variantId: true,
            productId: true,
            qty: true,
            buyPrice: true,
            variant: {
              select: { id: true, name: true, sku: true },
            },
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        })

        const productCostMap: Record<string, { name: string; sku: string; qty: number; cost: number }> = {}
        for (const item of receivedPurchaseItems) {
          const key = item.variantId || item.productId || 'unknown'
          const label = item.variant?.name || item.product?.name || 'Unknown'
          const sku = item.variant?.sku || item.product?.sku || '-'
          if (!productCostMap[key]) {
            productCostMap[key] = { name: label, sku, qty: 0, cost: 0 }
          }
          productCostMap[key].qty += item.qty
          productCostMap[key].cost += item.qty * item.buyPrice
        }
        const topProductsByCost = Object.values(productCostMap)
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 10)
        const topProductsByQty = Object.values(productCostMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10)

        // ─── Supplier ranking (from active purchases) ───
        const activePurchasesForSuppliers = await db.purchase.findMany({
          where: activeWhere,
          select: {
            supplierId: true,
            total: true,
            supplier: { select: { id: true, name: true, code: true } },
          },
        })
        const supplierMap: Record<string, { name: string; code: string; totalSpent: number; orderCount: number }> = {}
        for (const purchase of activePurchasesForSuppliers) {
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

        // ─── Grouped period data (paginated) ───
        const activePurchases = await db.purchase.findMany({
          where: activeWhere,
          include: {
            supplier: { select: { id: true, name: true, code: true } },
          },
          orderBy: { date: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })

        const grouped = groupByPeriod(
          activePurchases.map((p) => ({ date: p.date, total: p.total, transNo: p.transNo, id: p.id, status: p.status })),
          period
        )

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
            totalAllTransactions: totalAllCount,
            topProductsByCost,
            topProductsByQty,
            topSuppliers,
            // Pagination metadata
            pagination: {
              page,
              pageSize,
              totalRecords: totalTransactions,
              totalPages: Math.ceil(totalTransactions / pageSize),
            },
          },
        })
      }

      case 'stock': {
        const categoryId = searchParams.get('categoryId') || ''
        const supplierId = searchParams.get('supplierId') || ''
        const productId = searchParams.get('productId') || ''
        const lowStockOnly = searchParams.get('lowStockOnly') === 'true'
        const { page, pageSize } = parsePagination(searchParams)

        const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true }
        const productWhere: Prisma.ProductWhereInput = { isActive: true }
        if (categoryId) productWhere.categoryId = categoryId
        if (supplierId) productWhere.supplierId = supplierId
        if (productId) productWhere.id = productId
        if (Object.keys(productWhere).length > 1) { // >1 because isActive is always set
          variantWhere.product = productWhere
        }

        // ─── AGGREGATION: Accurate totals from DB ───
        const totalVariants = await db.productVariant.count({ where: variantWhere })

        // Use aggregate for total inventory value (stock * buyPrice for ALL matching variants)
        // Prisma doesn't support computed columns in aggregate, so we use raw approach
        const allVariantsForValue = await db.productVariant.findMany({
          where: variantWhere,
          select: { stock: true, buyPrice: true, minStock: true },
        })
        const totalInventoryValue = allVariantsForValue.reduce((sum, v) => sum + v.stock * v.buyPrice, 0)
        const lowStockCount = allVariantsForValue.filter(v => v.stock <= v.minStock).length

        // Unique products count
        const uniqueProductIds = await db.productVariant.findMany({
          where: variantWhere,
          select: { productId: true },
          distinct: ['productId'],
        })
        const totalProducts = uniqueProductIds.length

        // ─── Detail list (paginated) ───
        const variants = await db.productVariant.findMany({
          where: variantWhere,
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
          skip: (page - 1) * pageSize,
          take: pageSize,
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

        const lowStockItems = allVariantsForValue
          .map((v, idx) => ({ ...v, index: idx }))
          .filter((v) => v.stock <= v.minStock)

        const filteredStockData = lowStockOnly ? stockData.filter((v) => v.isLowStock) : stockData

        return NextResponse.json({
          success: true,
          data: {
            variants: filteredStockData,
            lowStockItems: [],
            totalInventoryValue,
            totalProducts,
            totalVariants,
            lowStockCount,
            // Pagination metadata
            pagination: {
              page,
              pageSize,
              totalRecords: totalVariants,
              totalPages: Math.ceil(totalVariants / pageSize),
            },
          },
        })
      }

      case 'stock-mutations': {
        const resolved = resolveDateRange(searchParams.get('dateFrom'), searchParams.get('dateTo'))
        const dateFrom = resolved.dateFrom
        const dateTo = resolved.dateTo
        const { page, pageSize } = parsePagination(searchParams)

        const where: Prisma.StockMutationWhereInput = {}
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom)
        if (dateTo) {
          // Include the entire end date by setting time to end of day
          const endDate = new Date(dateTo)
          endDate.setHours(23, 59, 59, 999)
          where.createdAt.lte = endDate
        }

        // ─── AGGREGATION: Accurate counts by type from DB ───
        const totalMutations = await db.stockMutation.count({ where })

        const typeAggResults = await db.stockMutation.groupBy({
          by: ['type'],
          where,
          _count: true,
          _sum: { qty: true },
        })

        const byType: Record<string, { count: number; totalQty: number; mutations: any[] }> = {
          IN: { count: 0, totalQty: 0, mutations: [] },
          OUT: { count: 0, totalQty: 0, mutations: [] },
          ADJUSTMENT: { count: 0, totalQty: 0, mutations: [] },
          TRANSFER: { count: 0, totalQty: 0, mutations: [] },
        }

        for (const row of typeAggResults) {
          const t = row.type as string
          byType[t] = {
            count: row._count,
            totalQty: Math.abs(row._sum.qty || 0),
            mutations: [],
          }
        }

        // ─── Detail list (paginated) ───
        const mutations = await db.stockMutation.findMany({
          where,
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
          skip: (page - 1) * pageSize,
          take: pageSize,
        })

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
            totalMutations,
            // Pagination metadata
            pagination: {
              page,
              pageSize,
              totalRecords: totalMutations,
              totalPages: Math.ceil(totalMutations / pageSize),
            },
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
