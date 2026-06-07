#!/usr/bin/env python3
"""
NAUKA INVENTRA QA TEST SUITE
8 Test Scenarios for Stock Logic Verification
"""
import requests
import json
import sys

BASE = "http://localhost:3000/api"
PASS = 0
FAIL = 0
BUGS = []

def qassert(test_name, expected, actual):
    global PASS, FAIL, BUGS
    if expected == actual:
        print(f"  ✅ PASS: {test_name}")
        PASS += 1
    else:
        print(f"  ❌ FAIL: {test_name} (expected={expected}, actual={actual})")
        FAIL += 1
        BUGS.append(f"{test_name}: expected={expected}, actual={actual}")

def qassert_gt(test_name, expected_min, actual):
    global PASS, FAIL, BUGS
    if actual > expected_min:
        print(f"  ✅ PASS: {test_name} ({actual} > {expected_min})")
        PASS += 1
    else:
        print(f"  ❌ FAIL: {test_name} ({actual} <= {expected_min})")
        FAIL += 1
        BUGS.append(f"{test_name}: {actual} <= {expected_min}")

def get_json(path):
    r = requests.get(f"{BASE}{path}", timeout=10)
    return r.json()

def post_json(path, data):
    r = requests.post(f"{BASE}{path}", json=data, timeout=10)
    return r.json()

def put_json(path, data):
    r = requests.put(f"{BASE}{path}", json=data, timeout=10)
    return r.json()

def delete_json(path):
    r = requests.delete(f"{BASE}{path}", timeout=10)
    return r.json()

def get_variant_stock(variant_id):
    """Get current stock for a variant from products API"""
    data = get_json("/products")
    for p in data.get("data", []):
        for v in p.get("variants", []):
            if v["id"] == variant_id:
                return v["stock"]
    return None

def get_warehouse_stock(variant_id, warehouse_id):
    """Get warehouse stock from DB directly"""
    import sqlite3
    conn = sqlite3.connect("/home/z/my-project/db/custom.db")
    c = conn.cursor()
    c.execute("SELECT stock FROM WarehouseStock WHERE productVariantId=? AND warehouseId=?", (variant_id, warehouse_id))
    row = c.fetchone()
    conn.close()
    return row[0] if row else None

def get_mutation_count():
    import sqlite3
    conn = sqlite3.connect("/home/z/my-project/db/custom.db")
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM StockMutation")
    count = c.fetchone()[0]
    conn.close()
    return count

def get_activity_log_count():
    import sqlite3
    conn = sqlite3.connect("/home/z/my-project/db/custom.db")
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM ActivityLog")
    count = c.fetchone()[0]
    conn.close()
    return count

def get_all_variant_stocks(product_id):
    """Get all variant stocks for a product from DB"""
    import sqlite3
    conn = sqlite3.connect("/home/z/my-project/db/custom.db")
    c = conn.cursor()
    c.execute("SELECT id, name, sku, stock FROM ProductVariant WHERE productId=?", (product_id,))
    rows = c.fetchall()
    conn.close()
    return {row[2]: {"id": row[0], "name": row[1], "stock": row[3]} for row in rows}

# ============================================================
print("=" * 60)
print("  NAUKA INVENTRA QA TEST SUITE")
print("=" * 60)

# --- SETUP: Get reference data ---
print("\n📦 Setup: Getting reference data...")
categories = get_json("/categories")["data"]
suppliers = get_json("/suppliers")["data"]
customers = get_json("/customers")["data"]
warehouses = get_json("/warehouses")["data"]

cat_aksesoris = next((c["id"] for c in categories if c["name"] == "Aksesoris"), categories[0]["id"])
cat_tshirt = next((c["id"] for c in categories if c["name"] == "T-Shirt"), categories[0]["id"])
supplier1 = suppliers[0]["id"]
customer1 = customers[0]["id"]
warehouse1 = next((w["id"] for w in warehouses if w["code"] == "GDG-01"), warehouses[0]["id"])
warehouse2 = next((w["id"] for w in warehouses if w["code"] == "TOKO-01"), warehouses[1]["id"])

print(f"  Categories: {len(categories)}, Suppliers: {len(suppliers)}, Customers: {len(customers)}, Warehouses: {len(warehouses)}")
print(f"  Warehouse1 (GDG-01): {warehouse1}")
print(f"  Warehouse2 (TOKO-01): {warehouse2}")

