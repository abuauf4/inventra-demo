---
Task ID: qa-phase1
Agent: Main Agent
Task: QA Phase 1 - Comprehensive testing and bug fixing for stock logic, warehouse sync, activity log

Work Log:
- Read and analyzed all purchase/sale API route code
- Created comprehensive QA test script (qa-direct.js) for direct Prisma testing
- Ran QA test 1: Product creation with 3 variants - PASSED
- Ran QA test 2: Purchase Draft → Approved → Received flow - PASSED (stock only changes at RECEIVED)
- Ran QA test 3: Sale Draft → Paid → Completed flow - PASSED (stock only changes at COMPLETED)
- Ran QA test 4: Cancel/reverse transactions - PASSED (stock properly reverses)
- Ran QA test 5: Stock mutations audit trail - PASSED (10 mutations recorded correctly)
- Found BUG 1: Warehouse stock NOT synced when variant stock changes
- Found BUG 2: Activity Log NOT created in purchase/sale APIs
- Found BUG 3: ActivityLog FK constraint issue (entityId had 2 FK relations)
- Created /src/lib/stock.ts with updateVariantStock() and createActivityLog() helper functions
- Updated purchase API routes to use new helpers (warehouse stock sync + activity log)
- Updated sale API routes to use new helpers (warehouse stock sync + activity log)
- Fixed ActivityLog schema - removed FK relations, changed to polymorphic pattern (entity + entityId as string, no FK)
- Re-ran all QA tests after fixes - ALL PASSED
- Verified activity log creation works with CREATE, STATUS_CHANGE, LOGIN actions

Stage Summary:
- ✅ Stock logic 100% correct: only changes at RECEIVED (purchase) and COMPLETED (sale)
- ✅ Cancel properly reverses stock with ADJUSTMENT mutation
- ✅ Warehouse stock now synced with variant stock via updateVariantStock()
- ✅ Activity logs now recorded for all purchase/sale actions
- ✅ Stock mutations audit trail complete (IN, OUT, ADJUSTMENT types)
- ✅ CANCELLED status is immutable
- ✅ DRAFT-only deletion enforced
- ✅ Stock validation on COMPLETED sale (rejects overstock)
