-- D2: Add deletedAt soft delete field to StockOpname (missed in initial D2 migration)
ALTER TABLE "StockOpname" ADD COLUMN "deletedAt" DATETIME;
