import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog, StockInsufficientError } from '@/lib/stock'
import { generateTransCode } from '@/lib/autoCode'

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

// GET /api/sales - Optimized: lightweight list mode for table view
// mode=list: no items included (just transNo, customer, date, status, total)
// mode=full (default): include items for detail view
// Detail view (when user clicks) fetches full data via /api/sales/[id]
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const mode = searchParams.get('mode') || 'full'

    const where: Prisma.SaleWhereInput = {}

    if (search) {
      where.transNo = { contains: search, mode: 'insensitive' }
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

    const isListMode = mode === 'list'

    const saleSelect: Prisma.SaleSelect = {
      id: true,
      transNo: true,
      date: true,
      total: true,
      status: true,
      notes: true,
      customerId: true,
      customer: {
        select: { id: true, name: true, code: true },
      },
    }

    // Only include items in full mode
    if (!isListMode) {
      (saleSelect as any).items = {
        select: {
          id: true,
          variantId: true,
          productId: true,
          qty: true,
          sellPrice: true,
          variant: {
            select: { id: true, name: true, sku: true },
          },
          product: {
            select: { id: true, name: true, sku: true },
          },
        },
      }
    }

    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        select: saleSelect,
        orderBy: {
          date: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sale.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: sales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data penjualan' },
      { status: 500 }
    )
  }
}

// POST /api/sales - Create sale with status handling, SO- prefix
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
    const resolvedItems: Array<{
      variantId: string
      productId: string
      qty: number
      sellPrice: number
      buyPrice: number
      variantStock: number
      variantName: string
    }> = []
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
        buyPrice: variant.buyPrice, // snapshot historical buy price at sale time
        variantStock: variant.stock,
        variantName: variant.name,
      })
    }

    // Check stock availability if status is COMPLETED or PAID
    // PAID sales will eventually become COMPLETED, so validate stock upfront
    if (saleStatus === 'COMPLETED' || saleStatus === 'PAID') {
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

    // Calculate total
    const total = items.reduce(
      (sum: number, item: { qty: number; sellPrice: number }) => sum + item.qty * item.sellPrice,
      0
    )

    // Create sale + stock updates + mutations in ONE transaction
    // C2: generateTransCode INSIDE tx so counter rolls back on failure (no gaps)
    const saleDate = new Date(date)
    const sale = await db.$transaction(async (tx) => {
      const transNo = await generateTransCode('SO', saleDate, 'sale', tx)

      const created = await tx.sale.create({
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
              buyPrice: item.buyPrice,
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
        // Determine default warehouse for this sale
        const defaultWarehouse = await tx.warehouse.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        })
        const warehouseId = defaultWarehouse?.id

        for (const item of resolvedItems) {
          // C1: Atomic stock update with negative guard
          // C4: Returns previousStock/newStock for audit trail
          const stockResult = await updateVariantStock(item.variantId, -item.qty, warehouseId, tx)

          // C3: Store warehouseId in mutation for correct reversal on cancel
          await tx.stockMutation.create({
            data: {
              variantId: item.variantId,
              productId: item.productId,
              warehouseId,  // ★ C3: Store for reversal
              type: 'OUT',
              qty: item.qty,
              note: `Penjualan ${transNo}`,
              referenceId: created.id,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
          })
        }
      }

      return created
    })

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      entityCode: sale.transNo,
      details: `Penjualan ${sale.transNo} dibuat dengan status ${saleStatus}. Total: Rp ${total.toLocaleString('id-ID')}. ${resolvedItems.length} item.`,
      newData: JSON.stringify({ customerId, date, total, status: saleStatus, itemCount: resolvedItems.length }),
    })

    return NextResponse.json({ success: true, data: sale }, { status: 201 })
  } catch (error) {
    // C1: Handle StockInsufficientError
    if (error instanceof StockInsufficientError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    console.error('Create sale error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat penjualan' },
      { status: 500 }
    )
  }
}
