# Inventra V2 — Workflow-First UX Restructure + Performance Fixes

## Work Log

### Date: 2026-03-04

### Summary
Implemented 7 tasks to restructure the Inventra ERP app with workflow-first UX patterns and performance optimizations. All changes pass ESLint.

---

### Task 1: use-query-hooks.ts — Added `enabled` and `mode` params

**File**: `/home/z/my-project/src/components/inventra/hooks/use-query-hooks.ts`

**Changes**:
- `useProducts`: Added `mode?: 'list' | 'full'` and `enabled?: boolean` params. Mode is included in queryKey. Enabled defaults to true (`params?.enabled !== false`).
- `useSales`: Added `mode?: 'list' | 'full'` and `enabled?: boolean` params. Mode included in queryKey.
- `usePurchases`: Same pattern as `useSales`.

**Rationale**: These params enable conditional fetching (e.g., only fetch sales when on the Drafts/History tab) and lighter API responses (e.g., `mode=list` omits items array).

---

### Task 2: API Routes — Added `mode=list` support

**Files**:
- `/home/z/my-project/src/app/api/products/route.ts`
- `/home/z/my-project/src/app/api/sales/route.ts`
- `/home/z/my-project/src/app/api/purchases/route.ts`

**Products API**:
- Added `mode` query parameter (`?mode=list` vs default full).
- When `mode=list`: variants array is NOT included in the select. Returns `categoryName`, `supplierName` flattened fields. Strips variants from response.
- When default/`mode=full`: includes variants (backward compatible for Sales/Purchases typeahead).

**Sales/Purchases API**:
- Added `mode` query parameter.
- When `mode=list`: items array is NOT included (only transNo, customer/supplier, date, status, total).
- When default: includes items as before (for detail view).

---

### Task 3: Reports Module — Filter-First, No Auto-Query

**File**: `/home/z/my-project/src/components/inventra/reports/reports-module.tsx`

**Changes**:
1. Added `requestedTabs: Set<string>` state to track which tabs have been explicitly requested.
2. Removed the auto-query `useEffect(() => { load() }, [load])` — no more auto-fetch on mount or tab switch.
3. When `load()` is called, marks the current tab as requested: `setRequestedTabs(prev => new Set(prev).add(tab))`.
4. Added `ReportEmptyState` component: shows SlidersHorizontal icon, "Pilih filter dan klik **Tampilkan Laporan**", and a primary "Tampilkan Laporan" button.
5. In each TabsContent, before the data display: if `!requestedTabs.has(tab) && !data`, show empty state.
6. Replaced Refresh buttons with `FilterButton` component: when tab not yet requested → "Tampilkan Laporan" button (primary); when requested → small Refresh icon button (outline).
7. Each tab tracks its own requested state independently.

---

### Task 4: Sales Module — Input/Drafts/History Tabs

**File**: `/home/z/my-project/src/components/inventra/sales/sales-module.tsx`

**Changes**:
1. Added `activeTab` state: `'input' | 'drafts' | 'history'`, default `'input'`.
2. **Input tab (default)**: Sale creation form rendered INLINE (not in Dialog). Includes customer typeahead, date, items with variant typeahead, total, status selection, save button. Only uses `useCustomers` and `useProducts` hooks (not `useSales`).
3. **Drafts tab**: Shows DRAFT sales only (`status: 'DRAFT'`). Uses `useSales({ status: 'DRAFT', limit: 20, mode: 'list', enabled: shouldFetchSales })`. Shows draft count badge on tab.
4. **History tab**: Full sales list with search, status filter, pagination. Uses `useSales({ search, status, page, limit, mode: 'list', enabled: shouldFetchSales })`.
5. `useSales` is conditionally enabled via `enabled: shouldFetchSales` — no auto-fetch on Input tab.
6. Detail dialog preserved for viewing sale details (from Drafts or History tabs).
7. Delete/Cancel confirm dialogs preserved.
8. `openSalesForm` from Zustand store: when true, switches to Input tab and focuses customer input.

---

### Task 5: Purchases Module — Input/Drafts/History Tabs

