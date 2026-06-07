import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog } from '@/lib/stock'

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

// GET /api/sales - List sales with customer info and items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const status = searchParams.get('status') || ''

    const where: Prisma.SaleWhereInput = {}

    if (search) {
      where.transNo = { contains: search }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
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

    return NextResponse.json({ success: true, data: sales })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data penjualan' },
      { status: 500 }
    )
  }
}

// POST /api/sales - Create sale with status handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, date, notes, status, items } = body

    // Validation
    if (!date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tanggal dan item penjualan wajib diisi' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if ((!item.variantId && !item.productId) || !item.qty || item.qty <= 0 || item.sellPrice === undefined || item.sellPrice < 0) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki variantId atau productId, qty (> 0), dan sellPrice (>= 0)' },
          { status: 400 }
        )
      }
    }

    const saleStatus = status || 'DRAFT'
    const validStatuses = ['DRAFT', 'PAID', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(saleStatus)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Gunakan: DRAFT, PAID, COMPLETED, CANCELLED' },
        { status: 400 }
      )
    }

    // Resolve variants for items and check stock if status is COMPLETED
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
        sellPrice: item.sellPrice,
        variantStock: variant.stock,
        variantName: variant.name,
      })
    }

    // Check stock availability if status is COMPLETED
    if (saleStatus === 'COMPLETED') {
      for (const item of resolvedItems) {
        if (item.qty > item.variantStock) {
          return NextResponse.json(
            {
              success: false,
              message: `Stok tidak cukup untuk variant ${item.variantName}. Stok tersedia: ${item.variantStock}, diminta: ${item.qty}`,
            },
            { status: 400 }
          )
        }
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
        status: saleStatus,
        notes: notes || null,
        items: {
          create: resolvedItems.map((item) => ({
            variantId: item.variantId,
            productId: item.productId,
            qty: item.qty,
            sellPrice: item.sellPrice,
          })),
        },
      },
      include: {
        customer: true,
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

    // ONLY update stock and create OUT mutations if status is "COMPLETED"
    if (saleStatus === 'COMPLETED') {
      for (const item of resolvedItems) {
        // Update variant stock AND warehouse stock (decrement)
        await updateVariantStock(item.variantId, -item.qty)

        // Create stock mutation
        await db.stockMutation.create({
          data: {
            variantId: item.variantId,
            productId: item.productId,
            type: 'OUT',
            qty: item.qty,
            note: `Penjualan ${transNo}`,
            referenceId: sale.id,
          },
        })
      }
    }

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      details: `Penjualan ${transNo} dibuat dengan status ${saleStatus}. Total: Rp ${total.toLocaleString('id-ID')}. ${resolvedItems.length} item.`,
    })

    return NextResponse.json({ success: true, data: sale }, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat penjualan' },
      { status: 500 }
    )
  }
}
