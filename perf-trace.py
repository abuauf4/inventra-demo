#!/usr/bin/env python3
"""Inventra Performance Trace - Python edition"""

import json, time, urllib.request, sys
from urllib.error import URLError

BASE = "http://127.0.0.1:3000"

def fmt(ms):
    if ms < 100: return f"\033[32m{ms:.1f}ms\033[0m"
    if ms < 500: return f"\033[33m{ms:.1f}ms\033[0m"
    return f"\033[31m{ms:.1f}ms\033[0m"

def rating(ms):
    if ms < 100: return "\033[32mEXCELLENT\033[0m"
    if ms < 300: return "\033[32mGOOD\033[0m"
    if ms < 500: return "\033[33mOK\033[0m"
    if ms < 1000: return "\033[33mSLOW\033[0m"
    return "\033[31mVERY SLOW\033[0m"

def size_rating(size):
    if size < 10000: return "\033[32mSMALL\033[0m"
    if size < 50000: return "\033[33mMEDIUM\033[0m"
    if size < 200000: return "\033[33mLARGE\033[0m"
    return "\033[31mVERY LARGE\033[0m"

def measure(url, label=""):
    start = time.perf_counter()
    try:
        req = urllib.request.Request(f"{BASE}{url}")
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            ms = (time.perf_counter() - start) * 1000
            data = json.loads(body)
            size = len(body)
            return {"ms": ms, "size": size, "status": resp.status, "data": data, "error": None}
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        return {"ms": ms, "size": 0, "status": 0, "data": None, "error": str(e)}

print(f"""
\033[1m\033[36m═══════════════════════════════════════════════════════════════════\033[0m
\033[1m\033[36m  INVENTRA PERFORMANCE TRACE\033[0m
\033[1m\033[36m═══════════════════════════════════════════════════════════════════\033[0m
\033[2m  {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} | Target: {BASE}\033[0m
""")

# ━━━ SECTION 1: COLD API ━━━
print("\033[1m━━━ 1. API RESPONSE TIME (Cold Request) ━━━\033[0m\n")

endpoints = [
    ("Products", "/api/products"),
    ("Customers", "/api/customers"),
    ("Suppliers", "/api/suppliers"),
    ("Sales", "/api/sales?page=1&limit=50"),
    ("Purchases", "/api/purchases?page=1&limit=50"),
    ("Dashboard", "/api/dashboard"),
]

cold = {}
for label, url in endpoints:
    r = measure(url)
    cold[label] = r
    print(f"  \033[1m{label:12s}\033[0m {fmt(r['ms'])}  \033[2m({r['size']:,} bytes | HTTP {r['status']})\033[0m  {rating(r['ms'])}")
    if r['error']:
        print(f"    \033[31mError: {r['error'][:80]}\033[0m")

# ━━━ SECTION 2: WARM / REPEAT ━━━
print(f"\n\033[1m━━━ 2. API RESPONSE TIME (Warm / 3x Repeat) ━━━\033[0m\n")

warm_labels = ["Products", "Customers", "Suppliers", "Sales", "Purchases"]
warm_urls = {l: u for l, u in endpoints}

for label in warm_labels:
    url = warm_urls[label]
    r1 = measure(url)
    r2 = measure(url)
    r3 = measure(url)
    improvement = ((r1['ms'] - r2['ms']) / r1['ms'] * 100) if r1['ms'] > 0 else 0
    rec_count = "?"
    if r1['data']:
        d = r1['data']
        if 'data' in d and isinstance(d['data'], list):
            rec_count = len(d['data'])
        elif 'pagination' in d:
            rec_count = d['pagination'].get('total', '?')
    print(f"  \033[1m{label:12s}\033[0m 1st: {fmt(r1['ms'])} → 2nd: {fmt(r2['ms'])} → 3rd: {fmt(r3['ms'])}  \033[2m(improvement: {improvement:.1f}% | {r1['size']:,}B | records: {rec_count})\033[0m")

# ━━━ SECTION 3: PAGINATION ━━━
print(f"\n\033[1m━━━ 3. PAGINATION PERFORMANCE ━━━\033[0m\n")

