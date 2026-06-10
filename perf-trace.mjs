#!/usr/bin/env node
/**
 * Inventra Performance Trace
 * Measures: API response time, React Query cache behavior, component timing
 */

const BASE = 'http://127.0.0.1:3000';

// Colors for terminal
const C = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  bold: '\x1b[1m', reset: '\x1b[0m', dim: '\x1b[2m',
};

function fmt(ms) {
  if (ms < 100) return `${C.green}${ms.toFixed(1)}ms${C.reset}`;
  if (ms < 500) return `${C.yellow}${ms.toFixed(1)}ms${C.reset}`;
  return `${C.red}${ms.toFixed(1)}ms${C.reset}`;
}

function rating(ms) {
  if (ms < 100) return `${C.green}EXCELLENT${C.reset}`;
  if (ms < 300) return `${C.green}GOOD${C.reset}`;
  if (ms < 500) return `${C.yellow}OK${C.reset}`;
  if (ms < 1000) return `${C.yellow}SLOW${C.reset}`;
  return `${C.red}VERY SLOW${C.reset}`;
}

async function measureAPI(label, url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);

  const start = performance.now();
  try {
    const res = await fetch(`${BASE}${url}`, opts);
    const end = performance.now();
    const ms = end - start;
    const data = await res.json();
    const size = JSON.stringify(data).length;
    return { label, url, ms, status: res.status, size, data, error: null };
  } catch (e) {
    const end = performance.now();
    return { label, url, ms: end - start, status: 0, size: 0, data: null, error: e.message };
  }
}

async function measureCacheHit(label, url) {
  // First request = cache miss (server-side, but measures network)
  const r1 = await measureAPI(`${label} (1st)`, url);
  // Second request immediately = should be served from React Query cache on client
  // Since we're testing server-side, this measures if server has any caching
  const r2 = await measureAPI(`${label} (2nd)`, url);
  // Third request
  const r3 = await measureAPI(`${label} (3rd)`, url);

  return {
    label,
    first: r1.ms,
    second: r2.ms,
    third: r3.ms,
    improvement: ((r1.ms - r2.ms) / r1.ms * 100).toFixed(1),
    size: r1.size,
    recordCount: r1.data?.data?.length || r1.data?.length || r1.data?.pagination?.total || 'N/A',
  };
}

async function measurePaginatedEndpoint(label, url) {
  // Page 1
  const r1 = await measureAPI(`${label} page=1`, `${url}?page=1&limit=50`);
  // Page 2
  const r2 = await measureAPI(`${label} page=2`, `${url}?page=2&limit=50`);
  // Repeat page 1 (cache test)
  const r3 = await measureAPI(`${label} page=1 repeat`, `${url}?page=1&limit=50`);

  const pagination1 = r1.data?.pagination || {};
  const pagination2 = r2.data?.pagination || {};

  return {
    label,
    page1: { ms: r1.ms, count: pagination1.total || 'N/A', pages: pagination1.totalPages || 'N/A' },
    page2: { ms: r2.ms, count: pagination2.total || 'N/A', pages: pagination2.totalPages || 'N/A' },
    page1Repeat: r3.ms,
    payloadSize: r1.size,
  };
}

