# Worklog: Add Offset Pagination to All List API Endpoints and Frontend Modules

**Task ID**: e2
**Date**: 2025-06-11

## Summary

Added offset pagination (`page`, `limit`, `search` params + pagination metadata) to all list API endpoints and corresponding frontend modules in the INVENTRA ERP system.

## API Changes

### 1. `/api/products/route.ts`
- Added `page` param (default: 1) and changed `limit` default from 100 to 20
- Added `skip` calculation: `(page - 1) * limit`
- For `lowStock` filter: fetches all products first, filters in JS, then manually paginates (since Prisma can't compare `stock <= minStock` at DB level)
- For normal path: uses DB-level pagination with `Promise.all([findMany, count])`
- Returns `{ success, data, pagination: { page, limit, total, totalPages } }`

### 2. `/api/suppliers/route.ts`
- Added `page` param (default: 1) and changed `limit` default from 0 (unlimited) to 20
- Added `skip`/`take` in Prisma query
- Added `db.supplier.count({ where })` for total count
- Returns pagination metadata

### 3. `/api/customers/route.ts`
- Added `page` param (default: 1) and changed `limit` default from 0 (unlimited) to 20
- Added `skip`/`take` in Prisma query
- Added `db.customer.count({ where })` for total count
- Returns pagination metadata

### 4. `/api/stock-mutations/route.ts`
- Added `search` param with OR filter on `note`, `product.name`, `product.sku`, `variant.name`, `variant.sku`
- Added `page` param (default: 1) and changed `limit` default from 100 to 20
- Added `skip`/`take` in Prisma query
- Added `db.stockMutation.count({ where })` for total count
- Returns pagination metadata

### 5. `/api/stock-opname/route.ts`
- Added `search` param with OR filter on `transNo` and `notes`
- Added `page` param (default: 1) and `limit` param (default: 20)
- Added `skip`/`take` in Prisma query
- Added `db.stockOpname.count({ where })` for total count
- Returns pagination metadata

### Already Had Pagination (no changes needed):
- `/api/sales/route.ts` - already had `page`, `limit`, `search`, pagination response
- `/api/purchases/route.ts` - already had `page`, `limit`, `search`, pagination response

## Frontend Hook Changes (`use-query-hooks.ts`)

### `useProducts`
- Changed params from `{ search, categoryId, lowStock, mode, enabled }` to `{ search, categoryId, supplierId, lowStock, mode, page, limit, enabled }`
- Now returns `{ data, pagination }` instead of just array
- Updated queryKey to include `page` and `limit`

### `useSuppliers`
- Changed params from `search?: string` to `{ search?, page?, limit?, enabled? }`
- Now returns `{ data, pagination }` instead of just array
- Updated queryKey to include `page` and `limit`

### `useCustomers`
- Changed params from `search?: string` to `{ search?, page?, limit?, enabled? }`
- Now returns `{ data, pagination }` instead of just array
- Updated queryKey to include `page` and `limit`

### `useStockMutations`
- Added `search` param
- Added `page` param
- Now returns `{ data, pagination }` instead of just array
- Updated queryKey to include `search` and `page`

## Frontend Module Changes

### `products-module.tsx`
- Added `page` state and `PAGE_LIMIT = 20`
- Updated `useProducts` call to include `page` and `limit`
- Extracts `productsData?.data` and `productsData?.pagination`
- Page resets to 1 on search/filter changes (via onChange handlers)
- Added pagination UI at bottom with "Sebelumnya"/"Selanjutnya" buttons

### `suppliers-module.tsx`
- Added `page` state and `PAGE_LIMIT = 20`
- Updated `useSuppliers` call to include `search`, `page`, `limit`
- Extracts `suppliersData?.data` and `suppliersData?.pagination`
- Page resets to 1 on search change
- Added pagination UI at bottom

### `customers-module.tsx`
- Added `page` state and `PAGE_LIMIT = 20`
- Updated `useCustomers` call to include `search`, `page`, `limit`
- Extracts `customersData?.data` and `customersData?.pagination`
- Page resets to 1 on search change
- Added pagination UI at bottom

### `stock-mutations-module.tsx`
- Changed `PAGE_LIMIT` from 50 to 20
- Updated `useStockMutations` call to include `page` and `limit`
- Extracts `mutationsData?.data` and `mutationsData?.pagination`
- Page resets to 1 when filter type changes
- Added pagination UI at bottom of History tab

### Already Had Pagination (updated for consistency):
- `sales-module.tsx` - already had pagination UI
- `purchases-module.tsx` - already had pagination UI

## Breaking Change Fixes

Since hooks now return `{ data, pagination }` instead of arrays, updated all consumers:

- **`sales-module.tsx`**: `useCustomers({ limit: 200 })` + extract `.data`, `useProducts({ limit: 200 })` + extract `.data`
- **`purchases-module.tsx`**: `useSuppliers({ limit: 200 })` + extract `.data`, `useProducts({ limit: 200 })` + extract `.data`
- **`products-module.tsx`**: `useSuppliers({ limit: 200 })` + extract `.data`
- **`stock-mutations-module.tsx`**: `useProducts({ limit: 200 })` + extract `.data`
- **`stock-transfer-module.tsx`**: `useProducts({ limit: 200 })` + extract `.data`, `useStockMutations` + extract `.data`
- **`quick-sale-dialog.tsx`**: Updated fetch URLs to include `?limit=200`
- **`suppliers-module.tsx`**: Updated fetch URL for supplier products to `?limit=200`

## Files Modified

1. `src/app/api/products/route.ts` - Added pagination
2. `src/app/api/suppliers/route.ts` - Added pagination
3. `src/app/api/customers/route.ts` - Added pagination
4. `src/app/api/stock-mutations/route.ts` - Added pagination + search
5. `src/app/api/stock-opname/route.ts` - Added pagination + search
6. `src/components/inventra/hooks/use-query-hooks.ts` - Updated all hooks
7. `src/components/inventra/products/products-module.tsx` - Added pagination UI
8. `src/components/inventra/suppliers/suppliers-module.tsx` - Added pagination UI
9. `src/components/inventra/customers/customers-module.tsx` - Added pagination UI
10. `src/components/inventra/stock-mutations/stock-mutations-module.tsx` - Added pagination UI
11. `src/components/inventra/sales/sales-module.tsx` - Updated hook usage
12. `src/components/inventra/purchases/purchases-module.tsx` - Updated hook usage
13. `src/components/inventra/stock-transfer/stock-transfer-module.tsx` - Updated hook usage
14. `src/components/inventra/shared/quick-sale-dialog.tsx` - Updated fetch URLs
