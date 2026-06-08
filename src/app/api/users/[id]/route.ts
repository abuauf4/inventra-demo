import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const VALID_ROLES = ['owner', 'admin', 'staff', 'warehouse']

// PUT /api/users/[id] - Update user by id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, username, email, password, role, isActive } = body

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    // If username is changed, check uniqueness
    if (username && username !== existingUser.username) {
      const usernameTaken = await db.user.findUnique({
        where: { username },
      })
      if (usernameTaken) {
        return NextResponse.json(
          { success: false, message: 'Username sudah digunakan' },
          { status: 409 }
        )
      }
    }

    // If email is changed, check uniqueness
    if (email && email !== existingUser.email) {
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

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Role harus salah satu dari: owner, admin, staff, warehouse' },
        { status: 400 }
      )
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email || null
    if (password !== undefined) updateData.password = await bcrypt.hash(password, 10)
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    const user = await db.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui pengguna' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user by id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.user.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Pengguna berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus pengguna' },
      { status: 500 }
    )
  }
}
