import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeObject } from '@/lib/sanitize'

// GET /api/suppliers/[id] - Get supplier detail with purchase history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        purchases: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Get supplier error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data supplier' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody, { allowHtmlFields: ['notes'] })
    const { name, pic, phone, email, address, notes, version } = body

    // Check if supplier exists
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { success: false, message: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    // D4: Optimistic locking — check version matches
    if (version !== undefined && version !== existingSupplier.version) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supplier telah diubah oleh pengguna lain. Silakan refresh dan coba lagi.',
          currentVersion: existingSupplier.version,
        },
        { status: 409 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (pic !== undefined) updateData.pic = pic || null
    if (phone !== undefined) updateData.phone = phone || null
    if (email !== undefined) updateData.email = email || null
    if (address !== undefined) updateData.address = address || null
    if (notes !== undefined) updateData.notes = notes || null

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 }, // D4: increment version on every update
      },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Update supplier error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui supplier' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Delete supplier (only if no purchases AND no products reference it)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if supplier exists
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchases: true, products: true },
        },
      },
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { success: false, message: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if supplier has purchases
    if (existingSupplier._count.purchases > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Supplier tidak dapat dihapus karena masih memiliki ${existingSupplier._count.purchases} transaksi pembelian`,
        },
        { status: 409 }
      )
    }

    // Check if supplier has products
    if (existingSupplier._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Supplier tidak dapat dihapus karena masih terhubung dengan ${existingSupplier._count.products} produk`,
        },
        { status: 409 }
      )
    }

    // D2: Soft delete — set deletedAt instead of hard delete
    await db.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Supplier berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete supplier error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus supplier' },
      { status: 500 }
    )
  }
}
