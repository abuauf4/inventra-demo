import { db } from './db'

/**
 * Generate a sequential code for any entity type.
 * C2: Uses atomic Counter upsert to prevent race conditions.
 *
 * The Counter table stores the last used sequence number for each prefix.
 * `upsert` with `increment: 1` is atomic — two concurrent requests
 * will get different sequence numbers.
 */
export async function generateCode(prefix: string, model: string, padLength: number = 6): Promise<string> {
  const counterKey = prefix

  // Atomic increment — upsert ensures no race condition
  const counter = await db.counter.upsert({
    where: { id: counterKey },
    create: { id: counterKey, seq: 1 },
    update: { seq: { increment: 1 } },
  })

  const code = `${prefix}${String(counter.seq).padStart(padLength, '0')}`

  // Verify uniqueness (safety net for edge cases like manual DB edits)
  const exists = await checkExists(model, code)
  if (exists) {
    // Rare edge case — increment until we find a unique code
    let seq = counter.seq + 1
    let candidate = `${prefix}${String(seq).padStart(padLength, '0')}`
    while (await checkExists(model, candidate)) {
      seq++
      candidate = `${prefix}${String(seq).padStart(padLength, '0')}`
    }
    // Update counter to the new high-water mark
    await db.counter.update({
      where: { id: counterKey },
      data: { seq },
    })
    return candidate
  }

  return code
}

/**
 * Generate a transaction code with date-based prefix.
 * C2: Uses atomic Counter upsert to prevent duplicate transNo.
 *
 * Format: PREFIX-YYYYMMDD-XXXX (e.g., SO-20260610-0001)
 * Counter key is "SO-20260610" — each day gets its own sequence.
 */
export async function generateTransCode(prefix: string, date: Date, model: 'purchase' | 'sale'): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const counterKey = `${prefix}-${dateStr}`

  // Atomic increment
  const counter = await db.counter.upsert({
    where: { id: counterKey },
    create: { id: counterKey, seq: 1 },
    update: { seq: { increment: 1 } },
  })

  const seq = String(counter.seq).padStart(4, '0')
  const code = `${prefix}-${dateStr}-${seq}`

  // Verify uniqueness (safety net)
  const exists = await checkTransExists(model, code)
  if (exists) {
    let nextSeq = counter.seq + 1
    let candidate = `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`
    while (await checkTransExists(model, candidate)) {
      nextSeq++
      candidate = `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`
    }
    await db.counter.update({
      where: { id: counterKey },
      data: { seq: nextSeq },
    })
    return candidate
  }

  return code
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

async function checkTransExists(model: 'purchase' | 'sale', code: string): Promise<boolean> {
  if (model === 'purchase') {
    return !!(await db.purchase.findUnique({ where: { transNo: code } }))
  }
  return !!(await db.sale.findUnique({ where: { transNo: code } }))
}
