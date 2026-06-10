#!/bin/bash
export DATABASE_URL="postgresql://postgres.zbxjqffmjaedneujlkfr:Guedoan9%2A123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
export DIRECT_URL="postgresql://postgres.zbxjqffmjaedneujlkfr:Guedoan9%2A123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
export NODE_ENV=production
cd /home/z/my-project
exec node .next/standalone/server.js
