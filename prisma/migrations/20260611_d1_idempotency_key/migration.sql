-- D1: Add idempotencyKey to Sale and Purchase for duplicate prevention
ALTER TABLE "Sale" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Sale_idempotencyKey_key" ON "Sale"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE UNIQUE INDEX "Purchase_idempotencyKey_key" ON "Purchase"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
