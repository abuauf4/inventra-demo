import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inbox - Business events timeline
export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get inbox items
    const [items, total] = await Promise.all([
      db.inbox.findMany({
        where: { userId: null }, // Broadcast items
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.inbox.count({ where: { userId: null } }),
    ])

    // Also get recent activity logs as inbox items if inbox is empty
    let inboxItems: any[] = items

    if (items.length === 0) {
      // Fallback: generate inbox from activity logs
      const logs = await db.activityLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true },
          },
        },
      })

      inboxItems = logs.map((log) => ({
        id: log.id,
        type: mapActionToInboxType(log.action, log.entity),
        title: formatTitle(log),
        message: formatMessage(log),
        entity: log.entity,
        entityId: log.entityId,
        entityCode: log.entityCode,
        priority: mapPriority(log.action, log.entity),
        isRead: false,
        createdAt: log.createdAt.toISOString(),
        user: log.user,
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        items: inboxItems,
        total: total || inboxItems.length,
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Get inbox error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil inbox' },
      { status: 500 }
    )
  }
}

// POST /api/inbox - Create inbox item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, entity, entityId, entityCode, priority } = body

    const item = await db.inbox.create({
      data: {
        userId: userId || null,
        type: type || 'general',
        title: title || '',
        message: message || '',
        entity: entity || null,
        entityId: entityId || null,
        entityCode: entityCode || null,
        priority: priority || 'info',
      },
    })

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Create inbox error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat inbox item' },
      { status: 500 }
    )
  }
}

// PUT /api/inbox - Mark as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, markAllRead } = body

    if (markAllRead) {
      await db.inbox.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, message: 'Semua ditandai dibaca' })
    }

    if (id) {
      const item = await db.inbox.update({
        where: { id },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, data: item })
    }

    return NextResponse.json({ success: false, message: 'ID diperlukan' }, { status: 400 })
  } catch (error) {
    console.error('Update inbox error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate inbox' },
      { status: 500 }
    )
  }
}

function mapActionToInboxType(action: string, entity: string): string {
  if (entity === 'Purchase' && action === 'STATUS_CHANGE') return 'purchase_status'
  if (entity === 'Sale' && action === 'STATUS_CHANGE') return 'sale_status'
  if (entity === 'Customer' && action === 'CREATE') return 'customer_created'
  if (entity === 'Product') return 'stock_alert'
  return 'general'
}

function formatTitle(log: any): string {
  const entityNames: Record<string, string> = {
    Purchase: 'Pembelian',
    Sale: 'Penjualan',
    Product: 'Produk',
    Customer: 'Customer',
    Supplier: 'Supplier',
    User: 'User',
  }
  const actionNames: Record<string, string> = {
    CREATE: 'Dibuat',
    UPDATE: 'Diperbarui',
    DELETE: 'Dihapus',
    STATUS_CHANGE: 'Status Berubah',
    LOGIN: 'Login',
  }
  const entityName = entityNames[log.entity] || log.entity
  const actionName = actionNames[log.action] || log.action
  return `${entityName} ${actionName}`
}

function formatMessage(log: any): string {
  const user = log.user?.name || 'Seseorang'
  const actionMap: Record<string, string> = {
    CREATE: 'membuat',
    UPDATE: 'mengubah',
    DELETE: 'menghapus',
    STATUS_CHANGE: 'mengubah status',
    LOGIN: 'login ke',
  }
  const action = actionMap[log.action] || log.action.toLowerCase()
  let msg = `${user} ${action} ${log.entity}`
  if (log.entityCode) msg += ` ${log.entityCode}`
  // Add status change details
  if (log.previousData && log.newData) {
    try {
      const prev = JSON.parse(log.previousData)
      const next = JSON.parse(log.newData)
      if (prev.status && next.status) {
        msg += ` (${prev.status} → ${next.status})`
      }
    } catch {}
  }
  return msg
}

function mapPriority(action: string, entity: string): string {
  if (action === 'STATUS_CHANGE') return 'info'
  if (action === 'DELETE') return 'warning'
  if (entity === 'Product' && action === 'UPDATE') return 'urgent'
  return 'info'
}
