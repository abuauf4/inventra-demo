#!/bin/bash
# Inventra Performance Trace - curl-based for accurate measurements

BASE="http://127.0.0.1:3000"
GRN='\033[32m'; RED='\033[31m'; YLW='\033[33m'; CYN='\033[36m'; BLD='\033[1m'; DIM='\033[2m'; RST='\033[0m'

fmt() {
  local ms=$1
  if (( $(echo "$ms < 100" | bc -l) )); then echo "${GRN}${ms}ms${RST}";
  elif (( $(echo "$ms < 500" | bc -l) )); then echo "${YLW}${ms}ms${RST}";
  else echo "${RED}${ms}ms${RST}"; fi
}

rating() {
  local ms=$1
  if (( $(echo "$ms < 100" | bc -l) )); then echo "${GRN}EXCELLENT${RST}";
  elif (( $(echo "$ms < 300" | bc -l) )); then echo "${GRN}GOOD${RST}";
  elif (( $(echo "$ms < 500" | bc -l) )); then echo "${YLW}OK${RST}";
  elif (( $(echo "$ms < 1000" | bc -l) )); then echo "${YLW}SLOW${RST}";
  else echo "${RED}VERY SLOW${RST}"; fi
}

measure() {
  local label=$1 url=$2
  local result=$(curl -w "\n%{time_total}\n%{size_download}\n%{http_code}" -s "$BASE$url" 2>/dev/null)
  local body=$(echo "$result" | head -n -3)
  local time_total=$(echo "$result" | tail -3 | head -1)
  local size_download=$(echo "$result" | tail -2 | head -1)
  local http_code=$(echo "$result" | tail -1)
  local ms=$(echo "$time_total * 1000" | bc -l | cut -c1-6)
  echo "$ms|$size_download|$http_code"
}

echo ""
echo -e "${BLD}${CYN}═══════════════════════════════════════════════════════════════════${RST}"
echo -e "${BLD}${CYN}  INVENTRA PERFORMANCE TRACE${RST}"
echo -e "${BLD}${CYN}═══════════════════════════════════════════════════════════════════${RST}"
echo -e "${DIM}  $(date -u +%Y-%m-%dT%H:%M:%SZ) | Target: $BASE${RST}"
echo ""

# ═══════════════════════════════════════════════════
# SECTION 1: COLD API RESPONSE
# ═══════════════════════════════════════════════════
echo -e "${BLD}━━━ 1. API RESPONSE TIME (Cold Request) ━━━${RST}"
echo ""

declare -A cold_times cold_sizes cold_codes
endpoints=("Products:/api/products" "Customers:/api/customers" "Suppliers:/api/suppliers" "Sales:/api/sales?page=1&limit=50" "Purchases:/api/purchases?page=1&limit=50" "Dashboard:/api/dashboard")

for ep in "${endpoints[@]}"; do
  label="${ep%%:*}"
  url="${ep#*:}"
  result=$(measure "$label" "$url")
  ms=$(echo "$result" | cut -d'|' -f1)
  size=$(echo "$result" | cut -d'|' -f2)
  code=$(echo "$result" | cut -d'|' -f3)
  cold_times[$label]=$ms
  cold_sizes[$label]=$size
  cold_codes[$label]=$code
  printf "  ${BLD}%-12s${RST} %s  ${DIM}(%s bytes | HTTP %s)${RST}  %s\n" "$label" "$(fmt $ms)" "$size" "$code" "$(rating $ms)"
done

# ═══════════════════════════════════════════════════
# SECTION 2: WARM API RESPONSE (3x repeat)
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}━━━ 2. API RESPONSE TIME (Warm / 3x Repeat) ━━━${RST}"
echo ""

warm_endpoints=("Products:/api/products" "Customers:/api/customers" "Suppliers:/api/suppliers" "Sales:/api/sales?page=1&limit=50" "Purchases:/api/purchases?page=1&limit=50")

for ep in "${warm_endpoints[@]}"; do
  label="${ep%%:*}"
  url="${ep#*:}"
  
  r1=$(measure "$label 1st" "$url"); ms1=$(echo "$r1" | cut -d'|' -f1); sz1=$(echo "$r1" | cut -d'|' -f2)
  r2=$(measure "$label 2nd" "$url"); ms2=$(echo "$r2" | cut -d'|' -f1)
  r3=$(measure "$label 3rd" "$url"); ms3=$(echo "$r3" | cut -d'|' -f1)
  
  printf "  ${BLD}%-12s${RST} 1st: %s → 2nd: %s → 3rd: %s  ${DIM}(%sB)${RST}\n" "$label" "$(fmt $ms1)" "$(fmt $ms2)" "$(fmt $ms3)" "$sz1"
