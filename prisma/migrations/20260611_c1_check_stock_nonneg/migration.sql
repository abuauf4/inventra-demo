-- C1: Add CHECK constraint to prevent negative stock at DB level
-- This is a safety net even if application logic is bypassed.

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_nonneg" CHECK ("stock" >= 0);
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_stock_nonneg" CHECK ("stock" >= 0);
