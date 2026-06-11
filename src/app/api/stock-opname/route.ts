import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog } from '@/lib/stock'
import { generateCode } from '@/lib/autoCode'
import { sanitizeObject, sanitizeNumber } from '@/lib/sanitize'

// GET /api/stock-opname - List stock opnames (paginated)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const warehouseId = searchParams.get('warehouseId') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // D2: Filter out soft-deleted records by default
    where.deletedAt = null

    if (search) {
      (where as Record<string, any>).OR = [
        { transNo: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (status) where.status = status

    const [opnames, total] = await Promise.all([
      db.stockOpname.findMany({
        where,
        skip,
        take: limit,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              variant: {
                select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      db.stockOpname.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: opnames,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get stock opnames error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data stock opname' },
      { status: 500 }
    )
  }
}

// POST /api/stock-opname - Create stock opname
// C2: generateCode INSIDE tx so counter rolls back on failure (no gaps)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody, { allowHtmlFields: ['notes'] })
    const { warehouseId, date, notes, items } = body

    // Sanitize numeric fields in items
    if (Array.isArray(items)) {
      for (const item of items) {
        item.physicalStock = sanitizeNumber(item.physicalStock, 0)
      }
    }

    // Validation
    if (!warehouseId || !date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Gudang, tanggal, dan item opname wajib diisi' },
        { status: 400 }
      )
    }

    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validate items: each must have variantId and physicalStock
    for (const item of items) {
      if (!item.variantId || item.physicalStock === undefined || item.physicalStock < 0) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki variantId dan physicalStock (>= 0)' },
          { status: 400 }
        )
      }
    }

    // Pre-resolve variant data and warehouse stock snapshots BEFORE transaction
    // (validation reads don't need to be in the tx, only the writes do)
    const opnameItems: Array<{
      variantId: string
      systemStock: number
      physicalStock: number
      diff: number
    }> = []
    for (const item of items) {
      const variant = await db.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant) {
        return NextResponse.json(
          { success: false, message: `Variant ${item.variantId} tidak ditemukan` },
          { status: 404 }
        )
      }

      // Get warehouse-specific stock
      const ws = await db.warehouseStock.findUnique({
        where: {
          warehouseId_productVariantId: {
            warehouseId,
            productVariantId: item.variantId,
          },
        },
      })
      const systemStock = ws?.stock ?? 0
      const physicalStock = item.physicalStock
      const diff = physicalStock - systemStock

      opnameItems.push({
        variantId: item.variantId,
        systemStock,
        physicalStock,
        diff,
      })
    }

    // C2: Wrap generateCode + create inside $transaction so counter rolls back on failure
    const opname = await db.$transaction(async (tx) => {
      const transNo = await generateCode('OP', 'stockopname', 6, tx)

      const created = await tx.stockOpname.create({
        data: {
          transNo,
          warehouseId,
          date: new Date(date),
          notes: notes || null,
          items: {
            create: opnameItems,
          },
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              variant: {
                select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } },
              },
            },
          },
        },
      })

      return created
    })

    await createActivityLog({
      action: 'CREATE',
      entity: 'StockOpname',
      entityId: opname.id,
      entityCode: opname.transNo,
      details: `Stock opname ${opname.transNo} dibuat untuk gudang ${warehouse.name}. ${opnameItems.length} item.`,
      newData: JSON.stringify({ warehouseId, date, itemCount: opnameItems.length }),
    })

    return NextResponse.json({ success: true, data: opname }, { status: 201 })
  } catch (error) {
    console.error('Create stock opname error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat stock opname' },
      { status: 500 }
    )
  }
}