# Record baseline
baseline_mutations = get_mutation_count()
baseline_activities = get_activity_log_count()
print(f"  Baseline mutations: {baseline_mutations}, activities: {baseline_activities}")

# ============================================================
# QA TEST 1: Create product with 3 variants
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST 1: Create product with 3 variants")
print("=" * 60)

resp = post_json("/products", {
    "name": "Canvas Tote Bag",
    "sku": "CTB-QA",
    "categoryId": cat_aksesoris,
    "supplierId": supplier1,
    "buyPrice": 45000,
    "sellPrice": 95000,
    "minStock": 5,
    "variants": [
        {"name": "Natural S", "sku": "CTB-NAT-S-QA", "attributes": '{"color":"Natural","size":"S"}', "buyPrice": 45000, "sellPrice": 95000, "stock": 0, "minStock": 5},
        {"name": "Natural M", "sku": "CTB-NAT-M-QA", "attributes": '{"color":"Natural","size":"M"}', "buyPrice": 45000, "sellPrice": 95000, "stock": 0, "minStock": 5},
        {"name": "Black One Size", "sku": "CTB-BLK-OS-QA", "attributes": '{"color":"Black","size":"One Size"}', "buyPrice": 50000, "sellPrice": 110000, "stock": 0, "minStock": 5},
    ]
})

qassert("Product created successfully", True, resp.get("success"))
product_id = resp.get("data", {}).get("id", "")
variants = resp.get("data", {}).get("variants", [])
qassert("Product has 3 variants", 3, len(variants))
qassert("Product name correct", "Canvas Tote Bag", resp.get("data", {}).get("name"))

v1_id = variants[0]["id"] if len(variants) > 0 else ""
v2_id = variants[1]["id"] if len(variants) > 1 else ""
v3_id = variants[2]["id"] if len(variants) > 2 else ""
print(f"  V1: {variants[0]['name']} ({variants[0]['sku']}) id={v1_id[:12]}...")
print(f"  V2: {variants[1]['name']} ({variants[1]['sku']}) id={v2_id[:12]}...")
print(f"  V3: {variants[2]['name']} ({variants[2]['sku']}) id={v3_id[:12]}...")

# Initial stock should be 0
qassert("V1 initial stock = 0", 0, variants[0]["stock"])
qassert("V2 initial stock = 0", 0, variants[1]["stock"])
qassert("V3 initial stock = 0", 0, variants[2]["stock"])

# Activity log should be created
after_create_activities = get_activity_log_count()
qassert("Activity log created for product creation", True, after_create_activities > baseline_activities)

# ============================================================
# QA TEST 2: Purchase flow Draft → Approved → Received
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST 2: Purchase flow Draft → Approved → Received")
print("=" * 60)

# Get existing product variant for purchase (OVT-BLK-M has stock 25)
existing_variants = get_all_variant_stocks(next(p["id"] for p in get_json("/products")["data"] if p["sku"] == "OVT"))
ovt_blkm = existing_variants.get("OVT-BLK-M", {})
ovt_blkm_id = ovt_blkm.get("id", v1_id)
ovt_blkm_initial_stock = ovt_blkm.get("stock", 0)
print(f"  OVT-BLK-M initial stock: {ovt_blkm_initial_stock}")

# Create purchase as DRAFT
resp = post_json("/purchases", {
    "supplierId": supplier1,
    "date": "2026-06-07",
    "notes": "QA Test - Purchase Draft",
    "status": "DRAFT",
    "items": [
        {"variantId": v1_id, "qty": 10, "buyPrice": 45000},
        {"variantId": v2_id, "qty": 5, "buyPrice": 45000},
    ]
})

qassert("Purchase DRAFT created", True, resp.get("success"))
purchase_id = resp.get("data", {}).get("id", "")
purchase_transno = resp.get("data", {}).get("transNo", "")
qassert("Purchase status is DRAFT", "DRAFT", resp.get("data", {}).get("status"))
print(f"  Purchase: {purchase_transno} (id={purchase_id[:12]}...)")

# QA TEST 3: Verify stock does NOT change at DRAFT
print("\n--- QA TEST 3: Stock should NOT change at DRAFT ---")
v1_stock_after_draft = get_variant_stock(v1_id)
v2_stock_after_draft = get_variant_stock(v2_id)
qassert("V1 stock unchanged after DRAFT", 0, v1_stock_after_draft)
qassert("V2 stock unchanged after DRAFT", 0, v2_stock_after_draft)

