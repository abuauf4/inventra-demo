#!/bin/bash
# Inventra production startup script
# Restores correct .env (PostgreSQL) if start.sh overwrote it with SQLite URL
set -e

cd /home/z/my-project

# Restore .env from .env.inventra if DATABASE_URL points to SQLite
if grep -q "^DATABASE_URL=file:" .env 2>/dev/null; then
  echo "[start-production] Detected SQLite DATABASE_URL in .env, restoring PostgreSQL URL..."
  cp .env.inventra .env
fi

# Also export env vars explicitly so system env doesn't override
export DATABASE_URL="postgresql://postgres.zbxjqffmjaedneujlkfr:Guedoan9%2A123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
export DIRECT_URL="postgresql://postgres.zbxjqffmjaedneujlkfr:Guedoan9%2A123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
export NODE_ENV=production

echo "[start-production] Starting Inventra..."
echo "[start-production] DATABASE_URL prefix: ${DATABASE_URL:0:12}..."

exec node .next/standalone/server.js
