import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog, StockInsufficientError } from '@/lib/stock'
import { sanitizeObject } from '@/lib/sanitize'

// GET /api/stock-opname/[id] - Get single stock opname
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const opname = await db.stockOpname.findUnique({
      where: { id },
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

    if (!opname) {
      return NextResponse.json(
        { success: false, message: 'Stock opname tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: opname })
  } catch (error) {
    console.error('Get stock opname error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data stock opname' },
      { status: 500 }
    )
  }
}

// PUT /api/stock-opname/[id] - Confirm/cancel stock opname
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody, { allowHtmlFields: ['notes'] })
    const { status } = body

    if (!status || !['CONFIRMED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Gunakan: CONFIRMED, CANCELLED' },
        { status: 400 }
      )
    }

    const opname = await db.stockOpname.findUnique({
      where: { id },
      include: { items: true, warehouse: { select: { name: true } } },
    })

    if (!opname) {
      return NextResponse.json(
        { success: false, message: 'Stock opname tidak ditemukan' },
        { status: 404 }
      )
    }

    // D2: Cannot modify soft-deleted records
    if (opname.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Stock opname yang sudah dihapus tidak dapat diubah' },
        { status: 400 }
      )
    }

    if (opname.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: `Stock opname dengan status ${opname.status} tidak dapat diubah` },
        { status: 400 }
      )
    }

    // When CONFIRMED: apply stock adjustments for items with diff != 0
    if (status === 'CONFIRMED') {
      const updatedOpname = await db.$transaction(async (tx) => {
        for (const item of opname.items) {
          if (item.diff === 0) continue // No adjustment needed

          // Update variant stock + warehouse stock atomically
          const stockResult = await updateVariantStock(
            item.variantId,
            item.diff, // positive diff = add stock, negative = deduct
            opname.warehouseId,
            tx
          )

          // Create stock mutation for the adjustment
          await tx.stockMutation.create({
            data: {
              variantId: item.variantId,
              warehouseId: opname.warehouseId,
              type: 'ADJUSTMENT',
              qty: item.diff,
              note: `Stock opname ${opname.transNo}: sistem=${item.systemStock}, fisik=${item.physicalStock}, selisih=${item.diff > 0 ? '+' : ''}${item.diff}`,
              referenceId: opname.id,
              previousStock: stockResult.previousStock,
              newStock: stockResult.newStock,
            },
          })
        }

        return await tx.stockOpname.update({
          where: { id },
          data: { status: 'CONFIRMED' },
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
      })

      await createActivityLog({
        action: 'STATUS_CHANGE',
        entity: 'StockOpname',
        entityId: opname.id,
        entityCode: opname.transNo,
        details: `Stock opname ${opname.transNo} dikonfirmasi. Stok disesuaikan.`,
        previousData: JSON.stringify({ status: 'DRAFT' }),
        newData: JSON.stringify({ status: 'CONFIRMED' }),
      })

      return NextResponse.json({ success: true, data: updatedOpname })
    }

    // CANCELLED: just update status, no stock changes
    const updatedOpname = await db.stockOpname.update({
      where: { id },
      data: { status: 'CANCELLED' },
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

    await createActivityLog({
      action: 'STATUS_CHANGE',
      entity: 'StockOpname',
      entityId: opname.id,
      entityCode: opname.transNo,
      details: `Stock opname ${opname.transNo} dibatalkan`,
      previousData: JSON.stringify({ status: 'DRAFT' }),
      newData: JSON.stringify({ status: 'CANCELLED' }),
    })

    return NextResponse.json({ success: true, data: updatedOpname })
  } catch (error) {
    if (error instanceof StockInsufficientError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    console.error('Update stock opname error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui stock opname' },
      { status: 500 }
    )
  }
}

// DELETE /api/stock-opname/[id] - Delete draft stock opname (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const opname = await db.stockOpname.findUnique({ where: { id } })

    if (!opname) {
      return NextResponse.json(
        { success: false, message: 'Stock opname tidak ditemukan' },
        { status: 404 }
      )
    }

    if (opname.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya stock opname dengan status DRAFT yang dapat dihapus' },
        { status: 400 }
      )
    }

    // D2: Soft delete — set deletedAt instead of hard delete
    await db.stockOpname.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await createActivityLog({
      action: 'DELETE',
      entity: 'StockOpname',
      entityId: id,
      entityCode: opname.transNo,
      details: `Menghapus Stock Opname ${opname.transNo} (DRAFT)`,
    })

    return NextResponse.json({
      success: true,
      message: 'Stock opname berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete stock opname error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus stock opname' },
      { status: 500 }
    )
  }
}