mutations_after_draft = get_mutation_count()
qassert("No stock mutation at DRAFT", baseline_mutations, mutations_after_draft)

# Change to APPROVED
print("\n--- Transition: DRAFT → APPROVED ---")
resp = put_json(f"/purchases/{purchase_id}", {"status": "APPROVED"})
qassert("Purchase APPROVED", True, resp.get("success"))
qassert("Status is APPROVED", "APPROVED", resp.get("data", {}).get("status"))

# Stock should NOT change at APPROVED
v1_stock_after_approved = get_variant_stock(v1_id)
v2_stock_after_approved = get_variant_stock(v2_id)
qassert("V1 stock unchanged after APPROVED", 0, v1_stock_after_approved)
qassert("V2 stock unchanged after APPROVED", 0, v2_stock_after_approved)

mutations_after_approved = get_mutation_count()
qassert("No stock mutation at APPROVED", baseline_mutations, mutations_after_approved)

# Change to RECEIVED
print("\n--- Transition: APPROVED → RECEIVED ---")
resp = put_json(f"/purchases/{purchase_id}", {"status": "RECEIVED"})
qassert("Purchase RECEIVED", True, resp.get("success"))
qassert("Status is RECEIVED", "RECEIVED", resp.get("data", {}).get("status"))

# Stock SHOULD increase at RECEIVED
v1_stock_after_received = get_variant_stock(v1_id)
v2_stock_after_received = get_variant_stock(v2_id)
qassert("V1 stock +10 after RECEIVED (was 0)", 10, v1_stock_after_received)
qassert("V2 stock +5 after RECEIVED (was 0)", 5, v2_stock_after_received)

# Verify warehouse stock
ws1 = get_warehouse_stock(v1_id, warehouse1)
ws2 = get_warehouse_stock(v2_id, warehouse1)
print(f"  Warehouse stock V1 (GDG-01): {ws1}")
print(f"  Warehouse stock V2 (GDG-01): {ws2}")
qassert("Warehouse V1 stock = 10", 10, ws1)
qassert("Warehouse V2 stock = 5", 5, ws2)

# Verify stock mutations created
mutations_after_received = get_mutation_count()
qassert("2 stock mutations created at RECEIVED", baseline_mutations + 2, mutations_after_received)

# Activity log should have entries
activities_after_received = get_activity_log_count()
qassert_gt("Activity logs created for purchase flow", baseline_activities + 3, activities_after_received)

# ============================================================
# QA TEST 4: Sales flow Draft → Paid → Completed
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST 4: Sales flow Draft → Paid → Completed")
print("=" * 60)

# Create sale as DRAFT
resp = post_json("/sales", {
    "customerId": customer1,
    "date": "2026-06-07",
    "notes": "QA Test - Sale Draft",
    "status": "DRAFT",
    "items": [
        {"variantId": v1_id, "qty": 3, "sellPrice": 95000},
    ]
})

qassert("Sale DRAFT created", True, resp.get("success"))
sale_id = resp.get("data", {}).get("id", "")
sale_transno = resp.get("data", {}).get("transNo", "")
qassert("Sale status is DRAFT", "DRAFT", resp.get("data", {}).get("status"))
print(f"  Sale: {sale_transno} (id={sale_id[:12]}...)")

# Stock should NOT change at DRAFT
v1_stock_after_sale_draft = get_variant_stock(v1_id)
qassert("V1 stock unchanged after Sale DRAFT", 10, v1_stock_after_sale_draft)

# Change to PAID
print("\n--- Transition: DRAFT → PAID ---")
resp = put_json(f"/sales/{sale_id}", {"status": "PAID"})
qassert("Sale PAID", True, resp.get("success"))
qassert("Status is PAID", "PAID", resp.get("data", {}).get("status"))

# Stock should NOT change at PAID
v1_stock_after_paid = get_variant_stock(v1_id)
qassert("V1 stock unchanged after PAID", 10, v1_stock_after_paid)

# QA TEST 5: Stock decreases at COMPLETED
print("\n--- QA TEST 5: Stock decreases at COMPLETED ---")
resp = put_json(f"/sales/{sale_id}", {"status": "COMPLETED"})
qassert("Sale COMPLETED", True, resp.get("success"))
qassert("Status is COMPLETED", "COMPLETED", resp.get("data", {}).get("status"))

