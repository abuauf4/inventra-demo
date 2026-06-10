import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test database connectivity by counting records
    const [productCount, userCount] = await Promise.all([
      db.product.count(),
      db.user.count(),
    ])

    // Determine provider and URL prefix from the resolved env var
    const databaseUrl = process.env.DATABASE_URL || ''
    const databaseUrlPrefix = databaseUrl.substring(0, databaseUrl.indexOf(':')) || 'unknown'
    const provider = databaseUrlPrefix === 'postgresql' ? 'postgresql' : databaseUrlPrefix

    return NextResponse.json({
      status: 'ok',
      dbConnected: true,
      provider,
      databaseUrlPrefix,
      productCount,
      userCount,
    })
  } catch (error) {
    const databaseUrl = process.env.DATABASE_URL || ''
    const databaseUrlPrefix = databaseUrl.substring(0, databaseUrl.indexOf(':')) || 'unknown'
    const provider = databaseUrlPrefix === 'postgresql' ? 'postgresql' : databaseUrlPrefix

    return NextResponse.json({
      status: 'error',
      dbConnected: false,
      provider,
      databaseUrlPrefix,
      productCount: 0,
      userCount: 0,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }, { status: 503 })
  }
}
