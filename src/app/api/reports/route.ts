import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// Helper: get period key from date based on period type
function getPeriodKey(date: Date, period: string): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  switch (period) {
    case 'daily':
      return `${y}-${m}-${d}`
    case 'weekly': {
      // Get ISO week number
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
  transactions: { date: Date | string; total: number; transNo: string; id: string }[]
}

// Helper: group transactions by period
function groupByPeriod(
  transactions: { date: Date | string; total: number; transNo: string; id: string }[],
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

  // Sort by period descending
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
        const dateFrom = searchParams.get('dateFrom') || ''
        const dateTo = searchParams.get('dateTo') || ''

        const where = buildSaleDateFilter(dateFrom, dateTo)

        const sales = await db.sale.findMany({
          where,
          take: 200,
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

        const grouped = groupByPeriod(
          sales.map((s) => ({ date: s.date, total: s.total, transNo: s.transNo, id: s.id })),
          period
        )
        const grandTotal = sales.reduce((sum, s) => sum + s.total, 0)

        return NextResponse.json({
          success: true,
          data: {
            period,
            grouped,
            grandTotal,
            totalTransactions: sales.length,
          },
        })
      }

      case 'purchases': {
        const period = searchParams.get('period') || 'daily'
        const dateFrom = searchParams.get('dateFrom') || ''
        const dateTo = searchParams.get('dateTo') || ''

        const where = buildPurchaseDateFilter(dateFrom, dateTo)

        const purchases = await db.purchase.findMany({
          where,
          take: 200,
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

        const grouped = groupByPeriod(
          purchases.map((p) => ({ date: p.date, total: p.total, transNo: p.transNo, id: p.id })),
          period
        )
        const grandTotal = purchases.reduce((sum, p) => sum + p.total, 0)

        return NextResponse.json({
          success: true,
          data: {
            period,
            grouped,
            grandTotal,
            totalTransactions: purchases.length,
          },
        })
      }

      case 'stock': {
        // Use variant-level stock data
        const variants = await db.productVariant.findMany({
          where: { isActive: true },
          take: 200,
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
        const totalInventoryValue = stockData.reduce((sum, v) => sum + v.stockValue, 0)
        const totalVariants = stockData.length

        // Also get unique product count
        const uniqueProductIds = new Set(variants.map((v) => v.productId))
        const totalProducts = uniqueProductIds.size

        return NextResponse.json({
          success: true,
          data: {
            variants: stockData,
            lowStockItems,
            totalInventoryValue,
            totalProducts,
            totalVariants,
            lowStockCount: lowStockItems.length,
          },
        })
      }

      default:
        return NextResponse.json(
          { success: false, message: 'Tipe laporan tidak valid. Gunakan: sales, purchases, atau stock' },
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