**File**: `/home/z/my-project/src/components/inventra/purchases/purchases-module.tsx`

**Changes**:
Same pattern as Sales Module:
1. Three tabs: Input (default), Drafts, History.
2. Input tab: inline purchase creation form.
3. Drafts tab: DRAFT purchases only with count badge.
4. History tab: full list with search/filter/pagination.
5. `usePurchases` with `enabled: shouldFetchPurchases` and `mode: 'list'`.
6. Detail, delete, cancel dialogs preserved.

---

### Task 6: Stock Mutations Module — Input/History Tabs

**File**: `/home/z/my-project/src/components/inventra/stock-mutations/stock-mutations-module.tsx`

**Changes**:
1. Two tabs: Input (default), History.
2. **Input tab**: The create mutation form (Transfer/Adjustment/In-Out sub-tabs) rendered inline (no Dialog). Sub-tabs are the existing Transfer/Penyesuaian/Masuk-Keluar tabs. Save button at the bottom.
3. **History tab**: Mutations list with type filter. Only loads mutations when this tab is active via `useEffect` that checks `activeMainTab === 'history'`.
4. Master data (products + warehouses) loaded on mount for Input tab typeahead.
5. After successful save, refreshes mutations list if previously loaded.

---

### Task 7: Dashboard Optimization — Removed OwnerHome Extra Report Fetch

**File**: `/home/z/my-project/src/components/inventra/workspace/workspace-home.tsx`

**Changes**:
1. Removed `reportData` state and the `useEffect` that fetched `/api/reports?type=sales&period=monthly`.
2. Removed `getCurrentMonthRange` helper function (no longer needed).
3. `omzet` now uses `data.totalSales` directly (already returned by dashboard API).
4. Removed `topProducts` and `topCustomers` variables that depended on report data.
5. "Produk Terlaris" and "Customer Teratas" sections replaced with placeholder cards showing "Lihat di Laporan Penjualan" with a link to Reports.
6. Removed unused imports (`useMemo`, `Truck`).

---

### Additional: Products Module — Updated to use `mode=list`

**File**: `/home/z/my-project/src/components/inventra/products/products-module.tsx`

**Change**: Updated `useProducts` call to include `mode: 'list'` for the main list view, which omits variant data from the API response.

---

### Build Verification
- ESLint: Passes with 0 errors, 0 warnings.
- Dev server: Running cleanly on port 3000.

---
Task ID: V2-Workflow-Restructure
Agent: Main Agent + Full-Stack Developer Subagent
Task: Implement workflow-first UX restructure + P3-P5 performance fixes

Work Log:
- Read and analyzed all module components (sales, purchases, stock-mutations, reports, workspace-home)
- Read API routes (dashboard, products, sales, purchases)
- Read hooks (use-query-hooks.ts) and store (store.ts)
- Planned workflow-first UX restructure based on user's spec
- Delegated implementation to full-stack-developer subagent with detailed specs
- Subagent implemented all 7 tasks:
  1. use-query-hooks.ts: Added enabled and mode params to useProducts, useSales, usePurchases
  2. API routes: Added mode=list to products, sales, purchases APIs
  3. Reports module: Removed auto-query, added "Tampilkan Laporan" button with per-tab requestedTabs tracking
  4. Sales module: Restructured into Input/Draft/Riwayat tabs, no auto-fetch on mount
  5. Purchases module: Same 3-tab pattern as Sales
  6. Stock Mutations module: Restructured into Input/Riwayat tabs
  7. Dashboard: Removed OwnerHome extra /api/reports fetch, replaced with "Lihat di Laporan" links
- Built project successfully with `npx next build`
- Ran performance trace with server running

Stage Summary:
- All 7 tasks implemented and build passes
- Performance improvements measured:
  - Products list mode: 11.6KB → 4.6KB payload (60% reduction)
  - Sales list mode: 3.0KB → 1.4KB payload (53% reduction)
  - Sales Input tab load: ~1,816ms vs old ~3,601ms (50% faster)
  - Dashboard: No extra /api/reports call needed
  - Reports: No auto-query on module open
  - Operational modules default to Input tab (no history fetch)
