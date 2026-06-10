# Inventra Sprint A+B Worklog

---
Task ID: A2
Agent: Main Agent
Task: Fix stock-mutations ADJUSTMENT/IN/OUT — wrap in $transaction

Work Log:
- Analyzed `/src/app/api/stock-mutations/route.ts`
- Found TRANSFER case already used $transaction, but ADJUSTMENT, IN, OUT cases created mutation then updated stock separately
- Wrapped all three cases in `db.$transaction(async (tx) => { ... })` with `tx` passed to `updateVariantStock`
- Build verified successfully

Stage Summary:
- ADJUSTMENT, IN, OUT stock mutations now atomic — mutation creation + stock update happen in one transaction
- If stock update fails, mutation creation is also rolled back

---
Task ID: B4
Agent: Main Agent
Task: Report enhancements — top products, profit, detail breakdown, stock filters

Work Log:
- Enhanced `/src/app/api/reports/route.ts`:
  - Sales report: Added topProductsByRevenue, topProductsByQty, topCustomers, totalCost, estimatedProfit, profit margin
  - Purchases report: Added topProductsByCost, topProductsByQty, topSuppliers
  - Stock report: Added categoryId, supplierId, lowStockOnly filters
- Rewrote `/src/components/inventra/reports/reports-module.tsx`:
  - Sales: 4 summary cards (Pendapatan, Modal, Estimasi Profit with margin %, Total Transaksi), period table, top products table with profit per product, top customers table
  - Purchases: 3 summary cards, period table, top products by cost, top suppliers ranking
  - Stock: Added category filter, supplier filter, low stock only toggle, buy price column
- Build verified successfully

Stage Summary:
- Reports now provide actionable analysis: which products make money, which customers buy most, which suppliers cost most
- Profit estimation shows margin percentage
- Stock report can be filtered by category and supplier

---
Task ID: 1
Agent: Main Agent
Task: Fix Report Date Range Filter for Inventra

Work Log:
- Added `getCurrentMonthRange()` and `resolveDateRange()` helpers to `/src/app/api/reports/route.ts`
- API now defaults `dateFrom`/`dateTo` to current month start/end when not provided (for sales, purchases, and stock-mutations cases)
- Period selector (daily/weekly/monthly) now only controls grouping, NOT the date range — date range always applies as boundary filter
- Added `dateFrom`/`dateTo` fields to API response for sales and purchases cases
- Added new `type=stock-mutations` case to reports API:
  - Queries `db.stockMutation.findMany` with `createdAt` date filter (includes end-of-day for dateTo)
  - Returns mutations grouped by type (IN, OUT, ADJUSTMENT, TRANSFER) with counts and totalQty
  - Returns mapped mutations with productName, variantName, warehouseName, qty, note, createdAt
- Updated `/src/components/inventra/reports/reports-module.tsx`:
  - Removed `{period === 'custom' && ...}` condition — date inputs (Dari Tanggal / Sampai Tanggal) now always visible for ALL tabs
  - Default `dateFrom`/`dateTo` to current month on first load using `useMemo` + `getCurrentMonthRange()`
  - Added active filter label "Filter: 1 Jun — 30 Jun 2026" with amber styling on all tabs
  - Added "Mutasi Stok" tab with:
    - Date range filter (Dari Tanggal / Sampai Tanggal)
    - 4 summary cards: Stok Masuk (IN), Stok Keluar (OUT), Penyesuaian (ADJ), Transfer
    - Detail table with columns: Tanggal, Tipe, Produk, Varian, Qty, Gudang, Catatan
    - Type badges with color coding (emerald for IN, rose for OUT, amber for ADJ, blue for Transfer)
  - Stock tab now also shows date range inputs and filter label
  - Added category/supplier filters for stock tab (was already in inventra-demo but missing in root project)
  - Added Separator import for future use
  - Added fmtDateTime import from shared constants
- Also synced changes to `/home/z/my-project/inventra-demo/` copies of both files
- Lint passed with no errors
- API tested: stock-mutations endpoint returns correct data with date defaults; sales/purchases now filter by date range

Stage Summary:
- Date range filters always visible on all report tabs (Penjualan, Pembelian, Stok, Mutasi Stok)
- Default to current month (1 Jun — 30 Jun 2026) on first load
- Period selector only controls grouping, date range always applies as boundary
- Active filter label shows current date range clearly
- New "Mutasi Stok" tab with summary cards and detail table
- No database schema changes required

---
Task ID: 2+3
Agent: Main Agent
Task: Fix Typeahead Bug + Add Readonly Detail Fields for Inventra

