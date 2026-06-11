import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog, StockInsufficientError } from '@/lib/stock'

// GET /api/stock-mutations - List stock mutations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId') || ''
    const type = searchParams.get('type') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Prisma.StockMutationWhereInput = {}

    if (productId) {
      where.productId = productId
    }

    if (type) {
      where.type = type
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    const mutations = await db.stockMutation.findMany({
      where,
      take: limit,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        variant: {
          select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } },
        },
        warehouse: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: mutations })
  } catch (error) {
    console.error('Get stock mutations error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data mutasi stok' },
      { status: 500 }
    )
  }
}

// POST /api/stock-mutations - Create stock mutation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, variantId, warehouseId, fromWarehouseId, toWarehouseId, qty, note } = body

    // Common validation
    if (!type || !['TRANSFER', 'ADJUSTMENT', 'IN', 'OUT'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Tipe mutasi tidak valid. Gunakan: TRANSFER, ADJUSTMENT, IN, OUT' },
        { status: 400 }
      )
    }

    if (!variantId) {
      return NextResponse.json(
        { success: false, message: 'Varian produk wajib dipilih' },
        { status: 400 }
      )
    }

    // Validate variant exists
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, name: true, sku: true } } },
    })

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Varian produk tidak ditemukan' },
        { status: 404 }
      )
    }

    if (qty === undefined || qty === null || qty === 0) {
      return NextResponse.json(
        { success: false, message: 'Qty tidak boleh 0' },
        { status: 400 }
      )
    }

    // Helper to get warehouse stock
    async function getWarehouseStock(whId: string, vId: string) {
      return db.warehouseStock.findUnique({
        where: {
          warehouseId_productVariantId: { warehouseId: whId, productVariantId: vId },
        },
      })
    }

    // Process by type
    switch (type) {
      case 'TRANSFER': {
        if (!fromWarehouseId || !toWarehouseId) {
          return NextResponse.json(
            { success: false, message: 'Gudang asal dan tujuan wajib dipilih' },
            { status: 400 }
          )
        }

        if (fromWarehouseId === toWarehouseId) {
          return NextResponse.json(
            { success: false, message: 'Gudang asal dan tujuan tidak boleh sama' },
            { status: 400 }
          )
        }

        if (qty <= 0) {
          return NextResponse.json(
            { success: false, message: 'Qty transfer harus lebih dari 0' },
            { status: 400 }
          )
        }

        const [fromWh, toWh] = await Promise.all([
          db.warehouse.findUnique({ where: { id: fromWarehouseId } }),
          db.warehouse.findUnique({ where: { id: toWarehouseId } }),
        ])

        if (!fromWh) {
          return NextResponse.json(
            { success: false, message: 'Gudang asal tidak ditemukan' },
            { status: 404 }
          )
        }
        if (!toWh) {
          return NextResponse.json(
            { success: false, message: 'Gudang tujuan tidak ditemukan' },
            { status: 404 }
          )
        }

        const fromStock = await getWarehouseStock(fromWarehouseId, variantId)
        if (!fromStock || fromStock.stock < qty) {
          return NextResponse.json(
            { success: false, message: `Stok di gudang asal tidak mencukupi (tersedia: ${fromStock?.stock || 0})` },
            { status: 400 }
          )
        }

        // C4: Create mutations + update stock in ONE transaction with audit trail
        const [outMutation, inMutation] = await db.$transaction(async (tx) => {
          // C1: atomic stock deduct from source warehouse
          const outStockResult = await updateVariantStock(variantId, -qty, fromWarehouseId, tx)

          const out = await tx.stockMutation.create({
            data: {
              variantId,
              productId: variant.productId,
              warehouseId: fromWarehouseId,
              type: 'OUT',
              qty,
              note: note || `Transfer ke ${toWh.name}`,
              previousStock: outStockResult.previousStock,  // C4: audit trail
              newStock: outStockResult.newStock,
            },
            include: {
              variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })

          // C1: atomic stock add to destination warehouse
          const inStockResult = await updateVariantStock(variantId, qty, toWarehouseId, tx)

          const inn = await tx.stockMutation.create({
            data: {
              variantId,
              productId: variant.productId,
              warehouseId: toWarehouseId,
              type: 'IN',
              qty,
              note: note || `Transfer dari ${fromWh.name}`,
              previousStock: inStockResult.previousStock,  // C4: audit trail
              newStock: inStockResult.newStock,
            },
            include: {
              variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })

          return [out, inn]
        })

        await createActivityLog({
          action: 'CREATE',
          entity: 'StockMutation',
          entityId: outMutation.id,
          entityCode: 'TRANSFER',
          details: `Transfer ${variant.product.name} — ${variant.name}: ${qty} dari ${fromWh.name} ke ${toWh.name}`,
          newData: JSON.stringify({ type: 'TRANSFER', variantId, fromWarehouseId, toWarehouseId, qty }),
        })

        return NextResponse.json({
          success: true,
          data: { outMutation, inMutation },
        }, { status: 201 })
      }

      case 'ADJUSTMENT': {
        if (!warehouseId) {
          return NextResponse.json(
            { success: false, message: 'Gudang wajib dipilih' },
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

        if (qty < 0) {
          const whStock = await getWarehouseStock(warehouseId, variantId)
          if (!whStock || whStock.stock < Math.abs(qty)) {
            return NextResponse.json(
              { success: false, message: `Stok di gudang tidak mencukupi untuk dikurangi (tersedia: ${whStock?.stock || 0}, dikurangi: ${Math.abs(qty)})` },
              { status: 400 }
            )
          }
        }

        // C4: Create mutation + update stock with audit trail
        const mutation = await db.$transaction(async (tx) => {
          // C1: atomic stock update
          const stockResult = await updateVariantStock(variantId, qty, warehouseId, tx)

          const created = await tx.stockMutation.create({
            data: {
              variantId,
              productId: variant.productId,
              warehouseId,
              type: 'ADJUSTMENT',
              qty,
              note: note || null,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
            include: {
              variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })

          return created
        })

        await createActivityLog({
          action: 'CREATE',
          entity: 'StockMutation',
          entityId: mutation.id,
          entityCode: 'ADJUSTMENT',
          details: `Penyesuaian ${variant.product.name} — ${variant.name}: ${qty > 0 ? '+' : ''}${qty} di ${warehouse.name}`,
          newData: JSON.stringify({ type: 'ADJUSTMENT', variantId, warehouseId, qty, previousStock: mutation.previousStock, newStock: mutation.newStock }),
        })

        return NextResponse.json({ success: true, data: mutation }, { status: 201 })
      }

      case 'IN': {
        if (!warehouseId) {
          return NextResponse.json(
            { success: false, message: 'Gudang wajib dipilih' },
            { status: 400 }
          )
        }

        if (qty <= 0) {
          return NextResponse.json(
            { success: false, message: 'Qty masuk harus lebih dari 0' },
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

        const mutation = await db.$transaction(async (tx) => {
          const stockResult = await updateVariantStock(variantId, qty, warehouseId, tx)

          const created = await tx.stockMutation.create({
            data: {
              variantId,
              productId: variant.productId,
              warehouseId,
              type: 'IN',
              qty,
              note: note || null,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
            include: {
              variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })

          return created
        })

        await createActivityLog({
          action: 'CREATE',
          entity: 'StockMutation',
          entityId: mutation.id,
          entityCode: 'IN',
          details: `Stok masuk ${variant.product.name} — ${variant.name}: +${qty} di ${warehouse.name}`,
          newData: JSON.stringify({ type: 'IN', variantId, warehouseId, qty }),
        })

        return NextResponse.json({ success: true, data: mutation }, { status: 201 })
      }

      case 'OUT': {
        if (!warehouseId) {
          return NextResponse.json(
            { success: false, message: 'Gudang wajib dipilih' },
            { status: 400 }
          )
        }

        if (qty <= 0) {
          return NextResponse.json(
            { success: false, message: 'Qty keluar harus lebih dari 0' },
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

        const whStock = await getWarehouseStock(warehouseId, variantId)
        if (!whStock || whStock.stock < qty) {
          return NextResponse.json(
            { success: false, message: `Stok di gudang tidak mencukupi (tersedia: ${whStock?.stock || 0})` },
            { status: 400 }
          )
        }

        const mutation = await db.$transaction(async (tx) => {
          // C1: atomic stock deduct with negative guard
          const stockResult = await updateVariantStock(variantId, -qty, warehouseId, tx)

          const created = await tx.stockMutation.create({
            data: {
              variantId,
              productId: variant.productId,
              warehouseId,
              type: 'OUT',
              qty,
              note: note || null,
              previousStock: stockResult.previousStock,  // C4: audit trail
              newStock: stockResult.newStock,
            },
            include: {
              variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })

          return created
        })

        await createActivityLog({
          action: 'CREATE',
          entity: 'StockMutation',
          entityId: mutation.id,
          entityCode: 'OUT',
          details: `Stok keluar ${variant.product.name} — ${variant.name}: -${qty} di ${warehouse.name}`,
          newData: JSON.stringify({ type: 'OUT', variantId, warehouseId, qty }),
        })

        return NextResponse.json({ success: true, data: mutation }, { status: 201 })
      }

      default:
        return NextResponse.json(
          { success: false, message: 'Tipe mutasi tidak valid' },
          { status: 400 }
        )
    }
  } catch (error) {
    // C1: Handle StockInsufficientError
    if (error instanceof StockInsufficientError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      )
    }

    console.error('Create stock mutation error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat mutasi stok' },
      { status: 500 }
    )
  }
}
