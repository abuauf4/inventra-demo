import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const VALID_ROLES = ['owner', 'admin', 'staff', 'warehouse']

// Helper: get current user from request headers
function getCurrentUser(request: NextRequest) {
  const userId = request.headers.get('x-current-user-id')
  const userRole = request.headers.get('x-current-user-role')
  return { userId, userRole }
}

// GET /api/users - List all users (exclude password)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pengguna' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const { userId, userRole } = getCurrentUser(request)
    const body = await request.json()
    const { name, username, email, password, role } = body

    // Validation
    if (!name || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Nama, username, dan password wajib diisi' },
        { status: 400 }
      )
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Role harus salah satu dari: owner, admin, staff, warehouse' },
        { status: 400 }
      )
    }

    // Role protection: only owner can create users with owner role
    if (role === 'owner' && userRole !== 'owner') {
      return NextResponse.json(
        { success: false, message: 'Hanya owner yang dapat membuat user dengan role owner' },
        { status: 403 }
      )
    }

    // Check username uniqueness
    const existingUser = await db.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username sudah digunakan' },
        { status: 409 }
      )
    }

    // Check email uniqueness if provided
    if (email) {
      const emailTaken = await db.user.findUnique({
        where: { email },
      })
      if (emailTaken) {
        return NextResponse.json(
          { success: false, message: 'Email sudah digunakan' },
          { status: 409 }
        )
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        name,
        username,
        email: email || null,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat pengguna' },
      { status: 500 }
    )
  }
}
