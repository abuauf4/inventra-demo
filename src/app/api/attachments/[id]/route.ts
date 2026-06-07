import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/attachments/[id] - Delete attachment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if attachment exists
    const existingAttachment = await db.attachment.findUnique({
      where: { id },
    })

    if (!existingAttachment) {
      return NextResponse.json(
        { success: false, message: 'Lampiran tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.attachment.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Lampiran berhasil dihapus',
    })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus lampiran' },
      { status: 500 }
    )
  }
}
