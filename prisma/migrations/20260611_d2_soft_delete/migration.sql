-- D2: Add deletedAt soft delete field to key entities
ALTER TABLE "Sale" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Purchase" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Product" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Customer" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Supplier" ADD COLUMN "deletedAt" DATETIME;
