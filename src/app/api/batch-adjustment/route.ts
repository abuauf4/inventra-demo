import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { updateVariantStock, createActivityLog } from '@/lib/stock'
import { sanitizeObject, sanitizeNumber } from '@/lib/sanitize'

// POST /api/batch-adjustment — Bulk stock/price adjustments
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody, { allowHtmlFields: ['notes'] })

    const { warehouseId, adjustments, notes } = body

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: 'Gudang wajib dipilih' },
        { status: 400 }
      )
    }

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Minimal 1 item penyesuaian' },
        { status: 400 }
      )
    }

    if (adjustments.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Maksimal 100 item per batch' },
        { status: 400 }
      )
    }

    // Validate warehouse
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    const results = []
    const errors = []

    // Process all adjustments in a single transaction
    await db.$transaction(async (tx) => {
      for (let i = 0; i < adjustments.length; i++) {
        const adj = adjustments[i]
        const variantId = adj.variantId
        const stockChange = sanitizeNumber(adj.stockChange, undefined) // can be negative
        const newBuyPrice = adj.newBuyPrice !== undefined ? sanitizeNumber(adj.newBuyPrice, 0) : undefined
        const newSellPrice = adj.newSellPrice !== undefined ? sanitizeNumber(adj.newSellPrice, 0) : undefined
        const reason = adj.reason || notes || 'Batch adjustment'

        if (!variantId) {
          errors.push({ index: i, message: 'Variant ID kosong' })
          continue
        }

        // Validate variant exists
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: { select: { id: true, name: true, sku: true } } },
        })

        if (!variant) {
          errors.push({ index: i, message: `Varian tidak ditemukan` })
          continue
        }

        // Apply stock adjustment if specified
        if (stockChange !== undefined && stockChange !== 0) {
          try {
            const stockResult = await updateVariantStock(variantId, stockChange, warehouseId, tx)

            // Create ADJUSTMENT mutation with audit trail
            await tx.stockMutation.create({
              data: {
                variantId,
                productId: variant.productId,
                warehouseId,
                type: 'ADJUSTMENT',
                qty: stockChange,
                note: reason,
                previousStock: stockResult.previousStock,
                newStock: stockResult.newStock,
              },
            })

            results.push({
              variantId,
              variantName: `${variant.product.name} — ${variant.name}`,
              stockChange,
              previousStock: stockResult.previousStock,
              newStock: stockResult.newStock,
              priceUpdated: false,
            })
          } catch (e: any) {
            errors.push({
              index: i,
              variantId,
              message: e.message || 'Gagal mengupdate stok',
            })
          }
        }

        // Apply price update if specified
        if (newBuyPrice !== undefined || newSellPrice !== undefined) {
          const updateData: any = {}
          if (newBuyPrice !== undefined && newBuyPrice >= 0) updateData.buyPrice = newBuyPrice
          if (newSellPrice !== undefined && newSellPrice >= 0) updateData.sellPrice = newSellPrice

          if (Object.keys(updateData).length > 0) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: updateData,
            })

            // Also update product base price if this is the primary variant
            const variantCount = await tx.productVariant.count({
              where: { productId: variant.productId },
            })
            if (variantCount === 1) {
              const prodUpdate: any = {}
              if (newBuyPrice !== undefined) prodUpdate.buyPrice = newBuyPrice
              if (newSellPrice !== undefined) prodUpdate.sellPrice = newSellPrice
              await tx.product.update({
                where: { id: variant.productId },
                data: prodUpdate,
              })
            }

            // Mark price as updated in results
            const existingResult = results.find(r => r.variantId === variantId)
            if (existingResult) {
              existingResult.priceUpdated = true
              existingResult.newBuyPrice = newBuyPrice
              existingResult.newSellPrice = newSellPrice
            } else {
              results.push({
                variantId,
                variantName: `${variant.product.name} — ${variant.name}`,
                stockChange: 0,
                previousStock: variant.stock,
                newStock: variant.stock,
                priceUpdated: true,
                newBuyPrice,
                newSellPrice,
              })
            }
          }
        }
      }
    })

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'BatchAdjustment',
      entityCode: 'BATCH',
      details: `Batch adjustment: ${results.length} berhasil, ${errors.length} gagal. Gudang: ${warehouse.name}`,
      newData: JSON.stringify({ warehouseId, successCount: results.length, errorCount: errors.length, notes }),
    })

    return NextResponse.json({
      success: true,
      data: { results, errors },
      summary: {
        total: adjustments.length,
        success: results.length,
        failed: errors.length,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Batch adjustment error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal melakukan batch adjustment' },
      { status: 500 }
    )
  }
}
