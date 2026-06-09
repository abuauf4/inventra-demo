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

// PUT /api/users/[id] - Update user by id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId: currentUserId, userRole: currentUserRole } = getCurrentUser(request)
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

    // === ROLE PROTECTION ===
    if (role !== undefined && role !== existingUser.role) {
      // User cannot change their own role
      if (id === currentUserId) {
        return NextResponse.json(
          { success: false, message: 'Anda tidak dapat mengubah role akun sendiri' },
          { status: 403 }
        )
      }

      // Non-owner cannot change any user role to owner
      if (role === 'owner' && currentUserRole !== 'owner') {
        return NextResponse.json(
          { success: false, message: 'Hanya owner yang dapat menetapkan role owner' },
          { status: 403 }
        )
      }

      // Non-owner cannot change roles at all
      if (currentUserRole !== 'owner') {
        return NextResponse.json(
          { success: false, message: 'Hanya owner yang dapat mengubah role pengguna' },
          { status: 403 }
        )
      }

      // Owner role must be protected: cannot remove the last owner
      if (existingUser.role === 'owner' && role !== 'owner') {
        const ownerCount = await db.user.count({ where: { role: 'owner', isActive: true } })
        if (ownerCount <= 1) {
          return NextResponse.json(
            { success: false, message: 'Tidak dapat mengubah role owner terakhir. Harus ada minimal satu owner.' },
            { status: 403 }
          )
        }
      }
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId: currentUserId, userRole: currentUserRole } = getCurrentUser(request)

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

    // Cannot delete yourself
    if (id === currentUserId) {
      return NextResponse.json(
        { success: false, message: 'Anda tidak dapat menghapus akun sendiri' },
        { status: 403 }
      )
    }

    // Non-owner cannot delete users
    if (currentUserRole !== 'owner') {
      return NextResponse.json(
        { success: false, message: 'Hanya owner yang dapat menghapus pengguna' },
        { status: 403 }
      )
    }

    // Cannot delete the last owner
    if (existingUser.role === 'owner') {
      const ownerCount = await db.user.count({ where: { role: 'owner', isActive: true } })
      if (ownerCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menghapus owner terakhir. Harus ada minimal satu owner.' },
          { status: 403 }
        )
      }
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