v1_stock_after_completed = get_variant_stock(v1_id)
qassert("V1 stock -3 after COMPLETED (was 10)", 7, v1_stock_after_completed)

# Verify warehouse stock decreased
ws1_after_sale = get_warehouse_stock(v1_id, warehouse1)
qassert("Warehouse V1 stock = 7 after sale", 7, ws1_after_sale)

# Verify OUT mutation created
mutations_after_sale = get_mutation_count()
qassert("OUT mutation created at COMPLETED", mutations_after_received + 1, mutations_after_sale)

# ============================================================
# QA TEST 6: Cancel/delete transactions - stock reversal
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST 6: Cancel/delete - stock reversal")
print("=" * 60)

# 6a: Cancel a COMPLETED sale - stock should reverse
print("\n--- 6a: Cancel COMPLETED sale ---")
v1_before_cancel = get_variant_stock(v1_id)
print(f"  V1 stock before cancel: {v1_before_cancel}")

resp = put_json(f"/sales/{sale_id}", {"status": "CANCELLED"})
qassert("Sale CANCELLED", True, resp.get("success"))
qassert("Status is CANCELLED", "CANCELLED", resp.get("data", {}).get("status"))

v1_after_cancel = get_variant_stock(v1_id)
qassert("V1 stock +3 after sale CANCELLED (was 7)", 10, v1_after_cancel)

# Warehouse stock should also reverse
ws1_after_cancel = get_warehouse_stock(v1_id, warehouse1)
qassert("Warehouse V1 stock = 10 after cancel", 10, ws1_after_cancel)

# ADJUSTMENT mutation should be created
mutations_after_cancel = get_mutation_count()
qassert("ADJUSTMENT mutation created for sale cancel", mutations_after_sale + 1, mutations_after_cancel)

# 6b: Cancel a RECEIVED purchase - stock should reverse
print("\n--- 6b: Cancel RECEIVED purchase ---")
v1_before_pcancel = get_variant_stock(v1_id)
v2_before_pcancel = get_variant_stock(v2_id)
print(f"  V1 stock before purchase cancel: {v1_before_pcancel}")
print(f"  V2 stock before purchase cancel: {v2_before_pcancel}")

resp = put_json(f"/purchases/{purchase_id}", {"status": "CANCELLED"})
qassert("Purchase CANCELLED", True, resp.get("success"))
qassert("Purchase status is CANCELLED", "CANCELLED", resp.get("data", {}).get("status"))

v1_after_pcancel = get_variant_stock(v1_id)
v2_after_pcancel = get_variant_stock(v2_id)
qassert("V1 stock -10 after purchase CANCELLED (was 10)", 0, v1_after_pcancel)
qassert("V2 stock -5 after purchase CANCELLED (was 5)", 0, v2_after_pcancel)

ws1_after_pcancel = get_warehouse_stock(v1_id, warehouse1)
qassert("Warehouse V1 stock = 0 after purchase cancel", 0, ws1_after_pcancel)

# 6c: Delete a DRAFT purchase - no stock change
print("\n--- 6c: Create & delete DRAFT purchase ---")
resp = post_json("/purchases", {
    "supplierId": supplier1,
    "date": "2026-06-07",
    "status": "DRAFT",
    "items": [{"variantId": v1_id, "qty": 99, "buyPrice": 45000}]
})
draft_purchase_id = resp.get("data", {}).get("id", "")
mutations_before_delete = get_mutation_count()

resp = delete_json(f"/purchases/{draft_purchase_id}")
qassert("DRAFT purchase deleted", True, resp.get("success"))

v1_after_delete = get_variant_stock(v1_id)
qassert("V1 stock unchanged after DRAFT delete", 0, v1_after_delete)

mutations_after_delete = get_mutation_count()
qassert("No mutation created by DRAFT delete", mutations_before_delete, mutations_after_delete)

# 6d: Try to delete non-DRAFT purchase (should fail)
print("\n--- 6d: Cannot delete non-DRAFT purchase ---")
resp = post_json("/purchases", {
    "supplierId": supplier1,
    "date": "2026-06-07",
    "status": "RECEIVED",
    "items": [{"variantId": v1_id, "qty": 2, "buyPrice": 45000}]
})
received_purchase_id = resp.get("data", {}).get("id", "")
resp = delete_json(f"/purchases/{received_purchase_id}")
qassert("Cannot delete RECEIVED purchase", False, resp.get("success"))

