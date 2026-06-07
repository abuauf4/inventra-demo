// Full QA test via HTTP API - but runs sequentially with delays
const BASE = 'http://localhost:3001/api';

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(BASE + path, opts);
    return await res.json();
  } catch (e) {
    console.error('FETCH ERROR on', method, path, ':', e.message);
    return { success: false, message: 'Fetch failed: ' + e.message };
  }
}

async function getVariantStock(variantId) {
  const res = await api('GET', '/product-variants/' + variantId);
  return res.data?.stock;
}

async function main() {
  console.log('=== QA TEST START (HTTP) ===\n');
  const bugs = [];

  // QA1: BUAT PRODUK BARU DENGAN 3 VARIAN
  console.log('--- QA1: Buat Produk Baru dengan 3 Varian ---');
  const cats = await api('GET', '/categories');
  if (!cats.success) { console.log('❌ Cannot reach API'); return; }
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
    return;
  }

  const vIds = newProduct.data.variants.map(v => ({ id: v.id, name: v.name }));

  // QA2: PEMBELIAN DRAFT → APPROVED → RECEIVED
  console.log('\n--- QA2: Pembelian Draft → Approved → Received ---');
  const sups = await api('GET', '/suppliers');
  const supplierId = sups.data?.[0]?.id;

  const stockBefore = {};
  for (const v of vIds) { stockBefore[v.id] = await getVariantStock(v.id); }
  console.log('  Stock AWAL:', vIds.map(v => v.name + '=' + stockBefore[v.id]).join(', '));

  // Create DRAFT
  const pDraft = await api('POST', '/purchases', {
    supplierId, date: '2026-06-07', status: 'DRAFT', notes: 'QA Test',
    items: vIds.map(v => ({ variantId: v.id, qty: 10, buyPrice: 50000 }))
  });
  const purchaseId = pDraft.data?.id;
  console.log('  Purchase DRAFT:', pDraft.success ? '✅ ' + pDraft.data.transNo : '❌ ' + pDraft.message);

  // Check stock after DRAFT
  const stockAfterDraft = {};
  for (const v of vIds) { stockAfterDraft[v.id] = await getVariantStock(v.id); }
  const draftOk = vIds.every(v => stockAfterDraft[v.id] === stockBefore[v.id]);
  console.log('  Stock after DRAFT:', draftOk ? '✅ TIDAK berubah - BENAR' : '❌ BERUBAH - BUG!');
  if (!draftOk) bugs.push('Stock berubah saat DRAFT purchase');

  // APPROVED
  const pApproved = await api('PUT', '/purchases/' + purchaseId, { status: 'APPROVED' });
  console.log('  Purchase APPROVED:', pApproved.success ? '✅' : '❌ ' + pApproved.message);
  const stockAfterApproved = {};
  for (const v of vIds) { stockAfterApproved[v.id] = await getVariantStock(v.id); }
  const approvedOk = vIds.every(v => stockAfterApproved[v.id] === stockBefore[v.id]);
  console.log('  Stock after APPROVED:', approvedOk ? '✅ TIDAK berubah - BENAR' : '❌ BUG!');
  if (!approvedOk) bugs.push('Stock berubah saat APPROVED purchase');

  // RECEIVED
  const pReceived = await api('PUT', '/purchases/' + purchaseId, { status: 'RECEIVED' });
  console.log('  Purchase RECEIVED:', pReceived.success ? '✅' : '❌ ' + pReceived.message);
  const stockAfterReceived = {};
  for (const v of vIds) { stockAfterReceived[v.id] = await getVariantStock(v.id); }
  console.log('  Stock after RECEIVED:', vIds.map(v => v.name + '=' + stockAfterReceived[v.id]).join(', '));
  const receivedOk = vIds.every(v => stockAfterReceived[v.id] === stockBefore[v.id] + 10);
  console.log('  Stock NAMBAH +10:', receivedOk ? '✅ BENAR' : '❌ BUG!');
  if (!receivedOk) bugs.push('Stock tidak sesuai saat RECEIVED purchase');

  // QA3: PENJUALAN DRAFT → PAID → COMPLETED
  console.log('\n--- QA3: Penjualan Draft → Paid → Completed ---');
  const custs = await api('GET', '/customers');
  const customerId = custs.data?.[0]?.id;
  const stockBeforeSale = {};
  for (const v of vIds) { stockBeforeSale[v.id] = await getVariantStock(v.id); }
  console.log('  Stock AWAL:', vIds.map(v => v.name + '=' + stockBeforeSale[v.id]).join(', '));

  const sDraft = await api('POST', '/sales', {
    customerId, date: '2026-06-07', status: 'DRAFT',
    items: [{ variantId: vIds[0].id, qty: 3, sellPrice: 120000 }, { variantId: vIds[1].id, qty: 2, sellPrice: 120000 }]
  });
  const saleId = sDraft.data?.id;
  console.log('  Sale DRAFT:', sDraft.success ? '✅ ' + sDraft.data.transNo : '❌ ' + sDraft.message);
  const stockAfterSaleDraft = {};
  for (const v of vIds) { stockAfterSaleDraft[v.id] = await getVariantStock(v.id); }
  const saleDraftOk = vIds.every(v => stockAfterSaleDraft[v.id] === stockBeforeSale[v.id]);
  console.log('  Stock after DRAFT sale:', saleDraftOk ? '✅ TIDAK berubah' : '❌ BUG!');
  if (!saleDraftOk) bugs.push('Stock berubah saat DRAFT sale');

  const sPaid = await api('PUT', '/sales/' + saleId, { status: 'PAID' });
  console.log('  Sale PAID:', sPaid.success ? '✅' : '❌');
  const stockAfterPaidSale = {};
  for (const v of vIds) { stockAfterPaidSale[v.id] = await getVariantStock(v.id); }
  const paidOk = vIds.every(v => stockAfterPaidSale[v.id] === stockBeforeSale[v.id]);
  console.log('  Stock after PAID:', paidOk ? '✅ TIDAK berubah' : '❌ BUG!');
  if (!paidOk) bugs.push('Stock berubah saat PAID sale');

  const sCompleted = await api('PUT', '/sales/' + saleId, { status: 'COMPLETED' });
  console.log('  Sale COMPLETED:', sCompleted.success ? '✅' : '❌ ' + sCompleted.message);
  const stockAfterCompleted = {};
  for (const v of vIds) { stockAfterCompleted[v.id] = await getVariantStock(v.id); }
  console.log('  Stock after COMPLETED:', vIds.map(v => v.name + '=' + stockAfterCompleted[v.id]).join(', '));
  const expectedSale = { [vIds[0].id]: stockBeforeSale[vIds[0].id] - 3, [vIds[1].id]: stockBeforeSale[vIds[1].id] - 2, [vIds[2].id]: stockBeforeSale[vIds[2].id] };
  const completedOk = vIds.every(v => stockAfterCompleted[v.id] === expectedSale[v.id]);
  console.log('  Stock BERKURANG:', completedOk ? '✅ BENAR' : '❌ BUG!');
  if (!completedOk) bugs.push('Stock tidak sesuai saat COMPLETED sale');

  // QA4: CANCEL
  console.log('\n--- QA4: Cancel Transaksi ---');
  const sCancel = await api('PUT', '/sales/' + saleId, { status: 'CANCELLED' });
  console.log('  Sale CANCELLED:', sCancel.success ? '✅' : '❌');
  const stockAfterCancelSale = {};
  for (const v of vIds) { stockAfterCancelSale[v.id] = await getVariantStock(v.id); }
  const cancelSaleOk = vIds.every(v => stockAfterCancelSale[v.id] === stockBeforeSale[v.id]);
  console.log('  Stock KEMBALI:', cancelSaleOk ? '✅ BENAR' : '❌ BUG!');
  if (!cancelSaleOk) bugs.push('Stock tidak kembali saat cancel sale');

  const pCancel = await api('PUT', '/purchases/' + purchaseId, { status: 'CANCELLED' });
  console.log('  Purchase CANCELLED:', pCancel.success ? '✅' : '❌');
  const stockAfterCancelPurchase = {};
  for (const v of vIds) { stockAfterCancelPurchase[v.id] = await getVariantStock(v.id); }
  const cancelPurchaseOk = vIds.every(v => stockAfterCancelPurchase[v.id] === stockBefore[v.id]);
  console.log('  Stock KEMBALI ke 0:', cancelPurchaseOk ? '✅ BENAR' : '❌ BUG!');
  if (!cancelPurchaseOk) bugs.push('Stock tidak kembali saat cancel purchase');

  // QA4d: Overstock sale
  console.log('  Overstock test:');
  const overSell = await api('POST', '/sales', {
    customerId, date: '2026-06-07', status: 'COMPLETED',
    items: [{ variantId: vIds[0].id, qty: 99999, sellPrice: 120000 }]
  });
  console.log('  Reject overstock:', !overSell.success ? '✅ BENAR' : '❌ BUG!');

  // QA4e: Delete DRAFT only
  const draftP = await api('POST', '/purchases', {
    supplierId, date: '2026-06-07', status: 'DRAFT',
    items: [{ variantId: vIds[0].id, qty: 5, buyPrice: 50000 }]
  });
  if (draftP.success) {
    const delRes = await api('DELETE', '/purchases/' + draftP.data.id);
    console.log('  Delete DRAFT:', delRes.success ? '✅' : '❌');
  }
  const delNonDraft = await api('DELETE', '/purchases/' + purchaseId);
  console.log('  Reject delete non-DRAFT:', !delNonDraft.success ? '✅ BENAR' : '❌ BUG!');

  // QA5: ACTIVITY LOG
  console.log('\n--- QA5: Activity Log ---');
  const logs = await api('GET', '/activity-logs');
  if (logs.success) {
    console.log('  Total logs:', logs.data?.length);
    if (logs.data?.length > 0) {
      logs.data.slice(0, 8).forEach(l => console.log('  -', l.action, l.entity, '|', (l.details || '').substring(0, 50)));
      console.log('  ✅ Activity logs recorded');
    } else {
      console.log('  ⚠️  No activity logs');
      bugs.push('Activity log tidak tercatat');
    }
  }

  // QA6: WAREHOUSE STOCK
  console.log('\n--- QA6: Warehouse Stock Sync ---');
  const whs = await api('GET', '/warehouses');
  if (whs.success && whs.data?.length > 0) {
    for (const wh of whs.data.slice(0, 1)) {
      const whDetail = await api('GET', '/warehouses/' + wh.id);
      if (whDetail.success && whDetail.data?.stocks) {
        console.log('  ' + wh.name + ':', whDetail.data.stocks.length, 'stock entries');
        // Check if any of our test variants have warehouse stock
        const testStocks = whDetail.data.stocks.filter(s => vIds.some(v => v.id === s.productVariantId));
        testStocks.forEach(s => console.log('    -', s.variant?.name, 'wh_stock:', s.stock));
        if (testStocks.length > 0) {
          console.log('  ✅ Warehouse stock entries created for test variants');
        }
      }
    }
  }

  // SUMMARY
  console.log('\n========================================');
  console.log('QA SUMMARY');
  console.log('========================================');
  if (bugs.length === 0) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ BUGS FOUND (' + bugs.length + '):');
    bugs.forEach((b, i) => console.log('  ' + (i + 1) + '. ' + b));
  }
  console.log('========================================');
}

main().catch(e => console.error('FATAL:', e));
