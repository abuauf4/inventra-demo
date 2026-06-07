import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// Helper: resolve the target variant for an item (prefer variantId, fallback to first variant of product)
async function resolveVariant(variantId: string | null | undefined, productId: string | null | undefined) {
  if (variantId) {
    const variant = await db.productVariant.findUnique({ where: { id: variantId } })
    return variant
  }
  if (productId) {
    const variant = await db.productVariant.findFirst({ where: { productId, isActive: true } })
    return variant
  }
  return null
}

// GET /api/purchases - List purchases with supplier info and items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const supplierId = searchParams.get('supplierId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const status = searchParams.get('status') || ''

    const where: Prisma.PurchaseWhereInput = {}

    if (search) {
      where.transNo = { contains: search }
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const purchases = await db.purchase.findMany({
      where,
      include: {
        supplier: true,
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
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: purchases })
  } catch (error) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pembelian' },
      { status: 500 }
    )
  }
}

// POST /api/purchases - Create purchase with status handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, date, notes, status, items } = body

    // Validation
    if (!supplierId || !date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Supplier, tanggal, dan item pembelian wajib diisi' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if ((!item.variantId && !item.productId) || !item.qty || item.qty <= 0 || item.buyPrice === undefined || item.buyPrice < 0) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki variantId atau productId, qty (> 0), dan buyPrice (>= 0)' },
          { status: 400 }
        )
      }
    }

    const purchaseStatus = status || 'DRAFT'
    const validStatuses = ['DRAFT', 'APPROVED', 'RECEIVED', 'CANCELLED']
    if (!validStatuses.includes(purchaseStatus)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Gunakan: DRAFT, APPROVED, RECEIVED, CANCELLED' },
        { status: 400 }
      )
    }

    // Generate transNo: PB-YYYYMMDD-XXXX
    const purchaseDate = new Date(date)
    const dateStr = purchaseDate.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `PB-${dateStr}-`

    // Count existing purchases for the day
    const todayStart = new Date(purchaseDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(purchaseDate)
    todayEnd.setHours(23, 59, 59, 999)

    const existingCount = await db.purchase.count({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    const seqNumber = String(existingCount + 1).padStart(4, '0')
    const transNo = `${prefix}${seqNumber}`

    // Calculate total
    const total = items.reduce(
      (sum: number, item: { qty: number; buyPrice: number }) => sum + item.qty * item.buyPrice,
      0
    )

    // Resolve variants for items
    const resolvedItems = []
    for (const item of items) {
      const variant = await resolveVariant(item.variantId, item.productId)
      if (!variant) {
        return NextResponse.json(
          { success: false, message: `Variant tidak ditemukan untuk item (variantId: ${item.variantId}, productId: ${item.productId})` },
          { status: 404 }
        )
      }
      resolvedItems.push({
        variantId: variant.id,
        productId: variant.productId,
        qty: item.qty,
        buyPrice: item.buyPrice,
      })
    }

    // Create purchase with items
    const purchase = await db.purchase.create({
      data: {
        transNo,
        supplierId,
        date: purchaseDate,
        total,
        status: purchaseStatus,
        notes: notes || null,
        items: {
          create: resolvedItems.map((item) => ({
            variantId: item.variantId,
            productId: item.productId,
            qty: item.qty,
            buyPrice: item.buyPrice,
          })),
        },
      },
      include: {
        supplier: true,
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
    })

    // ONLY update stock and create IN mutations if status is "RECEIVED"
    if (purchaseStatus === 'RECEIVED') {
      for (const item of resolvedItems) {
        // Add qty to variant stock
        await db.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              increment: item.qty,
            },
          },
        })

        // Create stock mutation
        await db.stockMutation.create({
          data: {
            variantId: item.variantId,
            productId: item.productId,
            type: 'IN',
            qty: item.qty,
            note: `Pembelian ${transNo}`,
            referenceId: purchase.id,
          },
        })
      }
    }

    return NextResponse.json({ success: true, data: purchase }, { status: 201 })
  } catch (error) {
    console.error('Create purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat pembelian' },
      { status: 500 }
    )
  }
}
