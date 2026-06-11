-- D4: Optimistic locking — add version field to editable entities
ALTER TABLE "Product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Supplier" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