# Clean up: cancel this received purchase to restore stock
put_json(f"/purchases/{received_purchase_id}", {"status": "CANCELLED"})

# ============================================================
# QA TEST 7: Activity Log for all important actions
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST 7: Activity Log verification")
print("=" * 60)

resp = get_json("/activity-logs")
logs = resp.get("data", [])
qassert("Activity logs exist", True, len(logs) > 0)

# Check for specific action types
actions = [log["action"] for log in logs]
entities = [log["entity"] for log in logs]
print(f"  Total logs: {len(logs)}")
print(f"  Actions: {set(actions)}")
print(f"  Entities: {set(entities)}")

qassert("CREATE action exists", True, "CREATE" in actions)
qassert("STATUS_CHANGE action exists", True, "STATUS_CHANGE" in actions)
qassert("DELETE action exists", True, "DELETE" in actions)
qassert("Purchase entity exists", True, "Purchase" in entities)
qassert("Sale entity exists", True, "Sale" in entities)

# Check latest log entries
print("\n  Recent activity logs:")
for log in logs[:5]:
    print(f"    [{log['action']}] {log['entity']}: {log['details'][:80]}...")

# ============================================================
# QA TEST 8: Stock reports per variant and per warehouse
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST 8: Stock reports")
print("=" * 60)

# 8a: Stock mutations report
resp = get_json("/stock-mutations")
mutations = resp.get("data", [])
qassert("Stock mutations API works", True, resp.get("success"))
qassert("Stock mutations returned", True, len(mutations) > 0)
print(f"  Total mutations: {len(mutations)}")

mutation_types = [m["type"] for m in mutations]
print(f"  Mutation types: {set(mutation_types)}")
qassert("IN mutations exist", True, "IN" in mutation_types)
qassert("OUT mutations exist", True, "OUT" in mutation_types)
qassert("ADJUSTMENT mutations exist", True, "ADJUSTMENT" in mutation_types)

# 8b: Reports API
resp = get_json("/reports?type=stock")
qassert("Reports API works", True, resp.get("success"))
print(f"  Reports response keys: {list(resp.get('data', {}).keys()) if isinstance(resp.get('data'), dict) else type(resp.get('data'))}")

# 8c: Warehouse stock per variant
print("\n  Warehouse stock per variant (direct DB check):")
import sqlite3
conn = sqlite3.connect("/home/z/my-project/db/custom.db")
c = conn.cursor()
c.execute("""
    SELECT w.name as warehouse, p.name as product, v.name as variant, v.sku, ws.stock, v.stock as total_stock
    FROM WarehouseStock ws
    JOIN Warehouse w ON ws.warehouseId = w.id
    JOIN ProductVariant v ON ws.productVariantId = v.id
    JOIN Product p ON v.productId = p.id
    ORDER BY p.name, v.name, w.name
    LIMIT 15
""")
for row in c.fetchall():
    print(f"    {row[0]} > {row[1]} > {row[2]} ({row[3]}): warehouse={row[4]}, variant_total={row[5]}")

# Check consistency: sum of warehouse stocks should equal variant stock
c.execute("""
    SELECT v.sku, v.stock as variant_stock, COALESCE(SUM(ws.stock), 0) as warehouse_sum
    FROM ProductVariant v
    LEFT JOIN WarehouseStock ws ON ws.productVariantId = v.id
    GROUP BY v.id
    HAVING v.stock != COALESCE(SUM(ws.stock), 0)
""")
inconsistent = c.fetchall()
if inconsistent:
    print("\n  ⚠️  STOCK INCONSISTENCY DETECTED:")
    for row in inconsistent:
        print(f"    SKU {row[0]}: variant_stock={row[1]}, warehouse_sum={row[2]}")
    BUGS.append(f"Stock inconsistency: {len(inconsistent)} variants have mismatched variant/warehouse stock")
    FAIL += 1
else:
    print("\n  ✅ All variant stocks match warehouse stock sums")
    PASS += 1

conn.close()

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("  QA TEST SUMMARY")
print("=" * 60)
print(f"  ✅ Passed: {PASS}")
print(f"  ❌ Failed: {FAIL}")
if BUGS:
    print(f"\n  🐛 BUGS FOUND ({len(BUGS)}):")
    for bug in BUGS:
        print(f"    - {bug}")
else:
    print("\n  🎉 ALL TESTS PASSED!")

print("=" * 60)
sys.exit(FAIL)
