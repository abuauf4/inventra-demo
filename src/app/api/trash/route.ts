import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createActivityLog } from '@/lib/stock'
import { sanitizeObject } from '@/lib/sanitize'

// Entity types that support soft delete
const SOFT_DELETE_ENTITIES = ['Sale', 'Purchase', 'Product', 'Supplier', 'Customer', 'StockOpname'] as const
type SoftDeleteEntity = typeof SOFT_DELETE_ENTITIES[number]

// Map entity type to its Prisma model key and display name
const ENTITY_CONFIG: Record<SoftDeleteEntity, {
  modelKey: string
  displayName: string
  include: Record<string, unknown>
}> = {
  Sale: {
    modelKey: 'sale',
    displayName: 'Penjualan',
    include: {
      customer: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          variant: { select: { id: true, name: true, sku: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  },
  Purchase: {
    modelKey: 'purchase',
    displayName: 'Pembelian',
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          variant: { select: { id: true, name: true, sku: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  },
  Product: {
    modelKey: 'product',
    displayName: 'Produk',
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true, code: true } },
      variants: { select: { id: true, name: true, sku: true } },
    },
  },
  Supplier: {
    modelKey: 'supplier',
    displayName: 'Supplier',
    include: {
      _count: { select: { purchases: true, products: true } },
    },
  },
  Customer: {
    modelKey: 'customer',
    displayName: 'Pelanggan',
    include: {
      _count: { select: { sales: true } },
    },
  },
  StockOpname: {
    modelKey: 'stockOpname',
    displayName: 'Stock Opname',
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
  },
}

// GET /api/trash - List soft-deleted records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entity = searchParams.get('entity') || ''

    // If specific entity requested, return only that type
    const entities = entity
      ? [entity as SoftDeleteEntity]
      : SOFT_DELETE_ENTITIES

    const result: Record<string, unknown[]> = {}

    for (const ent of entities) {
      if (!SOFT_DELETE_ENTITIES.includes(ent)) continue

      const config = ENTITY_CONFIG[ent]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (db as any)[config.modelKey]
      if (!model) continue

      const records = await model.findMany({
        where: { deletedAt: { not: null } },
        include: config.include,
        orderBy: { deletedAt: 'desc' },
      })

      result[ent] = records
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Get trash error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data sampah' },
      { status: 500 }
    )
  }
}

// POST /api/trash - Restore a soft-deleted record
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody)
    const { entity, id } = body

    if (!entity || !id) {
      return NextResponse.json(
        { success: false, message: 'Entity dan ID wajib diisi' },
        { status: 400 }
      )
    }

    if (!SOFT_DELETE_ENTITIES.includes(entity)) {
      return NextResponse.json(
        { success: false, message: `Entity "${entity}" tidak mendukung restore` },
        { status: 400 }
      )
    }

    const config = ENTITY_CONFIG[entity]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (db as any)[config.modelKey]

    // Find the record
    const record = await model.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json(
        { success: false, message: `${config.displayName} tidak ditemukan` },
        { status: 404 }
      )
    }

    if (!record.deletedAt) {
      return NextResponse.json(
        { success: false, message: `${config.displayName} tidak dalam kondisi terhapus` },
        { status: 400 }
      )
    }

    // Restore by clearing deletedAt
    const restored = await model.update({
      where: { id },
      data: { deletedAt: null },
      include: config.include,
    })

    // Determine entity code for activity log
    const entityCode = record.transNo || record.code || record.sku || id

    await createActivityLog({
      action: 'RESTORE',
      entity,
      entityId: id,
      entityCode,
      details: `${config.displayName} ${entityCode} dipulihkan dari sampah`,
      newData: JSON.stringify({ restoredAt: new Date().toISOString() }),
    })

    return NextResponse.json({ success: true, data: restored, message: `${config.displayName} berhasil dipulihkan` })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memulihkan data' },
      { status: 500 }
    )
  }
}

// DELETE /api/trash - Permanently delete a soft-deleted record (purge)
export async function DELETE(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody)
    const { entity, id } = body

    if (!entity || !id) {
      return NextResponse.json(
        { success: false, message: 'Entity dan ID wajib diisi' },
        { status: 400 }
      )
    }

    if (!SOFT_DELETE_ENTITIES.includes(entity)) {
      return NextResponse.json(
        { success: false, message: `Entity "${entity}" tidak mendukung purge` },
        { status: 400 }
      )
    }

    const config = ENTITY_CONFIG[entity]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (db as any)[config.modelKey]

    // Find the record
    const record = await model.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json(
        { success: false, message: `${config.displayName} tidak ditemukan` },
        { status: 404 }
      )
    }

    if (!record.deletedAt) {
      return NextResponse.json(
        { success: false, message: `${config.displayName} belum dihapus. Hapus terlebih dahulu sebelum purge.` },
        { status: 400 }
      )
    }

    // Determine entity code for activity log
    const entityCode = record.transNo || record.code || record.sku || id

    // Permanent delete
    await model.delete({ where: { id } })

    await createActivityLog({
      action: 'PURGE',
      entity,
      entityId: id,
      entityCode,
      details: `${config.displayName} ${entityCode} dihapus permanen (purge)`,
    })

    return NextResponse.json({ success: true, message: `${config.displayName} dihapus permanen` })
  } catch (error) {
    console.error('Purge error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus permanen' },
      { status: 500 }
    )
  }
}
