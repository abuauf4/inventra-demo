import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { username },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      )
    }

    // Try bcrypt first, fallback to plain text for legacy data
    let isValid = false
    try {
      isValid = await bcrypt.compare(password, user.password)
    } catch {
      // Password might be plain text (legacy)
      isValid = user.password === password
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Akun Anda tidak aktif. Hubungi administrator.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
