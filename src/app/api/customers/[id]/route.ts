import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/customers/[id] - Get customer detail with sale history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: {
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

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pelanggan' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, address, notes, companyName, npwp, contactPerson, paymentTerms, customerType } = body

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone || null
    if (email !== undefined) updateData.email = email || null
    if (address !== undefined) updateData.address = address || null
    if (notes !== undefined) updateData.notes = notes || null
    if (companyName !== undefined) updateData.companyName = companyName || null
    if (npwp !== undefined) updateData.npwp = npwp || null
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson || null
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms || null
    if (customerType !== undefined) updateData.customerType = customerType || null

    const customer = await db.customer.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui pelanggan' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete customer (only if no sales reference it)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if customer has sales
    if (existingCustomer._count.sales > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Pelanggan tidak dapat dihapus karena masih memiliki ${existingCustomer._count.sales} transaksi penjualan`,
        },
        { status: 409 }
      )
    }

    await db.customer.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Pelanggan berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus pelanggan' },
      { status: 500 }
    )
  }
}
