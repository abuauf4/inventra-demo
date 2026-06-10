import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Force-load .env values, overriding any stale system env vars.
// This fixes cases where DATABASE_URL is set to an old SQLite path
// in the shell environment, overriding the correct PostgreSQL URL in .env
function forceLoadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (match) {
          const key = match[1]
          const value = match[2].trim()
          // Only override if .env has a value (skip empty)
          if (value) {
            process.env[key] = value
          }
        }
      }
    }
  } catch {
    // Silently fail — .env loading shouldn't crash the app
  }
}

forceLoadEnv()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
