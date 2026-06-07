import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/suppliers - List suppliers with purchase count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { pic: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}

    const suppliers = await db.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: suppliers })
  } catch (error) {
    console.error('Get suppliers error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data supplier' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, pic, phone, email, address, notes } = body

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama supplier wajib diisi' },
        { status: 400 }
      )
    }

    const supplier = await db.supplier.create({
      data: {
        name,
        pic: pic || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch (error) {
    console.error('Create supplier error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat supplier' },
      { status: 500 }
    )
  }
}
