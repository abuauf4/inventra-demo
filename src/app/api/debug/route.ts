import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Check env vars (mask sensitive parts)
  const dbUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL

  results.env = {
    DATABASE_URL: dbUrl ? dbUrl.slice(0, 30) + '...' : 'NOT SET',
    DIRECT_URL: directUrl ? directUrl.slice(0, 30) + '...' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  }

  // 2. Try to import and instantiate Prisma
  try {
    const { db } = await import('@/lib/db')
    results.prismaImport = 'OK'

    // 3. Try a simple query
    try {
      const userCount = await db.user.count()
      results.dbConnection = 'OK'
      results.userCount = userCount

      // 4. Try to find a specific user
      const bagas = await db.user.findUnique({ where: { username: 'Bagas' } })
      results.bagasExists = !!bagas
      if (bagas) {
        results.bagasRole = bagas.role
        results.bagasIsActive = bagas.isActive
        results.bagasPasswordPrefix = bagas.password.slice(0, 10) + '...'
      }
    } catch (dbError: unknown) {
      results.dbConnection = 'FAILED'
      results.dbError = dbError instanceof Error ? dbError.message : String(dbError)
      results.dbErrorStack = dbError instanceof Error ? dbError.stack : null
    }
  } catch (importError: unknown) {
    results.prismaImport = 'FAILED'
    results.importError = importError instanceof Error ? importError.message : String(importError)
  }

  // 5. Check Prisma client standalone
  try {
    const { PrismaClient } = await import('@prisma/client')
    results.prismaClientImport = 'OK'
    const testClient = new PrismaClient()
    results.prismaClientInstantiation = 'OK'
    await testClient.$disconnect()
  } catch (e: unknown) {
    results.prismaClientImport = 'FAILED'
    results.prismaClientError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(results, { status: 200 })
}