done

# ═══════════════════════════════════════════════════
# SECTION 3: PAGINATION PERFORMANCE
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}━━━ 3. PAGINATION PERFORMANCE ━━━${RST}"
echo ""

for pag_ep in "Sales:/api/sales" "Purchases:/api/purchases"; do
  label="${pag_ep%%:*}"
  url="${pag_ep#*:}"
  
  r1=$(measure "$label p1" "${url}?page=1&limit=50"); ms1=$(echo "$r1" | cut -d'|' -f1); sz1=$(echo "$r1" | cut -d'|' -f2)
  r2=$(measure "$label p2" "${url}?page=2&limit=50"); ms2=$(echo "$r2" | cut -d'|' -f1); sz2=$(echo "$r2" | cut -d'|' -f2)
  r3=$(measure "$label p1r" "${url}?page=1&limit=50"); ms3=$(echo "$r3" | cut -d'|' -f1)
  
  # Get pagination metadata
  body1=$(curl -s "$BASE${url}?page=1&limit=50" 2>/dev/null)
  total=$(echo "$body1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('pagination',{}).get('total','N/A'))" 2>/dev/null || echo "N/A")
  pages=$(echo "$body1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('pagination',{}).get('totalPages','N/A'))" 2>/dev/null || echo "N/A")
  
  printf "  ${BLD}%-12s${RST}\n" "$label"
  printf "    Page 1:        %s  ${DIM}(total: %s | pages: %s)${RST}\n" "$(fmt $ms1)" "$total" "$pages"
  printf "    Page 2:        %s  ${DIM}(%sB)${RST}\n" "$(fmt $ms2)" "$sz2"
  printf "    Page 1 repeat: %s  ${DIM}(cache test)${RST}\n" "$(fmt $ms3)"
  printf "    Payload size:  %s bytes\n" "$sz1"
done

# ═══════════════════════════════════════════════════
# SECTION 4: INITIAL PAGE LOAD
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}━━━ 4. INITIAL PAGE LOAD (HTML Shell) ━━━${RST}"
echo ""

page_result=$(curl -w "\n%{time_total}\n%{size_download}" -s "$BASE/" 2>/dev/null)
page_ms=$(echo "$page_result" | tail -2 | head -1 | awk '{print $1 * 1000}' | cut -c1-6)
page_size=$(echo "$page_result" | tail -1)

printf "  ${BLD}App Shell${RST}     %s  ${DIM}(%s bytes)${RST}  %s\n" "$(fmt $page_ms)" "$page_size" "$(rating $page_ms)"

# ═══════════════════════════════════════════════════
# SECTION 5: MENU SWITCH SIMULATION
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}━━━ 5. MENU SWITCH SIMULATION ━━━${RST}"
echo -e "${DIM}  Dashboard → Products → Sales → Products → Customers → Products${RST}"
echo ""

menu_seq=("→ Dashboard:/api/dashboard" "→ Products:/api/products" "→ Sales:/api/sales?page=1&limit=50" "→ Products (back):/api/products" "→ Customers:/api/customers" "→ Products (back):/api/products")

total_menu=0
for step in "${menu_seq[@]}"; do
  label="${step%%:*}"
  url="${step#*:}"
  result=$(measure "$label" "$url")
  ms=$(echo "$result" | cut -d'|' -f1)
  total_menu=$(echo "$total_menu + $ms" | bc -l)
  printf "  %-24s %s  %s\n" "$label" "$(fmt $ms)" "$(rating $ms)"
done

echo ""
printf "  ${BLD}Total sequential:${RST} %s\n" "$(fmt $total_menu)"

# ═══════════════════════════════════════════════════
# SECTION 6: RAPID FIRE (10x)
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}━━━ 6. RAPID FIRE (10x Products) ━━━${RST}"
echo ""

rapid_min=99999; rapid_max=0; rapid_sum=0
for i in $(seq 1 10); do
  result=$(measure "rapid #$i" "/api/products")
  ms=$(echo "$result" | cut -d'|' -f1)
  rapid_sum=$(echo "$rapid_sum + $ms" | bc -l)
  is_min=$(echo "$ms < $rapid_min" | bc -l)
  is_max=$(echo "$ms > $rapid_max" | bc -l)
  [ "$is_min" = "1" ] && rapid_min=$ms
  [ "$is_max" = "1" ] && rapid_max=$ms
  printf "  #%2d: %s  " "$i" "$(fmt $ms)"
  [ $((i % 5)) -eq 0 ] && echo ""
done

