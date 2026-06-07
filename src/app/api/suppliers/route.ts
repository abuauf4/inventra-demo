import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateCode } from '@/lib/autoCode'
import { createActivityLog } from '@/lib/stock'

// GET /api/suppliers - List suppliers with purchase count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { pic: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
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

// POST /api/suppliers - Create supplier with auto-generated code
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

    const code = await generateCode('SUP', 'supplier')

    const supplier = await db.supplier.create({
      data: {
        code,
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

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      entityCode: code,
      details: `Membuat Supplier ${code} ${name}`,
      newData: JSON.stringify({ name, pic, phone, email, address }),
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