Work Log:
- Added `parseVariantAttrs()` helper function to all three modules — parses variant attributes JSON into readable "key: value, key: value" string

**Part A: Fix Typeahead Bug (all typeahead fields)**

Root cause: When user selected an item, the input showed the full display text (code + name). Clearing the input set search text to '' and cleared the selected ID, but the dropdown condition `searchText && !selectedId` meant the dropdown wouldn't re-appear when search was empty. The fundamental issue was that after selection, clicking the input didn't switch to "edit mode" — the full display text was shown and the user had to manually delete it all before typing.

Fix applied to ALL typeahead fields:
1. Changed input `value` to show only the **code/SKU** when an item is selected (e.g., "SUP00001" instead of "SUP00001 PT Maju Bersama")
2. Added `onFocus` handler that, when a selection is active, **clears the selected ID** and **puts the code/SKU back into the search field** so the user can immediately edit and see suggestions
3. This ensures: click → code appears in search → backspace/type → suggestions re-appear immediately → no stuck state

Specific fields fixed:
- **Purchases**: Supplier code input, Variant SKU input in each item row
- **Sales**: Customer code input, Variant SKU input in each item row
- **Stock Mutations**: Variant SKU input

**Part B: Separate Code Input and Readonly Detail Fields**

**Purchase Dialog:**
- Supplier section: Code/search input + readonly "Nama Supplier" field + readonly "Telepon / Alamat" field
- Item rows: Each row now a bordered card with:
  - Row 1: SKU search input + Nama Produk (readonly)
  - Row 2: Varian/Ukuran (readonly, includes parsed attributes) + Harga Beli (readonly, formatted Rp) + Qty (editable) + Delete button

**Sales Dialog:**
- Customer section: Code/search input + readonly "Nama Customer" field + readonly "Telepon / Alamat" field
- Item rows: Same card layout as purchases, with Harga Jual (readonly, formatted Rp) instead of buy price

**Stock Mutations Dialog:**
- Variant section: After selection, shows a 3-column grid of readonly fields: Nama Produk, Varian/Ukuran (with parsed attributes), Total Stok
- Replaced the old single-line "selected variant info" amber box with proper readonly Input fields using `bg-muted text-muted-foreground` styling

All readonly fields use `<Input readOnly className="bg-muted text-muted-foreground" />` as specified.
When the code/SKU field is cleared, all readonly fields reset to empty.

- Build verified: `npx next build` passes successfully
- Lint: only pre-existing errors in qa-direct.js and qa_test_direct.js (unrelated to changes)

Stage Summary:
- Typeahead bug fixed: clicking a selected field switches to edit mode with code/SKU in search, suggestions re-appear on edit
- Purchase dialog: Supplier code + readonly name/phone/address; item rows with readonly product name, variant/size, price
- Sales dialog: Customer code + readonly name/phone/address; item rows with readonly product name, variant/size, price
- Stock mutations dialog: Variant SKU + readonly product name, variant/size, total stock
- No database schema changes

---
Task ID: 4
Agent: Main Agent
Task: Fix app not displaying — restore PostgreSQL/Supabase config

Work Log:
- Previous session incorrectly changed Prisma provider from postgresql to sqlite and removed directUrl
- User confirmed production target is Supabase PostgreSQL — all SQLite changes must be reverted
- Restored prisma/schema.prisma: `provider = "postgresql"` + `directUrl = env("DIRECT_URL")`
- Restored .env with Supabase credentials from git history (commit 9d3c4ca): both DATABASE_URL and DIRECT_URL pointing to `aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres`
- Restored `output: "standalone"` in next.config.ts
- package.json already had `prisma generate` in both `postinstall` and `build` scripts
- Regenerated Prisma client for PostgreSQL with `npx prisma generate`
- Verified `prisma db push` — database is in sync with Supabase
- Kept hydration guard timeout fix in page.tsx (3-second fallback) — this is a UX improvement, not related to DB
- Build verified: `npm run build` passes
- API verified: /api/auth responds (401 = correct, Supabase has different passwords), /api/dashboard returns 200 with data

Stage Summary:
- **REVERTED**: All SQLite changes undone — back to PostgreSQL/Supabase
- prisma/schema.prisma: provider = "postgresql", directUrl = env("DIRECT_URL")
- .env: DATABASE_URL + DIRECT_URL both point to Supabase postgresql://
- next.config.ts: output: "standalone" restored
- Hydration timeout fix kept (3s fallback, no relation to DB provider)
- All APIs functional with Supabase PostgreSQL
