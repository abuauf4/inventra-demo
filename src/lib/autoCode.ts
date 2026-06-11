import { db } from './db'

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]

/**
 * Generate a sequential code for any entity type.
 * C2: Uses atomic Counter upsert to prevent race conditions.
 *
 * The Counter table stores the last used sequence number for each prefix.
 * `upsert` with `increment: 1` is atomic — two concurrent requests
 * will get different sequence numbers.
 *
 * @param tx - Optional Prisma transaction client. When provided, the counter
 *             increment runs inside the caller's transaction, ensuring no gap
 *             in sequence numbers if the transaction rolls back.
 */
export async function generateCode(
  prefix: string,
  model: string,
  padLength: number = 6,
  tx?: TransactionClient
): Promise<string> {
  const client = tx || db
  const counterKey = prefix

  // Atomic increment — upsert ensures no race condition
  const counter = await client.counter.upsert({
    where: { id: counterKey },
    create: { id: counterKey, seq: 1 },
    update: { seq: { increment: 1 } },
  })

  const code = `${prefix}${String(counter.seq).padStart(padLength, '0')}`

  // Verify uniqueness (safety net for edge cases like manual DB edits)
  const exists = await checkExists(model, code, client)
  if (exists) {
    // Rare edge case — increment until we find a unique code
    let seq = counter.seq + 1
    let candidate = `${prefix}${String(seq).padStart(padLength, '0')}`
    while (await checkExists(model, candidate, client)) {
      seq++
      candidate = `${prefix}${String(seq).padStart(padLength, '0')}`
    }
    // Update counter to the new high-water mark
    await client.counter.update({
      where: { id: counterKey },
      data: { seq },
    })
    return candidate
  }

  return code
}

/**
 * Generate a transaction code with date-based prefix.
 * C2: Uses atomic Counter upsert inside the caller's transaction to prevent
 *     duplicate transNo AND avoid sequence gaps on rollback.
 *
 * Format: PREFIX-YYYYMMDD-XXXX (e.g., SO-20260610-0001)
 * Counter key is "SO-20260610" — each day gets its own sequence.
 *
 * @param tx - Optional Prisma transaction client. When provided, the counter
 *             upsert runs inside the caller's transaction. This is the
 *             RECOMMENDED way to call this function — it ensures:
 *             1. No duplicate transNo under concurrent requests
 *             2. No gaps in sequence numbers if the transaction fails
 *             Without tx, counter increments are permanent even if the
 *             caller's transaction rolls back.
 */
export async function generateTransCode(
  prefix: string,
  date: Date,
  model: 'purchase' | 'sale',
  tx?: TransactionClient
): Promise<string> {
  const client = tx || db
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const counterKey = `${prefix}-${dateStr}`

  // Atomic increment inside the transaction
  const counter = await client.counter.upsert({
    where: { id: counterKey },
    create: { id: counterKey, seq: 1 },
    update: { seq: { increment: 1 } },
  })

  const seq = String(counter.seq).padStart(4, '0')
  const code = `${prefix}-${dateStr}-${seq}`

  // Verify uniqueness (safety net)
  const exists = await checkTransExists(model, code, client)
  if (exists) {
    let nextSeq = counter.seq + 1
    let candidate = `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`
    while (await checkTransExists(model, candidate, client)) {
      nextSeq++
      candidate = `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`
    }
    await client.counter.update({
      where: { id: counterKey },
      data: { seq: nextSeq },
    })
    return candidate
  }

  return code
}

async function checkExists(model: string, code: string, client: TransactionClient | typeof db = db): Promise<boolean> {
  switch (model) {
    case 'customer':
      return !!(await client.customer.findUnique({ where: { code } }))
    case 'supplier':
      return !!(await client.supplier.findUnique({ where: { code } }))
    case 'product':
      return !!(await client.product.findUnique({ where: { sku: code } }))
    case 'warehouse':
      return !!(await client.warehouse.findUnique({ where: { code } }))
    case 'stockopname':
      return !!(await client.stockOpname.findUnique({ where: { transNo: code } }))
    default:
      return false
  }
}

async function checkTransExists(model: 'purchase' | 'sale', code: string, client: TransactionClient | typeof db = db): Promise<boolean> {
  if (model === 'purchase') {
    return !!(await client.purchase.findUnique({ where: { transNo: code } }))
  }
  return !!(await client.sale.findUnique({ where: { transNo: code } }))
}