async function measureComponentRender(html, label) {
  // Parse the HTML to find the component section and measure payload size
  const totalSize = html.length;
  const hasSpinner = html.includes('spinner') || html.includes('loading');
  const hasData = html.includes('table') || html.includes('card');
  return { label, htmlSize: totalSize, hasSpinner, hasData };
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan}  INVENTRA PERFORMANCE TRACE${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.dim}  ${new Date().toISOString()} | Target: ${BASE}${C.reset}\n`);

  // ═══════════════════════════════════════════════════
  // SECTION 1: API RESPONSE TIME (Cold)
  // ═══════════════════════════════════════════════════
  console.log(`${C.bold}━━━ 1. API RESPONSE TIME (Cold Request) ━━━${C.reset}\n`);

  const coldEndpoints = [
    { label: 'Products', url: '/api/products' },
    { label: 'Customers', url: '/api/customers' },
    { label: 'Suppliers', url: '/api/suppliers' },
    { label: 'Sales', url: '/api/sales?page=1&limit=50' },
    { label: 'Purchases', url: '/api/purchases?page=1&limit=50' },
    { label: 'Dashboard', url: '/api/dashboard' },
  ];

  const coldResults = [];
  for (const ep of coldEndpoints) {
    const r = await measureAPI(ep.label, ep.url);
    coldResults.push(r);
    console.log(`  ${C.bold}${ep.label.padEnd(12)}${C.reset} ${fmt(r.ms)}  ${C.dim}(${r.size.toLocaleString()} bytes | status ${r.status})${C.reset}  ${rating(r.ms)}`);
  }

  // ═══════════════════════════════════════════════════
  // SECTION 2: API RESPONSE TIME (Warm / Repeat)
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}━━━ 2. API RESPONSE TIME (Warm / Repeated) ━━━${C.reset}\n`);

  const warmEndpoints = [
    { label: 'Products', url: '/api/products' },
    { label: 'Customers', url: '/api/customers' },
    { label: 'Suppliers', url: '/api/suppliers' },
    { label: 'Sales', url: '/api/sales?page=1&limit=50' },
    { label: 'Purchases', url: '/api/purchases?page=1&limit=50' },
  ];

  const warmResults = [];
  for (const ep of warmEndpoints) {
    const result = await measureCacheHit(ep.label, ep.url);
    warmResults.push(result);
    console.log(`  ${C.bold}${ep.label.padEnd(12)}${C.reset} 1st: ${fmt(result.first)} → 2nd: ${fmt(result.second)} → 3rd: ${fmt(result.third)}  ${C.dim}(improvement: ${result.improvement}% | ${result.size.toLocaleString()}B | records: ${result.recordCount})${C.reset}`);
  }

  // ═══════════════════════════════════════════════════
  // SECTION 3: PAGINATION PERFORMANCE
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}━━━ 3. PAGINATION PERFORMANCE ━━━${C.reset}\n`);

  const salesPag = await measurePaginatedEndpoint('Sales', '/api/sales');
  const purchPag = await measurePaginatedEndpoint('Purchases', '/api/purchases');

  for (const pag of [salesPag, purchPag]) {
    console.log(`  ${C.bold}${pag.label.padEnd(12)}${C.reset}`);
    console.log(`    Page 1:        ${fmt(pag.page1.ms)}  ${C.dim}(total records: ${pag.page1.count} | pages: ${pag.page1.pages})${C.reset}`);
    console.log(`    Page 2:        ${fmt(pag.page2.ms)}  ${C.dim}(total records: ${pag.page2.count} | pages: ${pag.page2.pages})${C.reset}`);
    console.log(`    Page 1 repeat: ${fmt(pag.page1Repeat)}  ${C.dim}(should be faster if DB caches)${C.reset}`);
    console.log(`    Payload size:  ${pag.payloadSize.toLocaleString()} bytes`);
  }

  // ═══════════════════════════════════════════════════
  // SECTION 4: PAGE LOAD TIME (Full HTML)
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}━━━ 4. INITIAL PAGE LOAD (SSR Shell) ━━━${C.reset}\n`);

  const pageStart = performance.now();
  const pageRes = await fetch(BASE);
  const pageEnd = performance.now();
  const pageHtml = await pageRes.text();
  const pageMs = pageEnd - pageStart;

  console.log(`  ${C.bold}App Shell${C.reset}     ${fmt(pageMs)}  ${C.dim}(${pageHtml.length.toLocaleString()} bytes)${C.reset}  ${rating(pageMs)}`);
  console.log(`  ${C.dim}Note: This is the HTML shell. Client-side data fetch + React Query cache happens after hydration.${C.reset}`);

  // ═══════════════════════════════════════════════════
  // SECTION 5: SEQUENTIAL SIMULATION (Menu Switch)
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}━━━ 5. MENU SWITCH SIMULATION (Sequential API calls) ━━━${C.reset}`);
  console.log(`${C.dim}  Simulates: Dashboard → Products → Sales → Products → Customers → Products${C.reset}\n`);

  const menuSequence = [
    { label: '→ Dashboard', url: '/api/dashboard' },
    { label: '→ Products', url: '/api/products' },
    { label: '→ Sales', url: '/api/sales?page=1&limit=50' },
    { label: '→ Products (back)', url: '/api/products' },
    { label: '→ Customers', url: '/api/customers' },
    { label: '→ Products (back)', url: '/api/products' },
  ];

  const menuTimes = [];
  for (const step of menuSequence) {
    const r = await measureAPI(step.label, step.url);
    menuTimes.push({ ...r, step: step.label });
    console.log(`  ${step.label.padEnd(22)} ${fmt(r.ms)}  ${rating(r.ms)}`);
  }

  const totalTime = menuTimes.reduce((sum, r) => sum + r.ms, 0);
  console.log(`\n  ${C.bold}Total sequential:${C.reset} ${fmt(totalTime)}`);

  // ═══════════════════════════════════════════════════
  // SECTION 6: REACT QUERY CACHE ANALYSIS
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}━━━ 6. REACT QUERY CACHE ANALYSIS ━━━${C.reset}\n`);

  console.log(`  ${C.dim}React Query cache works CLIENT-SIDE (browser). Server-side repeated requests${C.reset}`);
  console.log(`  ${C.dim}measure DB/Network caching only. Real RQ cache benefit = zero network request.${C.reset}\n`);

  // Measure same endpoint 10x rapidly
  console.log(`  ${C.bold}Rapid-fire test (10x Products):${C.reset}`);
  const rapidTimes = [];
  for (let i = 0; i < 10; i++) {
    const r = await measureAPI(`  #${i + 1}`, '/api/products');
    rapidTimes.push(r.ms);
    process.stdout.write(`  #${(i + 1).toString().padStart(2)}: ${fmt(r.ms)}  `);
    if ((i + 1) % 5 === 0) process.stdout.write('\n');
  }

  const avgRapid = rapidTimes.reduce((a, b) => a + b, 0) / rapidTimes.length;
  const minRapid = Math.min(...rapidTimes);
  const maxRapid = Math.max(...rapidTimes);
  console.log(`\n  Avg: ${fmt(avgRapid)} | Min: ${fmt(minRapid)} | Max: ${fmt(maxRapid)}`);

  // ═══════════════════════════════════════════════════
  // SECTION 7: DATA SIZE ANALYSIS
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}━━━ 7. PAYLOAD SIZE ANALYSIS ━━━${C.reset}\n`);

  for (const r of coldResults) {
    const sizeKB = (r.size / 1024).toFixed(1);
    const records = r.data?.data?.length || r.data?.length || r.data?.pagination?.total || '?';
    const perRecord = records !== '?' ? (r.size / records).toFixed(0) : '?';
    let sizeRating = '';
    if (r.size < 10000) sizeRating = `${C.green}SMALL${C.reset}`;
    else if (r.size < 50000) sizeRating = `${C.yellow}MEDIUM${C.reset}`;
    else if (r.size < 200000) sizeRating = `${C.yellow}LARGE${C.reset}`;
    else sizeRating = `${C.red}VERY LARGE${C.reset}`;

    console.log(`  ${C.bold}${r.label.padEnd(12)}${C.reset} ${sizeKB.padStart(8)} KB  ${C.dim}(${String(records).padStart(4)} records | ~${String(perRecord).padStart(5)}B/record)${C.reset}  ${sizeRating}`);
  }

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan}  SUMMARY${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════════${C.reset}\n`);

  const avgCold = coldResults.reduce((s, r) => s + r.ms, 0) / coldResults.length;
  const avgWarm = warmResults.reduce((s, r) => s + r.third, 0) / warmResults.length;

  console.log(`  Avg cold API response:    ${fmt(avgCold)}  ${rating(avgCold)}`);
  console.log(`  Avg warm API response:    ${fmt(avgWarm)}  ${rating(avgWarm)}`);
  console.log(`  App shell load:           ${fmt(pageMs)}  ${rating(pageMs)}`);
  console.log(`  Total menu switch sim:    ${fmt(totalTime)}`);

  console.log(`\n  ${C.bold}React Query Impact:${C.reset}`);
  console.log(`  ${C.dim}• Client-side: RQ cache eliminates network requests for staleTime (60s)${C.reset}`);
  console.log(`  ${C.dim}• Menu switch within 60s = INSTANT (<5ms, from memory cache)${C.reset}`);
  console.log(`  ${C.dim}• After 60s staleTime = background refetch, shows stale data first${C.reset}`);
  console.log(`  ${C.dim}• After 5min gcTime = cache garbage collected, full refetch needed${C.reset}`);

  // Identify bottlenecks
  console.log(`\n  ${C.bold}Bottlenecks:${C.reset}`);
  const slowEndpoints = coldResults.filter(r => r.ms > 500);
  const largeEndpoints = coldResults.filter(r => r.size > 50000);
  if (slowEndpoints.length === 0 && largeEndpoints.length === 0) {
    console.log(`  ${C.green}No critical bottlenecks detected!${C.reset}`);
  } else {
    for (const s of slowEndpoints) {
      console.log(`  ${C.red}⚠ ${s.label}: ${s.ms.toFixed(1)}ms response time${C.reset}`);
    }
    for (const l of largeEndpoints) {
      console.log(`  ${C.yellow}⚠ ${l.label}: ${(l.size / 1024).toFixed(1)}KB payload${C.reset}`);
    }
  }

  console.log(`\n`);
}

main().catch(console.error);