for label in ["Sales", "Purchases"]:
    base_url = f"/api/{label.lower()}"
    r1 = measure(f"{base_url}?page=1&limit=50")
    r2 = measure(f"{base_url}?page=2&limit=50")
    r3 = measure(f"{base_url}?page=1&limit=50")
    
    pag1 = r1['data'].get('pagination', {}) if r1['data'] else {}
    
    print(f"  \033[1m{label:12s}\033[0m")
    print(f"    Page 1:        {fmt(r1['ms'])}  \033[2m(total: {pag1.get('total', 'N/A')} | pages: {pag1.get('totalPages', 'N/A')})\033[0m")
    print(f"    Page 2:        {fmt(r2['ms'])}  \033[2m({r2['size']:,}B)\033[0m")
    print(f"    Page 1 repeat: {fmt(r3['ms'])}  \033[2m(cache test)\033[0m")
    print(f"    Payload size:  {r1['size']:,} bytes")

# ━━━ SECTION 4: PAGE LOAD ━━━
print(f"\n\033[1m━━━ 4. INITIAL PAGE LOAD (HTML Shell) ━━━\033[0m\n")

start = time.perf_counter()
try:
    with urllib.request.urlopen(BASE, timeout=30) as resp:
        html = resp.read().decode()
        page_ms = (time.perf_counter() - start) * 1000
        print(f"  \033[1mApp Shell    \033[0m {fmt(page_ms)}  \033[2m({len(html):,} bytes)\033[0m  {rating(page_ms)}")
except Exception as e:
    page_ms = 0
    print(f"  \033[31mFailed: {e}\033[0m")

# ━━━ SECTION 5: MENU SWITCH SIM ━━━
print(f"\n\033[1m━━━ 5. MENU SWITCH SIMULATION ━━━\033[0m")
print(f"\033[2m  Dashboard → Products → Sales → Products → Customers → Products\033[0m\n")

menu_steps = [
    ("→ Dashboard", "/api/dashboard"),
    ("→ Products", "/api/products"),
    ("→ Sales", "/api/sales?page=1&limit=50"),
    ("→ Products (back)", "/api/products"),
    ("→ Customers", "/api/customers"),
    ("→ Products (back)", "/api/products"),
]

total_menu = 0
menu_results = []
for label, url in menu_steps:
    r = measure(url)
    total_menu += r['ms']
    menu_results.append((label, r['ms']))
    print(f"  {label:24s} {fmt(r['ms'])}  {rating(r['ms'])}")

print(f"\n  \033[1mTotal sequential:\033[0m {fmt(total_menu)}")

# ━━━ SECTION 6: RAPID FIRE ━━━
print(f"\n\033[1m━━━ 6. RAPID FIRE (10x Products) ━━━\033[0m\n")

rapid = []
for i in range(10):
    r = measure("/api/products")
    rapid.append(r['ms'])
    print(f"  #{i+1:2d}: {fmt(r['ms'])}  ", end="")
    if (i + 1) % 5 == 0: print()

avg_rapid = sum(rapid) / len(rapid)
print(f"\n  Avg: {fmt(avg_rapid)} | Min: {fmt(min(rapid))} | Max: {fmt(max(rapid))}")

# ━━━ SECTION 7: PAYLOAD ANALYSIS ━━━
print(f"\n\033[1m━━━ 7. PAYLOAD SIZE ANALYSIS ━━━\033[0m\n")

for label, url in endpoints:
    r = cold[label]
    size = r['size']
    size_kb = size / 1024
    
    records = "?"
    per_rec = "?"
    if r['data']:
        d = r['data']
        if 'data' in d and isinstance(d['data'], list):
            records = len(d['data'])
        elif 'data' in d and isinstance(d['data'], dict) and 'data' in d['data']:
            records = len(d['data']['data'])
        elif 'pagination' in d:
            records = d['pagination'].get('total', '?')
    
    if isinstance(records, int) and records > 0:
        per_rec = size // records
    
    print(f"  \033[1m{label:12s}\033[0m {size_kb:8.1f} KB  \033[2m({str(records):>4s} records | ~{str(per_rec):>5s}B/rec)\033[0m  {size_rating(size)}")

# ━━━ SECTION 8: DETAILED DATA INSPECTION ━━━
print(f"\n\033[1m━━━ 8. DATA DETAIL INSPECTION ━━━\033[0m\n")

