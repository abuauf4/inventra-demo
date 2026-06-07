/**
 * NAUKA INVENTRA QA TEST SUITE
 * Tests business logic directly via Prisma (no HTTP server needed)
 * 8 Test Scenarios for Stock Logic Verification
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let PASS = 0;
let FAIL = 0;
const BUGS = [];

function qassert(testName, expected, actual) {
  if (expected === actual) {
    console.log(`  ✅ PASS: ${testName}`);
    PASS++;
  } else {
    console.log(`  ❌ FAIL: ${testName} (expected=${expected}, actual=${actual})`);
    FAIL++;
    BUGS.push(`${testName}: expected=${expected}, actual=${actual}`);
  }
}

function qassertGt(testName, expectedMin, actual) {
  if (actual > expectedMin) {
    console.log(`  ✅ PASS: ${testName} (${actual} > ${expectedMin})`);
    PASS++;
  } else {
    console.log(`  ❌ FAIL: ${testName} (${actual} <= ${expectedMin})`);
    FAIL++;
    BUGS.push(`${testName}: ${actual} <= ${expectedMin}`);
  }
}

// --- Stock logic (replicated from src/lib/stock.ts) ---
async function updateVariantStock(variantId, qty, warehouseId) {
  const updatedVariant = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      stock: qty > 0 ? { increment: qty } : { decrement: Math.abs(qty) },
    },
  });

  let whId = warehouseId;
  if (!whId) {
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    whId = defaultWarehouse?.id;
  }

  if (whId) {
    const existingStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productVariantId: {
          warehouseId: whId,
          productVariantId: variantId,
        },
      },
    });

    if (existingStock) {
      await prisma.warehouseStock.update({
        where: { id: existingStock.id },
        data: {
          stock: qty > 0 ? { increment: qty } : { decrement: Math.abs(qty) },
        },
      });
    } else {
      await prisma.warehouseStock.create({
        data: {
          warehouseId: whId,
          productVariantId: variantId,
          stock: qty > 0 ? qty : 0,
        },
      });
    }
  }

  return updatedVariant;
}

async function createActivityLog(params) {
  try {
    let userId = params.userId;
    if (!userId) {
      const owner = await prisma.user.findFirst({ where: { role: 'owner' } });
      userId = owner?.id || 'system';
    }
    await prisma.activityLog.create({
      data: {
        userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
      },
    });
  } catch (error) {
    console.error('Failed to create activity log:', error);
  }
}

async function resolveVariant(variantId, productId) {
  if (variantId) {
    return await prisma.productVariant.findUnique({ where: { id: variantId } });
  }
  if (productId) {
    return await prisma.productVariant.findFirst({ where: { productId, isActive: true } });
  }
  return null;
}

// --- Purchase creation logic (replicated from API) ---
async function createPurchase({ supplierId, date, notes, status, items }) {
  const purchaseStatus = status || 'DRAFT';
  const purchaseDate = new Date(date);
  const dateStr = purchaseDate.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PB-${dateStr}-`;

  const todayStart = new Date(purchaseDate);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(purchaseDate);
  todayEnd.setHours(23, 59, 59, 999);

  const existingCount = await prisma.purchase.count({
    where: { date: { gte: todayStart, lte: todayEnd } },
  });

  const seqNumber = String(existingCount + 1).padStart(4, '0');
  const transNo = `${prefix}${seqNumber}`;
  const total = items.reduce((sum, item) => sum + item.qty * item.buyPrice, 0);

  const resolvedItems = [];
  for (const item of items) {
    const variant = await resolveVariant(item.variantId, item.productId);
    if (!variant) throw new Error(`Variant not found`);
    resolvedItems.push({
      variantId: variant.id,
      productId: variant.productId,
      qty: item.qty,
      buyPrice: item.buyPrice,
    });
  }

  const purchase = await prisma.purchase.create({
    data: {
      transNo,
      supplierId,
      date: purchaseDate,
      total,
      status: purchaseStatus,
      notes: notes || null,
      items: {
        create: resolvedItems.map((item) => ({
          variantId: item.variantId,
          productId: item.productId,
          qty: item.qty,
          buyPrice: item.buyPrice,
        })),
      },
    },
    include: {
      supplier: true,
      items: { include: { variant: { select: { id: true, name: true, sku: true } } } },
    },
  });

  if (purchaseStatus === 'RECEIVED') {
    for (const item of resolvedItems) {
      await updateVariantStock(item.variantId, item.qty);
      await prisma.stockMutation.create({
        data: {
          variantId: item.variantId,
          productId: item.productId,
          type: 'IN',
          qty: item.qty,
          note: `Pembelian ${transNo}`,
          referenceId: purchase.id,
        },
      });
    }
  }

  await createActivityLog({
    action: 'CREATE',
    entity: 'Purchase',
    entityId: purchase.id,
    details: `Pembelian ${transNo} dibuat dengan status ${purchaseStatus}. Total: Rp ${total.toLocaleString('id-ID')}. ${resolvedItems.length} item.`,
  });

  return purchase;
}

// --- Purchase status update logic (replicated from API) ---
async function updatePurchaseStatus(purchaseId, newStatus) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });

  if (!purchase) throw new Error('Purchase not found');

  const currentStatus = purchase.status;

  if (currentStatus === 'CANCELLED') throw new Error('Cannot modify cancelled purchase');
  if (currentStatus === 'RECEIVED' && newStatus !== 'CANCELLED') throw new Error('Received purchase can only be cancelled');
  if (currentStatus === newStatus) return purchase;

  if (newStatus === 'RECEIVED') {
    for (const item of purchase.items) {
      const variant = await resolveVariant(item.variantId, item.productId);
      if (!variant) throw new Error('Variant not found for purchase item');
      await updateVariantStock(variant.id, item.qty);
      await prisma.stockMutation.create({
        data: {
          variantId: variant.id,
          productId: variant.productId,
          type: 'IN',
          qty: item.qty,
          note: `Pembelian ${purchase.transNo} - Status RECEIVED`,
          referenceId: purchase.id,
        },
      });
    }
  }

  if (newStatus === 'CANCELLED' && currentStatus === 'RECEIVED') {
    for (const item of purchase.items) {
      const variant = await resolveVariant(item.variantId, item.productId);
      if (!variant) continue;
      await updateVariantStock(variant.id, -item.qty);
      await prisma.stockMutation.create({
        data: {
          variantId: variant.id,
          productId: variant.productId,
          type: 'ADJUSTMENT',
          qty: item.qty,
          note: `Pembatalan pembelian ${purchase.transNo}`,
          referenceId: purchase.id,
        },
      });
    }
  }

  const updatedPurchase = await prisma.purchase.update({
    where: { id: purchaseId },
    data: { status: newStatus },
  });

  await createActivityLog({
    action: 'STATUS_CHANGE',
    entity: 'Purchase',
    entityId: purchase.id,
    details: `Pembelian ${purchase.transNo} status diubah dari ${currentStatus} ke ${newStatus}`,
  });

  return updatedPurchase;
}

// --- Sale creation logic (replicated from API) ---
async function createSale({ customerId, date, notes, status, items }) {
  const saleStatus = status || 'DRAFT';
  const saleDate = new Date(date);

  const resolvedItems = [];
  for (const item of items) {
    const variant = await resolveVariant(item.variantId, item.productId);
    if (!variant) throw new Error(`Variant not found`);
    resolvedItems.push({
      variantId: variant.id,
      productId: variant.productId,
      qty: item.qty,
      sellPrice: item.sellPrice,
      variantStock: variant.stock,
      variantName: variant.name,
    });
  }

  if (saleStatus === 'COMPLETED') {
    for (const item of resolvedItems) {
      if (item.qty > item.variantStock) {
        throw new Error(`Stok tidak cukup untuk variant ${item.variantName}. Stok tersedia: ${item.variantStock}, diminta: ${item.qty}`);
      }
    }
  }

  const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SL-${dateStr}-`;
  const todayStart = new Date(saleDate);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(saleDate);
  todayEnd.setHours(23, 59, 59, 999);
  const existingCount = await prisma.sale.count({
    where: { date: { gte: todayStart, lte: todayEnd } },
  });
  const seqNumber = String(existingCount + 1).padStart(4, '0');
  const transNo = `${prefix}${seqNumber}`;
  const total = items.reduce((sum, item) => sum + item.qty * item.sellPrice, 0);

  const sale = await prisma.sale.create({
    data: {
      transNo,
      customerId: customerId || null,
      date: saleDate,
      total,
      status: saleStatus,
      notes: notes || null,
      items: {
        create: resolvedItems.map((item) => ({
          variantId: item.variantId,
          productId: item.productId,
          qty: item.qty,
          sellPrice: item.sellPrice,
        })),
      },
    },
  });

  if (saleStatus === 'COMPLETED') {
    for (const item of resolvedItems) {
      await updateVariantStock(item.variantId, -item.qty);
      await prisma.stockMutation.create({
        data: {
          variantId: item.variantId,
          productId: item.productId,
          type: 'OUT',
          qty: item.qty,
          note: `Penjualan ${transNo}`,
          referenceId: sale.id,
        },
      });
    }
  }

  await createActivityLog({
    action: 'CREATE',
    entity: 'Sale',
    entityId: sale.id,
    details: `Penjualan ${transNo} dibuat dengan status ${saleStatus}. Total: Rp ${total.toLocaleString('id-ID')}. ${resolvedItems.length} item.`,
  });

  return sale;
}

// --- Sale status update logic (replicated from API) ---
async function updateSaleStatus(saleId, newStatus) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale) throw new Error('Sale not found');
  const currentStatus = sale.status;

  if (currentStatus === 'CANCELLED') throw new Error('Cannot modify cancelled sale');
  if (currentStatus === 'COMPLETED' && newStatus !== 'CANCELLED') throw new Error('Completed sale can only be cancelled');
  if (currentStatus === newStatus) return sale;

  if (newStatus === 'COMPLETED') {
    for (const item of sale.items) {
      const variant = await resolveVariant(item.variantId, item.productId);
      if (!variant) throw new Error('Variant not found for sale item');
      if (item.qty > variant.stock) {
        throw new Error(`Stok tidak cukup untuk variant ${variant.name}. Stok tersedia: ${variant.stock}, diminta: ${item.qty}`);
      }
      await updateVariantStock(variant.id, -item.qty);
      await prisma.stockMutation.create({
        data: {
          variantId: variant.id,
          productId: variant.productId,
          type: 'OUT',
          qty: item.qty,
          note: `Penjualan ${sale.transNo} - Status COMPLETED`,
          referenceId: sale.id,
        },
      });
    }
  }

  if (newStatus === 'CANCELLED' && currentStatus === 'COMPLETED') {
    for (const item of sale.items) {
      const variant = await resolveVariant(item.variantId, item.productId);
      if (!variant) continue;
      await updateVariantStock(variant.id, item.qty);
      await prisma.stockMutation.create({
        data: {
          variantId: variant.id,
          productId: variant.productId,
          type: 'ADJUSTMENT',
          qty: item.qty,
          note: `Pembatalan penjualan ${sale.transNo}`,
          referenceId: sale.id,
        },
      });
    }
  }

  const updatedSale = await prisma.sale.update({
    where: { id: saleId },
    data: { status: newStatus },
  });

  await createActivityLog({
    action: 'STATUS_CHANGE',
    entity: 'Sale',
    entityId: sale.id,
    details: `Penjualan ${sale.transNo} status diubah dari ${currentStatus} ke ${newStatus}`,
  });

  return updatedSale;
}

// =================================================================
// MAIN TEST
// =================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('  NAUKA INVENTRA QA TEST SUITE (Direct Prisma)');
  console.log('='.repeat(60));

  // --- SETUP ---
  console.log('\n📦 Setup: Getting reference data...');
  const categories = await prisma.category.findMany();
  const suppliers = await prisma.supplier.findMany();
  const customers = await prisma.customer.findMany();
  const warehouses = await prisma.warehouse.findMany({ orderBy: { createdAt: 'asc' } });

  const catAksesoris = categories.find(c => c.name === 'Aksesoris') || categories[0];
  const supplier1 = suppliers[0];
  const customer1 = customers[0];
  const warehouse1 = warehouses.find(w => w.code === 'GDG-01') || warehouses[0];
  const warehouse2 = warehouses.find(w => w.code === 'TOKO-01') || warehouses[1];

  console.log(`  Categories: ${categories.length}, Suppliers: ${suppliers.length}, Customers: ${customers.length}, Warehouses: ${warehouses.length}`);

  const baselineMutations = await prisma.stockMutation.count();
  const baselineActivities = await prisma.activityLog.count();
  console.log(`  Baseline mutations: ${baselineMutations}, activities: ${baselineActivities}`);

  // =================================================================
  // QA TEST 1: Create product with 3 variants
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST 1: Create product with 3 variants');
  console.log('='.repeat(60));

  const product = await prisma.product.create({
    data: {
      name: 'Canvas Tote Bag',
      sku: 'CTB-QA-' + Date.now(),
      categoryId: catAksesoris.id,
      supplierId: supplier1.id,
      buyPrice: 45000,
      sellPrice: 95000,
      minStock: 5,
      isActive: true,
      variants: {
        create: [
          { name: 'Natural S', sku: 'CTB-NAT-S-QA-' + Date.now(), attributes: '{"color":"Natural","size":"S"}', buyPrice: 45000, sellPrice: 95000, stock: 0, minStock: 5, isActive: true },
          { name: 'Natural M', sku: 'CTB-NAT-M-QA-' + Date.now(), attributes: '{"color":"Natural","size":"M"}', buyPrice: 45000, sellPrice: 95000, stock: 0, minStock: 5, isActive: true },
          { name: 'Black OS', sku: 'CTB-BLK-OS-QA-' + Date.now(), attributes: '{"color":"Black","size":"One Size"}', buyPrice: 50000, sellPrice: 110000, stock: 0, minStock: 5, isActive: true },
        ],
      },
    },
    include: { variants: true },
  });

  qassert('Product created', true, !!product.id);
  qassert('Product has 3 variants', 3, product.variants.length);
  qassert('Product name correct', 'Canvas Tote Bag', product.name);

  const v1 = product.variants[0];
  const v2 = product.variants[1];
  const v3 = product.variants[2];
  console.log(`  V1: ${v1.name} (${v1.sku}) stock=${v1.stock}`);
  console.log(`  V2: ${v2.name} (${v2.sku}) stock=${v2.stock}`);
  console.log(`  V3: ${v3.name} (${v3.sku}) stock=${v3.stock}`);

  qassert('V1 initial stock = 0', 0, v1.stock);
  qassert('V2 initial stock = 0', 0, v2.stock);
  qassert('V3 initial stock = 0', 0, v3.stock);

  // =================================================================
  // QA TEST 2: Purchase flow Draft → Approved → Received
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST 2: Purchase flow Draft → Approved → Received');
  console.log('='.repeat(60));

  // Create purchase as DRAFT
  const purchase = await createPurchase({
    supplierId: supplier1.id,
    date: '2026-06-07',
    notes: 'QA Test - Purchase',
    status: 'DRAFT',
    items: [
      { variantId: v1.id, qty: 10, buyPrice: 45000 },
      { variantId: v2.id, qty: 5, buyPrice: 45000 },
    ],
  });

  qassert('Purchase DRAFT created', true, !!purchase.id);
  qassert('Purchase status is DRAFT', 'DRAFT', purchase.status);
  console.log(`  Purchase: ${purchase.transNo}`);

  // --- QA TEST 3: Stock should NOT change at DRAFT ---
  console.log('\n--- QA TEST 3: Stock should NOT change at DRAFT ---');
  const v1AfterDraft = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  const v2AfterDraft = (await prisma.productVariant.findUnique({ where: { id: v2.id } })).stock;
  qassert('V1 stock unchanged after DRAFT', 0, v1AfterDraft);
  qassert('V2 stock unchanged after DRAFT', 0, v2AfterDraft);

  const mutationsAfterDraft = await prisma.stockMutation.count();
  qassert('No stock mutation at DRAFT', baselineMutations, mutationsAfterDraft);

  // DRAFT → APPROVED
  console.log('\n--- Transition: DRAFT → APPROVED ---');
  const purchaseApproved = await updatePurchaseStatus(purchase.id, 'APPROVED');
  qassert('Status is APPROVED', 'APPROVED', purchaseApproved.status);

  const v1AfterApproved = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  const v2AfterApproved = (await prisma.productVariant.findUnique({ where: { id: v2.id } })).stock;
  qassert('V1 stock unchanged after APPROVED', 0, v1AfterApproved);
  qassert('V2 stock unchanged after APPROVED', 0, v2AfterApproved);

  const mutationsAfterApproved = await prisma.stockMutation.count();
  qassert('No stock mutation at APPROVED', baselineMutations, mutationsAfterApproved);

  // APPROVED → RECEIVED
  console.log('\n--- Transition: APPROVED → RECEIVED ---');
  const purchaseReceived = await updatePurchaseStatus(purchase.id, 'RECEIVED');
  qassert('Status is RECEIVED', 'RECEIVED', purchaseReceived.status);

  const v1AfterReceived = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  const v2AfterReceived = (await prisma.productVariant.findUnique({ where: { id: v2.id } })).stock;
  qassert('V1 stock +10 after RECEIVED (was 0)', 10, v1AfterReceived);
  qassert('V2 stock +5 after RECEIVED (was 0)', 5, v2AfterReceived);

  // Check warehouse stock
  const ws1 = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productVariantId: { warehouseId: warehouse1.id, productVariantId: v1.id } }
  });
  const ws2 = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productVariantId: { warehouseId: warehouse1.id, productVariantId: v2.id } }
  });
  console.log(`  Warehouse V1 stock (GDG-01): ${ws1?.stock}`);
  console.log(`  Warehouse V2 stock (GDG-01): ${ws2?.stock}`);
  qassert('Warehouse V1 stock = 10', 10, ws1?.stock);
  qassert('Warehouse V2 stock = 5', 5, ws2?.stock);

  const mutationsAfterReceived = await prisma.stockMutation.count();
  qassert('2 IN mutations created at RECEIVED', baselineMutations + 2, mutationsAfterReceived);

  // =================================================================
  // QA TEST 4: Sales flow Draft → Paid → Completed
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST 4: Sales flow Draft → Paid → Completed');
  console.log('='.repeat(60));

  const sale = await createSale({
    customerId: customer1.id,
    date: '2026-06-07',
    notes: 'QA Test - Sale',
    status: 'DRAFT',
    items: [
      { variantId: v1.id, qty: 3, sellPrice: 95000 },
    ],
  });

  qassert('Sale DRAFT created', true, !!sale.id);
  qassert('Sale status is DRAFT', 'DRAFT', sale.status);
  console.log(`  Sale: ${sale.transNo}`);

  // Stock should NOT change at DRAFT
  const v1AfterSaleDraft = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  qassert('V1 stock unchanged after Sale DRAFT', 10, v1AfterSaleDraft);

  // DRAFT → PAID
  console.log('\n--- Transition: DRAFT → PAID ---');
  const salePaid = await updateSaleStatus(sale.id, 'PAID');
  qassert('Status is PAID', 'PAID', salePaid.status);

  const v1AfterPaid = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  qassert('V1 stock unchanged after PAID', 10, v1AfterPaid);

  // --- QA TEST 5: Stock decreases at COMPLETED ---
  console.log('\n--- QA TEST 5: Stock decreases at COMPLETED ---');
  const saleCompleted = await updateSaleStatus(sale.id, 'COMPLETED');
  qassert('Status is COMPLETED', 'COMPLETED', saleCompleted.status);

  const v1AfterCompleted = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  qassert('V1 stock -3 after COMPLETED (was 10)', 7, v1AfterCompleted);

  // Check warehouse stock
  const ws1AfterSale = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productVariantId: { warehouseId: warehouse1.id, productVariantId: v1.id } }
  });
  qassert('Warehouse V1 stock = 7 after sale', 7, ws1AfterSale?.stock);

  const mutationsAfterSale = await prisma.stockMutation.count();
  qassert('OUT mutation created at COMPLETED', mutationsAfterReceived + 1, mutationsAfterSale);

  // =================================================================
  // QA TEST 6: Cancel/delete - stock reversal
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST 6: Cancel/delete - stock reversal');
  console.log('='.repeat(60));

  // 6a: Cancel COMPLETED sale → stock reverses
  console.log('\n--- 6a: Cancel COMPLETED sale ---');
  const v1BeforeCancel = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  console.log(`  V1 stock before cancel: ${v1BeforeCancel}`);

  const saleCancelled = await updateSaleStatus(sale.id, 'CANCELLED');
  qassert('Sale CANCELLED', 'CANCELLED', saleCancelled.status);

  const v1AfterCancel = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  qassert('V1 stock +3 after sale CANCELLED (was 7)', 10, v1AfterCancel);

  const ws1AfterSaleCancel = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productVariantId: { warehouseId: warehouse1.id, productVariantId: v1.id } }
  });
  qassert('Warehouse V1 stock = 10 after sale cancel', 10, ws1AfterSaleCancel?.stock);

  const mutationsAfterSaleCancel = await prisma.stockMutation.count();
  qassert('ADJUSTMENT mutation for sale cancel', mutationsAfterSale + 1, mutationsAfterSaleCancel);

  // 6b: Cancel RECEIVED purchase → stock reverses
  console.log('\n--- 6b: Cancel RECEIVED purchase ---');
  const v1BeforePCancel = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  const v2BeforePCancel = (await prisma.productVariant.findUnique({ where: { id: v2.id } })).stock;
  console.log(`  V1 stock before purchase cancel: ${v1BeforePCancel}`);
  console.log(`  V2 stock before purchase cancel: ${v2BeforePCancel}`);

  const purchaseCancelled = await updatePurchaseStatus(purchase.id, 'CANCELLED');
  qassert('Purchase CANCELLED', 'CANCELLED', purchaseCancelled.status);

  const v1AfterPCancel = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  const v2AfterPCancel = (await prisma.productVariant.findUnique({ where: { id: v2.id } })).stock;
  qassert('V1 stock -10 after purchase CANCELLED (was 10)', 0, v1AfterPCancel);
  qassert('V2 stock -5 after purchase CANCELLED (was 5)', 0, v2AfterPCancel);

  const ws1AfterPCancel = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productVariantId: { warehouseId: warehouse1.id, productVariantId: v1.id } }
  });
  qassert('Warehouse V1 stock = 0 after purchase cancel', 0, ws1AfterPCancel?.stock);

  // 6c: Delete DRAFT purchase → no stock change
  console.log('\n--- 6c: Create & delete DRAFT purchase ---');
  const draftPurchase = await createPurchase({
    supplierId: supplier1.id,
    date: '2026-06-07',
    status: 'DRAFT',
    items: [{ variantId: v1.id, qty: 99, buyPrice: 45000 }],
  });
  const mutationsBeforeDelete = await prisma.stockMutation.count();

  await prisma.purchaseItem.deleteMany({ where: { purchaseId: draftPurchase.id } });
  await prisma.purchase.delete({ where: { id: draftPurchase.id } });

  const v1AfterDelete = (await prisma.productVariant.findUnique({ where: { id: v1.id } })).stock;
  qassert('V1 stock unchanged after DRAFT delete', 0, v1AfterDelete);

  const mutationsAfterDelete = await prisma.stockMutation.count();
  qassert('No mutation created by DRAFT delete', mutationsBeforeDelete, mutationsAfterDelete);

  // 6d: Test stock insufficient for sale
  console.log('\n--- 6d: Stock insufficient for sale ---');
  try {
    await createSale({
      customerId: customer1.id,
      date: '2026-06-07',
      status: 'COMPLETED',
      items: [{ variantId: v1.id, qty: 999, sellPrice: 95000 }],
    });
    qassert('Sale with insufficient stock should fail', true, false); // Should NOT reach here
  } catch (error) {
    qassert('Sale with insufficient stock rejected', true, error.message.includes('Stok tidak cukup'));
    console.log(`  Error message: ${error.message}`);
  }

  // 6e: DRAFT → CANCELLED (no stock change)
  console.log('\n--- 6e: DRAFT purchase → CANCELLED (no stock change) ---');
  const draftPurchase2 = await createPurchase({
    supplierId: supplier1.id,
    date: '2026-06-07',
    status: 'DRAFT',
    items: [{ variantId: v3.id, qty: 50, buyPrice: 45000 }],
  });
  const v3BeforeDraftCancel = (await prisma.productVariant.findUnique({ where: { id: v3.id } })).stock;

  // DRAFT → CANCELLED (this should NOT be blocked by current code)
  // The API allows DRAFT → CANCELLED but doesn't check for it explicitly
  // Let's test what happens
  try {
    await updatePurchaseStatus(draftPurchase2.id, 'CANCELLED');
    const v3AfterDraftCancel = (await prisma.productVariant.findUnique({ where: { id: v3.id } })).stock;
    qassert('V3 stock unchanged after DRAFT→CANCELLED', v3BeforeDraftCancel, v3AfterDraftCancel);
  } catch (error) {
    console.log(`  DRAFT→CANCELLED error: ${error.message}`);
    qassert('DRAFT→CANCELLED should work', true, false);
  }

  // =================================================================
  // QA TEST 7: Activity Log verification
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST 7: Activity Log verification');
  console.log('='.repeat(60));

  const allLogs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  qassert('Activity logs exist', true, allLogs.length > 0);

  const actions = [...new Set(allLogs.map(l => l.action))];
  const entities = [...new Set(allLogs.map(l => l.entity))];
  console.log(`  Total logs (recent 20): ${allLogs.length}`);
  console.log(`  Actions: ${actions.join(', ')}`);
  console.log(`  Entities: ${entities.join(', ')}`);

  qassert('CREATE action exists', true, actions.includes('CREATE'));
  qassert('STATUS_CHANGE action exists', true, actions.includes('STATUS_CHANGE'));
  qassert('Purchase entity exists', true, entities.includes('Purchase'));
  qassert('Sale entity exists', true, entities.includes('Sale'));

  console.log('\n  Recent activity logs:');
  for (const log of allLogs.slice(0, 5)) {
    console.log(`    [${log.action}] ${log.entity}: ${log.details.slice(0, 80)}...`);
  }

  // =================================================================
  // QA TEST 8: Stock reports per variant and per warehouse
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST 8: Stock reports per variant & warehouse');
  console.log('='.repeat(60));

  // 8a: Stock mutations
  const allMutations = await prisma.stockMutation.findMany();
  const mutationTypes = [...new Set(allMutations.map(m => m.type))];
  console.log(`  Total mutations: ${allMutations.length}`);
  console.log(`  Mutation types: ${mutationTypes.join(', ')}`);

  qassert('IN mutations exist', true, mutationTypes.includes('IN'));
  qassert('OUT mutations exist', true, mutationTypes.includes('OUT'));
  qassert('ADJUSTMENT mutations exist', true, mutationTypes.includes('ADJUSTMENT'));

  // 8b: Stock consistency check
  console.log('\n  Stock consistency check:');
  const allVariants = await prisma.productVariant.findMany({
    include: { warehouseStocks: true },
  });

  let inconsistentCount = 0;
  for (const variant of allVariants) {
    const warehouseSum = variant.warehouseStocks.reduce((sum, ws) => sum + ws.stock, 0);
    if (variant.stock !== warehouseSum) {
      console.log(`    ⚠️  ${variant.sku}: variant_stock=${variant.stock}, warehouse_sum=${warehouseSum}`);
      inconsistentCount++;
    }
  }

  if (inconsistentCount > 0) {
    qassert('All variant stocks match warehouse sums', 0, inconsistentCount);
  } else {
    qassert('All variant stocks match warehouse sums', true, true);
    console.log('  ✅ All variant stocks are consistent with warehouse sums');
  }

  // 8c: Warehouse stock report
  console.log('\n  Warehouse stock per variant:');
  const warehouseStocks = await prisma.warehouseStock.findMany({
    include: {
      warehouse: { select: { name: true, code: true } },
      variant: { select: { name: true, sku: true, product: { select: { name: true } } } },
    },
    take: 15,
  });

  for (const ws of warehouseStocks) {
    console.log(`    ${ws.warehouse.name} > ${ws.variant.product.name} > ${ws.variant.name} (${ws.variant.sku}): ${ws.stock}`);
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  QA TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed: ${PASS}`);
  console.log(`  ❌ Failed: ${FAIL}`);
  if (BUGS.length > 0) {
    console.log(`\n  🐛 BUGS FOUND (${BUGS.length}):`);
    for (const bug of BUGS) {
      console.log(`    - ${bug}`);
    }
  } else {
    console.log('\n  🎉 ALL TESTS PASSED!');
  }
  console.log('='.repeat(60));

  await prisma.$disconnect();
  process.exit(FAIL);
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
