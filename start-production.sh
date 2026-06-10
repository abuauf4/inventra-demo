#!/bin/bash
# Inventra production startup script
# Defense against /start.sh overwriting .env with SQLite URL on every container boot.
#
# Strategy (3 layers):
#   1. Restore .env from .env.inventra if SQLite detected
#   2. Export env vars from .env.inventra so system env is overridden
#   3. forceLoadEnv() in db.ts as runtime safety net
set -e

cd /home/z/my-project

# Layer 1: Restore .env from .env.inventra if DATABASE_URL points to SQLite
if grep -q "^DATABASE_URL=file:" .env 2>/dev/null; then
  echo "[start-production] Detected SQLite DATABASE_URL in .env, restoring PostgreSQL URL from .env.inventra..."
  cp .env.inventra .env
fi

# Layer 2: Export env vars from .env.inventra so they override any stale system env
if [ -f .env.inventra ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.inventra
  set +a
else
  echo "[start-production] WARNING: .env.inventra not found! Falling back to hardcoded values."
  export DATABASE_URL="postgresql://postgres.zbxjqffmjaedneujlkfr:Guedoan9%2A123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
  export DIRECT_URL="postgresql://postgres.zbxjqffmjaedneujlkfr:Guedoan9%2A123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
fi

export NODE_ENV=production

# Verify DATABASE_URL is PostgreSQL before starting
URL_PREFIX="${DATABASE_URL:0:12}"
echo "[start-production] Starting Inventra..."
echo "[start-production] DATABASE_URL prefix: ${URL_PREFIX}..."

if [[ "${DATABASE_URL}" == file:* ]]; then
  echo "[start-production] FATAL: DATABASE_URL still points to SQLite after all fixes!"
  echo "[start-production] This means .env.inventra is missing or corrupt."
  exit 1
fi

# Layer 3: forceLoadEnv() in db.ts will also force-override at runtime

exec node .next/standalone/server.js
