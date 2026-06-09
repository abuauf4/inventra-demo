import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateCode } from '@/lib/autoCode'
import { createActivityLog } from '@/lib/stock'

// GET /api/customers - List customers with sale count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '0')

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { companyName: { contains: search, mode: 'insensitive' as const } },
            { npwp: { contains: search, mode: 'insensitive' as const } },
            { contactPerson: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const customers = await db.customer.findMany({
      where,
      ...(limit > 0 && { take: limit }),
      include: {
        _count: {
          select: { sales: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: customers })
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pelanggan' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create customer with auto-generated code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, notes, companyName, npwp, contactPerson, paymentTerms, customerType } = body

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama pelanggan wajib diisi' },
        { status: 400 }
      )
    }

    const code = await generateCode('CUS', 'customer')

    const customer = await db.customer.create({
      data: {
        code,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        companyName: companyName || null,
        npwp: npwp || null,
        contactPerson: contactPerson || null,
        paymentTerms: paymentTerms || null,
        customerType: customerType || null,
      },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    // Activity log
    await createActivityLog({
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      entityCode: code,
      details: `Membuat Customer ${code} ${name}`,
      newData: JSON.stringify({ name, phone, email, address, companyName, npwp, contactPerson, paymentTerms, customerType }),
    })

    return NextResponse.json({ success: true, data: customer }, { status: 201 })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat pelanggan' },
      { status: 500 }
    )
  }
}
