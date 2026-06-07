const BASE = 'http://localhost:3000/api';

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  return await res.json();
}

async function getVariantStock(variantId) {
  const res = await api('GET', '/product-variants/' + variantId);
  return res.data?.stock;
}

async function main() {
  console.log('=== QA TEST START ===\n');
  const bugs = [];

  // ========================================
  // QA1: BUAT PRODUK BARU DENGAN 3 VARIAN
  // ========================================
  console.log('--- QA1: Buat Produk Baru dengan 3 Varian ---');
  const cats = await api('GET', '/categories');
  const aksesorisCat = cats.data?.find(c => c.name === 'Aksesoris');

  const newProduct = await api('POST', '/products', {
    name: 'Snapback Cap', sku: 'SNP', categoryId: aksesorisCat.id,
    buyPrice: 50000, sellPrice: 120000, minStock: 3, isActive: true,
    variants: [
      { name: 'Black', sku: 'SNP-BLK', attributes: '{"color":"Black"}', buyPrice: 50000, sellPrice: 120000, stock: 0, minStock: 3, isActive: true },
      { name: 'White', sku: 'SNP-WHT', attributes: '{"color":"White"}', buyPrice: 50000, sellPrice: 120000, stock: 0, minStock: 3, isActive: true },
      { name: 'Navy', sku: 'SNP-NAV', attributes: '{"color":"Navy"}', buyPrice: 55000, sellPrice: 125000, stock: 0, minStock: 3, isActive: true },
    ]
  });

  if (newProduct.success) {
    console.log('  ✅ Produk dibuat:', newProduct.data.name, '- varian:', newProduct.data.variants?.length);
  } else {
    console.log('  ❌ Gagal:', newProduct.message);
    process.exit(1);
  }

  const vIds = newProduct.data.variants.map(v => ({ id: v.id, name: v.name }));

  // ========================================
  // QA2: PEMBELIAN DRAFT → APPROVED → RECEIVED
  // ========================================
  console.log('\n--- QA2: Pembelian Draft → Approved → Received ---');
  const sups = await api('GET', '/suppliers');
  const supplierId = sups.data?.[0]?.id;

  const stockBefore = {};
  for (const v of vIds) { stockBefore[v.id] = await getVariantStock(v.id); }
  console.log('  Stock AWAL:', vIds.map(v => v.name + '=' + stockBefore[v.id]).join(', '));

  // Create DRAFT
  const pDraft = await api('POST', '/purchases', {
    supplierId, date: '2026-06-07', status: 'DRAFT', notes: 'QA Test',
    items: [
      { variantId: vIds[0].id, qty: 10, buyPrice: 50000 },
      { variantId: vIds[1].id, qty: 10, buyPrice: 50000 },
      { variantId: vIds[2].id, qty: 10, buyPrice: 55000 },
    ]
  });
  const purchaseId = pDraft.data?.id;
  console.log('  Purchase DRAFT:', pDraft.success ? '✅ ' + pDraft.data.transNo : '❌ ' + pDraft.message);

  // Check stock after DRAFT
  const stockAfterDraft = {};
  for (const v of vIds) { stockAfterDraft[v.id] = await getVariantStock(v.id); }
  const draftOk = vIds.every(v => stockAfterDraft[v.id] === stockBefore[v.id]);
  console.log('  Stock after DRAFT:', draftOk ? '✅ TIDAK berubah - BENAR' : '❌ BERUBAH - BUG!');
  if (!draftOk) bugs.push('Stock berubah saat DRAFT purchase');

  // Change to APPROVED
  const pApproved = await api('PUT', '/purchases/' + purchaseId, { status: 'APPROVED' });
  console.log('  Purchase APPROVED:', pApproved.success ? '✅' : '❌ ' + pApproved.message);

  const stockAfterApproved = {};
  for (const v of vIds) { stockAfterApproved[v.id] = await getVariantStock(v.id); }
  const approvedOk = vIds.every(v => stockAfterApproved[v.id] === stockBefore[v.id]);
  console.log('  Stock after APPROVED:', approvedOk ? '✅ TIDAK berubah - BENAR' : '❌ BERUBAH - BUG!');
  if (!approvedOk) bugs.push('Stock berubah saat APPROVED purchase');

  // Change to RECEIVED
  const pReceived = await api('PUT', '/purchases/' + purchaseId, { status: 'RECEIVED' });
  console.log('  Purchase RECEIVED:', pReceived.success ? '✅' : '❌ ' + pReceived.message);

  const stockAfterReceived = {};
  for (const v of vIds) { stockAfterReceived[v.id] = await getVariantStock(v.id); }
  console.log('  Stock after RECEIVED:', vIds.map(v => v.name + '=' + stockAfterReceived[v.id]).join(', '));
  const receivedOk = vIds.every(v => stockAfterReceived[v.id] === stockBefore[v.id] + 10);
  console.log('  Stock NAMBAH +10 per variant:', receivedOk ? '✅ BENAR' : '❌ BUG!');
  if (!receivedOk) bugs.push('Stock tidak sesuai saat RECEIVED purchase');

  // ========================================
  // QA3: PENJUALAN DRAFT → PAID → COMPLETED
  // ========================================
  console.log('\n--- QA3: Penjualan Draft → Paid → Completed ---');
  const custs = await api('GET', '/customers');
  const customerId = custs.data?.[0]?.id;

  const stockBeforeSale = {};
  for (const v of vIds) { stockBeforeSale[v.id] = await getVariantStock(v.id); }
  console.log('  Stock AWAL:', vIds.map(v => v.name + '=' + stockBeforeSale[v.id]).join(', '));

  // Create DRAFT sale
  const sDraft = await api('POST', '/sales', {
    customerId, date: '2026-06-07', status: 'DRAFT',
    items: [
      { variantId: vIds[0].id, qty: 3, sellPrice: 120000 },
      { variantId: vIds[1].id, qty: 2, sellPrice: 120000 },
    ]
  });
  const saleId = sDraft.data?.id;
  console.log('  Sale DRAFT:', sDraft.success ? '✅ ' + sDraft.data.transNo : '❌ ' + sDraft.message);

  const stockAfterSaleDraft = {};
  for (const v of vIds) { stockAfterSaleDraft[v.id] = await getVariantStock(v.id); }
  const saleDraftOk = vIds.every(v => stockAfterSaleDraft[v.id] === stockBeforeSale[v.id]);
  console.log('  Stock after DRAFT sale:', saleDraftOk ? '✅ TIDAK berubah - BENAR' : '❌ BUG!');
  if (!saleDraftOk) bugs.push('Stock berubah saat DRAFT sale');

  // Change to PAID
  const sPaid = await api('PUT', '/sales/' + saleId, { status: 'PAID' });
  console.log('  Sale PAID:', sPaid.success ? '✅' : '❌ ' + sPaid.message);

  const stockAfterPaid = {};
  for (const v of vIds) { stockAfterPaid[v.id] = await getVariantStock(v.id); }
  const paidOk = vIds.every(v => stockAfterPaid[v.id] === stockBeforeSale[v.id]);
  console.log('  Stock after PAID:', paidOk ? '✅ TIDAK berubah - BENAR' : '❌ BUG!');
  if (!paidOk) bugs.push('Stock berubah saat PAID sale');

  // Change to COMPLETED
  const sCompleted = await api('PUT', '/sales/' + saleId, { status: 'COMPLETED' });
  console.log('  Sale COMPLETED:', sCompleted.success ? '✅' : '❌ ' + sCompleted.message);

  const stockAfterCompleted = {};
  for (const v of vIds) { stockAfterCompleted[v.id] = await getVariantStock(v.id); }
  console.log('  Stock after COMPLETED:', vIds.map(v => v.name + '=' + stockAfterCompleted[v.id]).join(', '));

  const expectedSale = {
    [vIds[0].id]: stockBeforeSale[vIds[0].id] - 3,
    [vIds[1].id]: stockBeforeSale[vIds[1].id] - 2,
    [vIds[2].id]: stockBeforeSale[vIds[2].id],
  };
  const completedOk = vIds.every(v => stockAfterCompleted[v.id] === expectedSale[v.id]);
  console.log('  Stock BERKURANG (Black:-3, White:-2):', completedOk ? '✅ BENAR' : '❌ BUG!');
  if (!completedOk) bugs.push('Stock tidak sesuai saat COMPLETED sale');

  // ========================================
  // QA4: CANCEL TRANSACTIONS
  // ========================================
  console.log('\n--- QA4: Cancel Transaksi ---');

  // 4a: Cancel COMPLETED sale
  console.log('  4a: Cancel COMPLETED sale (stock should reverse)');
  const sCancel = await api('PUT', '/sales/' + saleId, { status: 'CANCELLED' });
  console.log('  Sale CANCELLED:', sCancel.success ? '✅' : '❌ ' + sCancel.message);

  const stockAfterCancelSale = {};
  for (const v of vIds) { stockAfterCancelSale[v.id] = await getVariantStock(v.id); }
  console.log('  Stock after cancel sale:', vIds.map(v => v.name + '=' + stockAfterCancelSale[v.id]).join(', '));
  const cancelSaleOk = vIds.every(v => stockAfterCancelSale[v.id] === stockBeforeSale[v.id]);
  console.log('  Stock KEMBALI ke sebelum sale:', cancelSaleOk ? '✅ BENAR' : '❌ BUG!');
  if (!cancelSaleOk) bugs.push('Stock tidak kembali saat cancel COMPLETED sale');

  // 4b: Cancel RECEIVED purchase
  console.log('  4b: Cancel RECEIVED purchase (stock should reverse)');
  const pCancel = await api('PUT', '/purchases/' + purchaseId, { status: 'CANCELLED' });
  console.log('  Purchase CANCELLED:', pCancel.success ? '✅' : '❌ ' + pCancel.message);

  const stockAfterCancelPurchase = {};
  for (const v of vIds) { stockAfterCancelPurchase[v.id] = await getVariantStock(v.id); }
  console.log('  Stock after cancel purchase:', vIds.map(v => v.name + '=' + stockAfterCancelPurchase[v.id]).join(', '));
  const cancelPurchaseOk = vIds.every(v => stockAfterCancelPurchase[v.id] === stockBefore[v.id]);
  console.log('  Stock KEMBALI ke awal (0):', cancelPurchaseOk ? '✅ BENAR' : '❌ BUG!');
  if (!cancelPurchaseOk) bugs.push('Stock tidak kembali saat cancel RECEIVED purchase');

  // 4c: Delete DRAFT purchase
  console.log('  4c: Delete DRAFT purchase (stock should not change)');
  const draftP = await api('POST', '/purchases', {
    supplierId, date: '2026-06-07', status: 'DRAFT',
    items: [{ variantId: vIds[0].id, qty: 5, buyPrice: 50000 }]
  });
  if (draftP.success) {
    const beforeDel = await getVariantStock(vIds[0].id);
    const delRes = await api('DELETE', '/purchases/' + draftP.data.id);
    const afterDel = await getVariantStock(vIds[0].id);
    console.log('  Delete DRAFT:', delRes.success ? '✅ Deleted' : '❌ ' + delRes.message);
    console.log('  Stock unchanged:', beforeDel === afterDel ? '✅ BENAR' : '❌ BUG!');
    if (beforeDel !== afterDel) bugs.push('Stock berubah saat delete DRAFT purchase');
  }

  // 4d: Try delete non-DRAFT purchase
  console.log('  4d: Try delete non-DRAFT purchase (should fail)');
  const delNonDraft = await api('DELETE', '/purchases/' + purchaseId);
  console.log('  Reject delete non-DRAFT:', !delNonDraft.success ? '✅ BENAR (' + delNonDraft.message + ')' : '❌ BUG!');

  // 4e: Try change CANCELLED purchase
  console.log('  4e: Try change CANCELLED purchase (should fail)');
  const changeCancelled = await api('PUT', '/purchases/' + purchaseId, { status: 'APPROVED' });
  console.log('  Reject change CANCELLED:', !changeCancelled.success ? '✅ BENAR (' + changeCancelled.message + ')' : '❌ BUG!');

  // 4f: Try selling more than stock
  console.log('  4f: Try selling more than available stock');
  const overSell = await api('POST', '/sales', {
    customerId, date: '2026-06-07', status: 'COMPLETED',
    items: [{ variantId: vIds[0].id, qty: 99999, sellPrice: 120000 }]
  });
  console.log('  Reject overstock sale:', !overSell.success ? '✅ BENAR (' + overSell.message?.substring(0, 60) + ')' : '❌ BUG! Sale went through!');

  // ========================================
  // QA5: ACTIVITY LOG
  // ========================================
  console.log('\n--- QA5: Activity Log ---');
  const logs = await api('GET', '/activity-logs');
  if (logs.success) {
    console.log('  Total activity logs:', logs.data?.length);
    if (logs.data?.length > 0) {
      logs.data.slice(0, 5).forEach(l => {
        console.log('  -', l.action, l.entity, '|', (l.details || '').substring(0, 50));
      });
      console.log('  ✅ Activity logs ada');
    } else {
      console.log('  ⚠️  No activity logs yet - need integration in purchase/sale APIs');
      bugs.push('Activity log tidak tercatat untuk purchase/sale actions');
    }
  } else {
    console.log('  ❌ Gagal ambil activity logs:', logs.message);
    bugs.push('Gagal ambil activity logs');
  }

  // ========================================
  // QA6: LAPORAN STOK PER VARIANT
  // ========================================
  console.log('\n--- QA6: Laporan Stok ---');
  const reports = await api('GET', '/reports?type=stock');
  if (reports.success && reports.data) {
    console.log('  ✅ Stock report available');
    if (reports.data.items) {
      console.log('  Items in report:', reports.data.items.length);
      reports.data.items.slice(0, 5).forEach(i => {
        console.log('  -', i.productName || i.name || i.sku, 'stock:', i.stock ?? i.totalStock);
      });
    } else if (reports.data.variants) {
      console.log('  Variants in report:', reports.data.variants.length);
    }
  } else {
    console.log('  ⚠️  Stock report issue:', reports.message || 'No data');
  }

  // Also check warehouse stock
  console.log('\n--- QA6b: Warehouse Stock ---');
  const warehouses = await api('GET', '/warehouses');
  if (warehouses.success && warehouses.data?.length > 0) {
    console.log('  ✅ Warehouses available:', warehouses.data.length);
    for (const wh of warehouses.data) {
      const whDetail = await api('GET', '/warehouses/' + wh.id);
      if (whDetail.success && whDetail.data?.stocks) {
        console.log('  ' + wh.name + ': ' + whDetail.data.stocks.length + ' stock entries');
        whDetail.data.stocks.slice(0, 3).forEach(s => {
          console.log('    - variant:', s.variant?.name, 'stock:', s.stock);
        });
      }
    }
  } else {
    console.log('  ⚠️  No warehouse data');
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n========================================');
  console.log('QA SUMMARY');
  console.log('========================================');
  if (bugs.length === 0) {
    console.log('✅ ALL TESTS PASSED - No bugs found!');
  } else {
    console.log('❌ BUGS FOUND (' + bugs.length + '):');
    bugs.forEach((b, i) => console.log('  ' + (i + 1) + '. ' + b));
  }
  console.log('========================================');
}

main().catch(e => console.error('FATAL:', e));
