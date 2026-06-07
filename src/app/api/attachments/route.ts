import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/attachments - List attachments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entity = searchParams.get('entity') || ''
    const entityId = searchParams.get('entityId') || ''

    if (!entity || !entityId) {
      return NextResponse.json(
        { success: false, message: 'entity dan entityId wajib diisi' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: Prisma.AttachmentWhereInput = {
      entity,
      entityId,
    }

    const attachments = await db.attachment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: attachments })
  } catch (error) {
    console.error('Get attachments error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data lampiran' },
      { status: 500 }
    )
  }
}

// POST /api/attachments - Create attachment record (metadata only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entity, entityId, fileName, filePath, fileType, fileSize, uploadedBy } = body

    // Validation
    if (!entity || !entityId || !fileName || !filePath || !fileType) {
      return NextResponse.json(
        { success: false, message: 'entity, entityId, fileName, filePath, dan fileType wajib diisi' },
        { status: 400 }
      )
    }

    const attachment = await db.attachment.create({
      data: {
        entity,
        entityId,
        fileName,
        filePath,
        fileType,
        fileSize: fileSize ?? 0,
        uploadedBy: uploadedBy || null,
      },
    })

    return NextResponse.json({ success: true, data: attachment }, { status: 201 })
  } catch (error) {
    console.error('Create attachment error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat lampiran' },
      { status: 500 }
    )
  }
}
