import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// PUT /api/users/change-password - Change password for current user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentPassword, newPassword } = body

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'User ID, password saat ini, dan password baru wajib diisi' },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password baru minimal 4 karakter' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    // Verify current password
    let isValid = false
    try {
      isValid = await bcrypt.compare(currentPassword, user.password)
    } catch {
      // Fallback for legacy plaintext passwords
      isValid = user.password === currentPassword
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Password saat ini salah' },
        { status: 400 }
      )
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengubah password' },
      { status: 500 }
    )
  }
}
