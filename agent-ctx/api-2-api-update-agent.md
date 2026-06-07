# Task api-2 - API Update Agent Work Record

## Task
Update existing API routes for V1.1 schema changes (ProductVariant stock, Purchase/Sale status, Warehouse relations)

## Summary
Updated 9 API route files to support the V1.1 schema changes where:
- Product no longer has `stock` field (stock is on ProductVariant)
- Purchase has `status` field (DRAFT, APPROVED, RECEIVED, CANCELLED)
- Sale has `status` field (DRAFT, PAID, COMPLETED, CANCELLED)
- PurchaseItem/SaleItem now have `variantId` (preferred) and `productId` (fallback)
- StockMutation now has `variantId` and `warehouseId`

## Files Modified
1. `/api/products/route.ts` - Added variants include, variant creation on POST, lowStock via variants
2. `/api/products/[id]/route.ts` - Variant update/create on PUT, variant reference check on DELETE
3. `/api/purchases/route.ts` - Status filter, status handling, variant-based stock, resolveVariant helper
4. `/api/purchases/[id]/route.ts` - PUT endpoint for status changes, RECEIVED stock logic, CANCELLED reversal
5. `/api/sales/route.ts` - Status filter, status handling, variant-based stock, resolveVariant helper
6. `/api/sales/[id]/route.ts` - PUT endpoint for status changes, COMPLETED stock logic, CANCELLED reversal
7. `/api/dashboard/route.ts` - Variant-level low stock, activity logs, status-filtered aggregates
8. `/api/seed/route.ts` - Fashion-themed seed data with variants and WarehouseStock
9. `/api/reports/route.ts` - Variant-level stock report, variant info in sales/purchase reports

## Verification
- Lint passes clean
- API endpoints tested successfully: products (200), dashboard (200), reports/stock (200), purchases (200), sales (200)
- Seed data created successfully with 4 products, 18 variants, 2 warehouses, 4 low-stock variants
