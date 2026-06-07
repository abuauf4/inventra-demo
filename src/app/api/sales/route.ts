import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/sales - List sales with customer info and items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Prisma.SaleWhereInput = {}

    if (search) {
      where.transNo = { contains: search }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        customer: true,
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

    return NextResponse.json({ success: true, data: sales })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data penjualan' },
      { status: 500 }
    )
  }
}

// POST /api/sales - Create sale with stock reduction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, date, notes, items } = body

    // Validation
    if (!date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tanggal dan item penjualan wajib diisi' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.qty || item.qty <= 0 || item.sellPrice === undefined || item.sellPrice < 0) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki productId, qty (> 0), dan sellPrice (>= 0)' },
          { status: 400 }
        )
      }
    }

    // Check stock availability for all items first
    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { success: false, message: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 404 }
        )
      }

      if (item.qty > product.stock) {
        return NextResponse.json(
          { success: false, message: `Stok tidak cukup untuk produk ${product.name}. Stok tersedia: ${product.stock}, diminta: ${item.qty}` },
          { status: 400 }
        )
      }
    }

    // Generate transNo: SL-YYYYMMDD-XXXX
    const saleDate = new Date(date)
    const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `SL-${dateStr}-`

    // Count existing sales for the day
    const todayStart = new Date(saleDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(saleDate)
    todayEnd.setHours(23, 59, 59, 999)

    const existingCount = await db.sale.count({
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
      (sum: number, item: { qty: number; sellPrice: number }) => sum + item.qty * item.sellPrice,
      0
    )

    // Create sale with items
    const sale = await db.sale.create({
      data: {
        transNo,
        customerId: customerId || null,
        date: saleDate,
        total,
        notes: notes || null,
        items: {
          create: items.map(
            (item: { productId: string; qty: number; sellPrice: number }) => ({
              productId: item.productId,
              qty: item.qty,
              sellPrice: item.sellPrice,
            })
          ),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    })

    // Reduce stock for each item and create stock mutations
    for (const item of items) {
      const { productId, qty } = item as { productId: string; qty: number }

      // Subtract qty from product stock
      await db.product.update({
        where: { id: productId },
        data: {
          stock: {
            decrement: qty,
          },
        },
      })

      // Create stock mutation
      await db.stockMutation.create({
        data: {
          productId,
          type: 'OUT',
          qty,
          note: `Penjualan ${transNo}`,
          referenceId: sale.id,
        },
      })
    }

    return NextResponse.json({ success: true, data: sale }, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat penjualan' },
      { status: 500 }
    )
  }
}