for label in ["Products", "Customers", "Suppliers", "Sales", "Purchases"]:
    r = cold[label]
    if not r['data']:
        print(f"  \033[1m{label:12s}\033[0m \033[31mNO DATA\033[0m")
        continue
    
    d = r['data']
    
    if label == "Sales":
        items = d.get('data', [])
        total_items = sum(len(s.get('items', [])) for s in items)
        statuses = {}
        for s in items:
            st = s.get('status', '?')
            statuses[st] = statuses.get(st, 0) + 1
        print(f"  \033[1m{label:12s}\033[0m {len(items)} sales, {total_items} line items, statuses: {statuses}")
        
    elif label == "Purchases":
        items = d.get('data', [])
        total_items = sum(len(p.get('items', [])) for p in items)
        print(f"  \033[1m{label:12s}\033[0m {len(items)} purchases, {total_items} line items")
        
    elif label == "Products":
        items = d.get('data', [])
        with_cat = sum(1 for p in items if p.get('category'))
        with_sup = sum(1 for p in items if p.get('supplier'))
        print(f"  \033[1m{label:12s}\033[0m {len(items)} products, {with_cat} with category, {with_sup} with supplier")
        
    elif label == "Customers":
        items = d.get('data', [])
        with_sales = sum(1 for c in items if c.get('_count', {}).get('sales', 0) > 0)
        print(f"  \033[1m{label:12s}\033[0m {len(items)} customers, {with_sales} with sales")
        
    elif label == "Suppliers":
        items = d.get('data', [])
        print(f"  \033[1m{label:12s}\033[0m {len(items)} suppliers")

# ━━━ SUMMARY ━━━
print(f"""
\033[1m\033[36m═══════════════════════════════════════════════════════════════════\033[0m
\033[1m\033[36m  SUMMARY\033[0m
\033[1m\033[36m═══════════════════════════════════════════════════════════════════\033[0m
""")

print("  \033[1mAPI Response Times (Server → Supabase → Response):\033[0m")
for label, url in endpoints:
    r = cold[label]
    print(f"    {label:12s} {fmt(r['ms'])}  {rating(r['ms'])}")

avg_cold = sum(cold[l]['ms'] for l in cold) / len(cold)

print(f"""
  \033[1mAverage cold API response:\033[0m {fmt(avg_cold)}  {rating(avg_cold)}
  \033[1mApp shell load:\033[0m           {fmt(page_ms) if page_ms else 'N/A'}  {rating(page_ms) if page_ms else ''}
  \033[1mTotal menu switch sim:\033[0m    {fmt(total_menu)}

  \033[1mReact Query Client-Side Impact:\033[0m
  \033[2m• Without RQ: Every menu switch = full network request (times above)\033[0m
  \033[2m• With RQ staleTime=60s: Menu switch within 60s = INSTANT (<5ms memory)\033[0m
  \033[2m• With RQ after stale: Background refetch, stale data shown instantly\033[0m
  \033[2m• With RQ after gcTime=5min: Cache GC'd, need fresh network fetch\033[0m

  \033[1mMenu Switch Comparison:\033[0m
    Without RQ:       {fmt(total_menu)} (6 API calls × network roundtrip)
    With RQ (1st):    ~{fmt(total_menu)} (same, cold start)
    With RQ (2nd+):   \033[32m<5ms\033[0m (memory cache hit, zero network)
""")

# Bottlenecks
print("  \033[1mBottlenecks:\033[0m")
found = False
for label, url in endpoints:
    r = cold[label]
    if r['ms'] > 500:
        print(f"    \033[31m⚠ {label}: {r['ms']:.1f}ms response time\033[0m")
        found = True
    if r['size'] > 50000:
        print(f"    \033[33m⚠ {label}: {r['size']/1024:.1f}KB payload\033[0m")
        found = True

if not found:
    print("    \033[32mNo critical bottlenecks detected\033[0m")

# Performance targets
print(f"""
  \033[1mPerformance Targets:\033[0m
    Menu switch:     Target <500ms  | Current (no cache): {fmt(total_menu)}
    First load:      Target <1s     | Current: {fmt(avg_cold)}
    Cached switch:   Target <5ms    | With RQ: \033[32m<5ms (memory)\033[0m
    API pagination:  Target <200ms  | Sales: {fmt(cold['Sales']['ms'])} | Purchases: {fmt(cold['Purchases']['ms'])}
""")
