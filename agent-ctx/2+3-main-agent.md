# Task 2+3: Fix Typeahead Bug + Add Readonly Detail Fields

## Agent: Main Agent
## Status: Completed

## Summary
Fixed typeahead re-search bug and added readonly detail fields across Purchases, Sales, and Stock Mutations modules.

## Changes Made

### Files Modified:
1. `/home/z/my-project/inventra-demo/src/components/inventra/purchases/purchases-module.tsx`
2. `/home/z/my-project/inventra-demo/src/components/inventra/sales/sales-module.tsx`
3. `/home/z/my-project/inventra-demo/src/components/inventra/stock-mutations/stock-mutations-module.tsx`

### Key Changes:

#### Typeahead Bug Fix
- Added `onFocus` handler to all typeahead inputs that clears selected ID and puts code/SKU back into search field
- Changed input `value` to show only code/SKU when selected (not full display text)
- This ensures suggestions always re-appear when user edits after a selection

#### Readonly Detail Fields
- **Purchases**: Supplier code + readonly name + readonly phone/address; item rows with readonly product name, variant/size, buy price
- **Sales**: Customer code + readonly name + readonly phone/address; item rows with readonly product name, variant/size, sell price
- **Stock Mutations**: Variant SKU + readonly product name, variant/size, total stock

#### Helper Function
- Added `parseVariantAttrs()` to all three modules for parsing variant attributes JSON

## Build Status: Passes (`npx next build` successful)
