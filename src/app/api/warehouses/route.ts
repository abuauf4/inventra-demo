import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { generateCode } from '@/lib/autoCode'
import { sanitizeObject } from '@/lib/sanitize'

// GET /api/warehouses - List warehouses with total stock count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: Prisma.WarehouseWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
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

// POST /api/warehouses - Create warehouse, auto-generate code if not provided
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const body = sanitizeObject(rawBody)
    let { name, code, address, isActive } = body

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama gudang wajib diisi' },
        { status: 400 }
      )
    }

    // Auto-generate code if not provided
    if (!code) {
      code = await generateCode('WH', 'warehouse', 4)
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
