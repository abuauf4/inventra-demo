---
Task ID: 2
Agent: Main Agent
Task: Upgrade NAUKA INVENTRA V1.1 - Product Variants, Warehouses, Activity Log, Status Workflow, Fashion Theme

Work Log:
- Updated Prisma schema with 5 new models: ProductVariant, Warehouse, WarehouseStock, ActivityLog, Attachment
- Added status workflow to Purchase (DRAFT→APPROVED→RECEIVED/CANCELLED) and Sale (DRAFT→PAID→COMPLETED/CANCELLED)
- Updated PurchaseItem and SaleItem to support variantId (preferred) with productId fallback
- Updated StockMutation to support variantId and warehouseId
- Created new API routes: /api/product-variants, /api/warehouses, /api/activity-logs, /api/attachments
- Updated existing API routes: products (with variants), purchases/sales (with status workflow), dashboard, reports, seed
- Rebuilt entire frontend with:
  - Fashion theme (rose/amber gradient branding)
  - Renamed "Dashboard" to "Overview" in sidebar
  - Added Product Variants UI (expand/collapse per product, add variant dialog, attribute badges)
  - Added Warehouse module (card-based layout)
  - Added Activity Log module (timeline view with action icons)
  - Added Status Workflow in Purchases (Draft→Setujui→Terima) and Sales (Draft→Bayar→Selesai)
  - Status badges with color coding throughout
  - Variant-level stock tracking in reports
- Seeded fashion data: 4 products with 18 variants, 2 warehouses, fashion categories

Stage Summary:
- All new features implemented and working
- Fashion theme applied (rose-500 to amber-500 gradients)
- Product Variant system fully functional
- Warehouse management with card UI
- Status workflow for Purchases and Sales
- Activity Log infrastructure in place
- Variant-level stock reporting
- All APIs return 200, lint passes clean
