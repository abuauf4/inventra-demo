import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/warehouses - List warehouses with total stock count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: Prisma.WarehouseWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const warehouses = await db.warehouse.findMany({
      where,
      include: {
        _count: {
          select: {
            stocks: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ success: true, data: warehouses })
  } catch (error) {
    console.error('Get warehouses error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data gudang' },
      { status: 500 }
    )
  }
}

// POST /api/warehouses - Create warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, address, isActive } = body

    // Validation
    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: 'Nama dan kode gudang wajib diisi' },
        { status: 400 }
      )
    }

    // Check code uniqueness
    const existingWarehouse = await db.warehouse.findUnique({
      where: { code },
    })

    if (existingWarehouse) {
      return NextResponse.json(
        { success: false, message: 'Kode gudang sudah digunakan' },
        { status: 409 }
      )
    }

    const warehouse = await db.warehouse.create({
      data: {
        name,
        code,
        address: address || null,
        isActive: isActive ?? true,
      },
      include: {
        _count: {
          select: {
            stocks: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: warehouse }, { status: 201 })
  } catch (error) {
    console.error('Create warehouse error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat gudang' },
      { status: 500 }
    )
  }
}
