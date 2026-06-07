import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/categories - List categories with product count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          name: { contains: search, mode: 'insensitive' },
        }
      : {}

    const categories = await db.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data kategori' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama kategori wajib diisi' },
        { status: 400 }
      )
    }

    const category = await db.category.create({
      data: {
        name,
        description: description || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat kategori' },
      { status: 500 }
    )
  }
}
