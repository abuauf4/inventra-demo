import { db } from './db'

/**
 * Generate a sequential code for any entity type.
 * Uses a simple count-based approach (count existing + 1).
 * This is NOT atomic but good enough for SQLite single-user.
 */
export async function generateCode(prefix: string, model: string, padLength: number = 6): Promise<string> {
  let count = 0

  switch (model) {
    case 'customer':
      count = await db.customer.count()
      break
    case 'supplier':
      count = await db.supplier.count()
      break
    case 'product':
      count = await db.product.count()
      break
    case 'warehouse':
      count = await db.warehouse.count()
      break
    default:
      count = 0
  }

  // Find next available number (in case of gaps from deletions)
  let seq = count + 1
  let code = `${prefix}${String(seq).padStart(padLength, '0')}`

  // Verify uniqueness and increment if needed
  let exists = true
  while (exists) {
    exists = await checkExists(model, code)
    if (exists) {
      seq++
      code = `${prefix}${String(seq).padStart(padLength, '0')}`
    }
  }

  return code
}

export async function generateTransCode(prefix: string, date: Date, model: 'purchase' | 'sale'): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const todayStart = new Date(date)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(date)
  todayEnd.setHours(23, 59, 59, 999)

  let count = 0
  if (model === 'purchase') {
    count = await db.purchase.count({ where: { date: { gte: todayStart, lte: todayEnd } } })
  } else {
    count = await db.sale.count({ where: { date: { gte: todayStart, lte: todayEnd } } })
  }

  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}-${dateStr}-${seq}`
}

async function checkExists(model: string, code: string): Promise<boolean> {
  switch (model) {
    case 'customer':
      return !!(await db.customer.findUnique({ where: { code } }))
    case 'supplier':
      return !!(await db.supplier.findUnique({ where: { code } }))
    case 'product':
      return !!(await db.product.findUnique({ where: { sku: code } }))
    case 'warehouse':
      return !!(await db.warehouse.findUnique({ where: { code } }))
    default:
      return false
  }
}
