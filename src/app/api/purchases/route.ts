import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchases - List purchases with supplier info and items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const supplierId = searchParams.get('supplierId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Prisma.PurchaseWhereInput = {}

    if (search) {
      where.transNo = { contains: search }
    }

    if (supplierId) {
      where.supplierId = supplierId
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

// POST /api/purchases - Create purchase with stock update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, date, notes, items } = body

    // Validation
    if (!supplierId || !date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Supplier, tanggal, dan item pembelian wajib diisi' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.qty || item.qty <= 0 || item.buyPrice === undefined || item.buyPrice < 0) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki productId, qty (> 0), dan buyPrice (>= 0)' },
          { status: 400 }
        )
      }
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

    // Create purchase with items
    const purchase = await db.purchase.create({
      data: {
        transNo,
        supplierId,
        date: purchaseDate,
        total,
        notes: notes || null,
        items: {
          create: items.map(
            (item: { productId: string; qty: number; buyPrice: number }) => ({
              productId: item.productId,
              qty: item.qty,
              buyPrice: item.buyPrice,
            })
          ),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    })

    // Update stock for each item and create stock mutations
    for (const item of items) {
      const { productId, qty } = item as { productId: string; qty: number }

      // Add qty to product stock
      await db.product.update({
        where: { id: productId },
        data: {
          stock: {
            increment: qty,
          },
        },
      })

      // Create stock mutation
      await db.stockMutation.create({
        data: {
          productId,
          type: 'IN',
          qty,
          note: `Pembelian ${transNo}`,
          referenceId: purchase.id,
        },
      })
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
