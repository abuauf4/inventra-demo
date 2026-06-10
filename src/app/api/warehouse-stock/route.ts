import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/warehouse-stock - Get stock level for a variant in a specific warehouse
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const variantId = searchParams.get('variantId') || ''
    const warehouseId = searchParams.get('warehouseId') || ''

    if (!variantId) {
      return NextResponse.json(
        { success: false, message: 'variantId wajib diisi' },
        { status: 400 }
      )
    }

    if (warehouseId) {
      // Get stock for specific warehouse
      const stock = await db.warehouseStock.findUnique({
        where: {
          warehouseId_productVariantId: { warehouseId, productVariantId: variantId },
        },
      })
      return NextResponse.json({ success: true, data: { stock: stock?.stock || 0 } })
    }

    // Get stock across all warehouses
    const stocks = await db.warehouseStock.findMany({
      where: { productVariantId: variantId },
      include: { warehouse: { select: { id: true, name: true, code: true } } },
    })
    return NextResponse.json({ success: true, data: stocks })
  } catch (error) {
    console.error('Get warehouse stock error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data stok gudang' },
      { status: 500 }
    )
  }
}
