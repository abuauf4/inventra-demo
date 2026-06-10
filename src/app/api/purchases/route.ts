import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog } from '@/lib/stock'
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

// GET /api/purchases - Optimized: lightweight list mode for table view
// List view only needs: transNo, supplier name, date, status, total, item count
// Detail view (when user clicks) fetches full data via /api/purchases/[id]
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const supplierId = searchParams.get('supplierId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Prisma.PurchaseWhereInput = {}

    if (search) {
      where.transNo = { contains: search, mode: 'insensitive' }
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

    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where,
        select: {
          id: true,
          transNo: true,
          date: true,
          total: true,
          status: true,
          notes: true,
          supplierId: true,
          // Only fetch supplier name (not full object)
          supplier: {
            select: { id: true, name: true, code: true },
          },
          // Only fetch item summary for display
          items: {
            select: {
              id: true,
              variantId: true,
              productId: true,
              qty: true,
              buyPrice: true,
              // Lightweight variant/product names for display
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.purchase.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: purchases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pembelian' },
      { status: 500 }
    )
  }
}

// POST /api/purchases - Create purchase with status handling, PO- prefix
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

    // Generate transNo: PO-YYYYMMDD-XXXX
    const purchaseDate = new Date(date)
    const transNo = await generateTransCode('PO', purchaseDate, 'purchase')

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

    // Create purchase + stock updates + mutations in ONE transaction
    const purchase = await db.$transaction(async (tx) => {
      const created = await tx.purchase.create({
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
          // Update variant stock AND warehouse stock (inside same transaction)
          await updateVariantStock(item.variantId, item.qty, undefined, tx)

          // Create stock mutation (inside same transaction)
          await tx.stockMutation.create({
            data: {
              variantId: item.variantId,
              productId: item.productId,
              type: 'IN',
              qty: item.qty,
              note: `Pembelian ${transNo}`,
              referenceId: created.id,
            },
          })
        }
      }

      return created
    })

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase.id,
      entityCode: transNo,
      details: `Pembelian ${transNo} dibuat dengan status ${purchaseStatus}. Total: Rp ${total.toLocaleString('id-ID')}. ${resolvedItems.length} item.`,
      newData: JSON.stringify({ supplierId, date, total, status: purchaseStatus, itemCount: resolvedItems.length }),
    })

    return NextResponse.json({ success: true, data: purchase }, { status: 201 })
  } catch (error) {
    console.error('Create purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat pembelian' },
      { status: 500 }
    )
  }
}