rapid_avg=$(echo "scale=1; $rapid_sum / 10" | bc -l)
echo ""
printf "  Avg: %s | Min: %s | Max: %s\n" "$(fmt $rapid_avg)" "$(fmt $rapid_min)" "$(fmt $rapid_max)"

# ═══════════════════════════════════════════════════
# SECTION 7: PAYLOAD SIZE ANALYSIS  
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}━━━ 7. PAYLOAD SIZE ANALYSIS ━━━${RST}"
echo ""

for ep in "${endpoints[@]}"; do
  label="${ep%%:*}"
  url="${ep#*:}"
  size=${cold_sizes[$label]}
  ms=${cold_times[$label]}
  
  size_kb=$(echo "scale=1; $size / 1024" | bc -l)
  
  # Get record count
  body=$(curl -s "$BASE$url" 2>/dev/null)
  records=$(echo "$body" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  if 'data' in d:
    if isinstance(d['data'], list):
      print(len(d['data']))
    elif isinstance(d['data'], dict) and 'data' in d['data']:
      print(len(d['data']['data']))
    else:
      print('?')
  elif 'pagination' in d:
    print(d['pagination'].get('total','?'))
  else:
    print('?')
except: print('?')
" 2>/dev/null)
  
  per_record="?"; 
  if [ "$records" != "?" ] && [ "$records" -gt 0 ] 2>/dev/null; then
    per_record=$((size / records))
  fi
  
  if [ "$size" -lt 10000 ] 2>/dev/null; then size_rating="${GRN}SMALL${RST}"
  elif [ "$size" -lt 50000 ] 2>/dev/null; then size_rating="${YLW}MEDIUM${RST}"
  elif [ "$size" -lt 200000 ] 2>/dev/null; then size_rating="${YLW}LARGE${RST}"
  else size_rating="${RED}VERY LARGE${RST}"; fi
  
  printf "  ${BLD}%-12s${RST} %7s KB  ${DIM}(%4s records | ~%5sB/rec)${RST}  %s\n" "$label" "$size_kb" "$records" "$per_record" "$size_rating"
done

# ═══════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════
echo ""
echo -e "${BLD}${CYN}═══════════════════════════════════════════════════════════════════${RST}"
echo -e "${BLD}${CYN}  SUMMARY${RST}"
echo -e "${BLD}${CYN}═══════════════════════════════════════════════════════════════════${RST}"
echo ""

echo -e "  ${BLD}API Response Times (Server → Supabase → Response):${RST}"
for ep in "${endpoints[@]}"; do
  label="${ep%%:*}"
  ms=${cold_times[$label]}
  printf "    %-12s %s  %s\n" "$label" "$(fmt $ms)" "$(rating $ms)"
done

echo ""
echo -e "  ${BLD}React Query Client-Side Impact:${RST}"
echo -e "  ${DIM}• Without RQ: Every menu switch = network request (times above)${RST}"
echo -e "  ${DIM}• With RQ staleTime=60s: Menu switch within 60s = 0ms (memory cache)${RST}"
echo -e "  ${DIM}• With RQ after stale: Background refetch, stale data shown instantly${RST}"
echo -e "  ${DIM}• With RQ after gcTime=5min: Cache GC'd, need fresh fetch${RST}"

echo ""
echo -e "  ${BLD}Menu Switch Comparison:${RST}"
echo -e "    Without RQ: $(fmt $total_menu) (6 API calls × network roundtrip)"
# With RQ, first visit = network, subsequent = 0ms cached
# Products visited 3x, Dashboard 1x, Sales 1x, Customers 1x
echo -e "    With RQ (1st visit): ~$(fmt $total_menu) (same, cold start)"
echo -e "    With RQ (2nd+ visit): ${GRN}<5ms${RST} (memory cache hit, no network)"

# Bottlenecks
echo ""
echo -e "  ${BLD}Bottlenecks:${RST}"
found=0
for ep in "${endpoints[@]}"; do
  label="${ep%%:*}"
  ms=${cold_times[$label]}
  size=${cold_sizes[$label]}
  is_slow=$(echo "$ms > 500" | bc -l)
  is_large=$(echo "$size > 50000" | bc -l)
  if [ "$is_slow" = "1" ]; then
    echo -e "    ${RED}⚠ $label: ${ms}ms response time${RST}"
    found=1
  fi
  if [ "$is_large" = "1" ]; then
    echo -e "    ${YLW}⚠ $label: $(echo "scale=1; $size/1024" | bc -l)KB payload${RST}"
    found=1
  fi
done
if [ "$found" = "0" ]; then
  echo -e "    ${GRN}No critical bottlenecks detected${RST}"
fi

echo ""
