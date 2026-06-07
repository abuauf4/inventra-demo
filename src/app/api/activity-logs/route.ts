import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/activity-logs - List activity logs with enhanced fields
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entity = searchParams.get('entity') || ''
    const entityId = searchParams.get('entityId') || ''
    const userId = searchParams.get('userId') || ''
    const action = searchParams.get('action') || ''

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {}

    if (entity) {
      where.entity = entity
    }

    if (entityId) {
      where.entityId = entityId
    }

    if (userId) {
      where.userId = userId
    }

    if (action) {
      where.action = action
    }

    const logs = await db.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Get activity logs error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data log aktivitas' },
      { status: 500 }
    )
  }
}
