import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/warehouses/[id] - Update warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, code, address, isActive } = body

    // Check if warehouse exists
    const existingWarehouse = await db.warehouse.findUnique({
      where: { id },
    })

    if (!existingWarehouse) {
      return NextResponse.json(
        { success: false, message: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // If code is changed, check uniqueness
    if (code && code !== existingWarehouse.code) {
      const codeTaken = await db.warehouse.findUnique({
        where: { code },
      })
      if (codeTaken) {
        return NextResponse.json(
          { success: false, message: 'Kode gudang sudah digunakan' },
          { status: 409 }
        )
      }
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (address !== undefined) updateData.address = address || null
    if (isActive !== undefined) updateData.isActive = isActive

    const warehouse = await db.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            stocks: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: warehouse })
  } catch (error) {
    console.error('Update warehouse error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui gudang' },
      { status: 500 }
    )
  }
}

// DELETE /api/warehouses/[id] - Delete warehouse
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if warehouse exists
    const existingWarehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stocks: true,
          },
        },
      },
    })

    if (!existingWarehouse) {
      return NextResponse.json(
        { success: false, message: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if warehouse has stock records
    if (existingWarehouse._count.stocks > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Gudang tidak dapat dihapus karena masih memiliki ${existingWarehouse._count.stocks} data stok`,
        },
        { status: 409 }
      )
    }

    await db.warehouse.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Gudang berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete warehouse error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus gudang' },
      { status: 500 }
    )
  }
}
