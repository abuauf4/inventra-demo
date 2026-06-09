'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { fmtRp, fmt, fmtDate, fmtDateTime } from '@/components/inventra/shared/constants'

import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

import { RefreshCw, TrendingUp, ShoppingCart, Package, AlertTriangle, Trophy, Users, Truck, Filter, ArrowUpDown, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, X } from 'lucide-react'

// Helper: get current month range as ISO date strings for input[type=date]
function getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const firstDay = new Date(y, m, 1)
  const lastDay = new Date(y, m + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    dateFrom: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
    dateTo: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
  }
}

// Format date for display label (Indonesian)
function fmtFilterLabel(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const fromStr = from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const toStr = to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return `Filter: ${fromStr} — ${toStr}`
}

// ─── Typeahead Filter Component ────────────────────────────────────
interface TypeaheadItem {
  id: string
  code: string
  label: string
  sublabel?: string
}

function TypeaheadFilter({
  placeholder,
  searchUrl,
  selectedId,
  onSelect,
  onClear,
  chipLabel,
}: {
  placeholder: string
  searchUrl: string
  selectedId: string
  onSelect: (id: string, item: TypeaheadItem) => void
  onClear: () => void
  chipLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TypeaheadItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Search with debounce 200ms
  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${searchUrl}?search=${encodeURIComponent(q)}&limit=10`)
      const data = (await res.json()).data ?? []
      const items: TypeaheadItem[] = data.map((d: any) => ({
        id: d.id,
        code: d.code || d.sku || '',
        label: d.name || d.companyName || d.label || '',
        sublabel: d.phone || d.pic || d.address?.slice(0, 30) || '',
      }))
      setSuggestions(items)
      setShowDropdown(items.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [searchUrl])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(value), 200)
  }

  const handleSelect = (item: TypeaheadItem) => {
    onSelect(item.id, item)
    setShowDropdown(false)
    setQuery('')
  }

  const handleClear = () => {
    onClear()
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    if (query && suggestions.length > 0) {
      setShowDropdown(true)
    }
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

  // If selected, show chip
  if (selectedId) {
    return (
      <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-md px-3 py-1.5 h-9 max-w-xs">
        <span className="text-sm text-stone-700 truncate flex-1">{chipLabel || 'Dipilih'}</span>
        <button
          onClick={handleClear}
          className="text-stone-400 hover:text-stone-700 shrink-0"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-48 h-9 text-sm"
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-64 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map(item => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 text-sm border-b last:border-b-0"
              onMouseDown={e => { e.preventDefault(); handleSelect(item) }}
            >
              <div className="font-medium text-xs text-muted-foreground">{item.code}</div>
              <div className="text-sm">{item.label}</div>
              {item.sublabel && <div className="text-xs text-muted-foreground">{item.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

// ─── Product Typeahead (searches products API) ─────────────────────
function ProductTypeaheadFilter({
  selectedId,
  onSelect,
  onClear,
  chipLabel,
}: {
  selectedId: string
  onSelect: (id: string, item: TypeaheadItem) => void
  onClear: () => void
  chipLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TypeaheadItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=10`)
      const data = (await res.json()).data ?? []
      const items: TypeaheadItem[] = data.map((d: any) => ({
        id: d.id,
        code: d.sku || '',
        label: d.name || '',
        sublabel: `${d.category?.name || '-'} · ${(d.variants?.length || 0)} varian`,
      }))
      setSuggestions(items)
      setShowDropdown(items.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(value), 200)
  }

  const handleSelect = (item: TypeaheadItem) => {
    onSelect(item.id, item)
    setShowDropdown(false)
    setQuery('')
  }

  const handleClear = () => {
    onClear()
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    if (query && suggestions.length > 0) {
      setShowDropdown(true)
    }
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

  if (selectedId) {
    return (
      <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-md px-3 py-1.5 h-9 max-w-xs">
        <span className="text-sm text-stone-700 truncate flex-1">{chipLabel || 'Dipilih'}</span>
        <button
          onClick={handleClear}
          className="text-stone-400 hover:text-stone-700 shrink-0"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        placeholder="Cari produk (SKU / nama)..."
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-52 h-9 text-sm"
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-72 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map(item => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 focus:bg-emerald-50 text-sm border-b last:border-b-0"
              onMouseDown={e => { e.preventDefault(); handleSelect(item) }}
            >
              <div className="font-medium text-xs text-muted-foreground">{item.code}</div>
              <div className="text-sm">{item.label}</div>
              {item.sublabel && <div className="text-xs text-muted-foreground">{item.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

function ReportsModule({ defaultTab }: { defaultTab?: 'sales' | 'purchases' | 'stock' | 'stock-mutations' } = {}) {
  const [tab, setTab] = useState(defaultTab ?? 'sales')
  const [period, setPeriod] = useState('monthly')

  // Default to current month
  const currentMonth = useMemo(() => getCurrentMonthRange(), [])
  const [dateFrom, setDateFrom] = useState(currentMonth.dateFrom)
  const [dateTo, setDateTo] = useState(currentMonth.dateTo)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Filter state — now using IDs only (no full entity lists)
  const [filterSupplierId, setFilterSupplierId] = useState('')
  const [filterCustomerId, setFilterCustomerId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('all')
  const [filterStockSupplierId, setFilterStockSupplierId] = useState('')
  const [filterProductId, setFilterProductId] = useState('')
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)

  // For chip labels — store selected entity info
  const [selectedCustomer, setSelectedCustomer] = useState<TypeaheadItem | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<TypeaheadItem | null>(null)
  const [selectedStockSupplier, setSelectedStockSupplier] = useState<TypeaheadItem | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<TypeaheadItem | null>(null)

  // Load categories for stock filter (small list, dropdown is fine)
  const [categories, setCategories] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.data ?? [])).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tab === 'stock') {
        params.set('type', 'stock')
        if (filterCategoryId && filterCategoryId !== 'all') params.set('categoryId', filterCategoryId)
        if (filterStockSupplierId) params.set('supplierId', filterStockSupplierId)
        if (filterProductId) params.set('productId', filterProductId)
        if (filterLowStockOnly) params.set('lowStockOnly', 'true')
      } else if (tab === 'stock-mutations') {
        params.set('type', 'stock-mutations')
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
      } else {
        // sales or purchases
        params.set('type', tab)
        params.set('period', period)
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        if (tab === 'sales' && filterCustomerId) params.set('customerId', filterCustomerId)
        if (tab === 'purchases' && filterSupplierId) params.set('supplierId', filterSupplierId)
      }
      const res = await fetch(`/api/reports?${params}`)
      setData((await res.json()).data ?? null)
    } catch { toast.error('Gagal memuat laporan') }
    finally { setLoading(false) }
  }, [tab, period, dateFrom, dateTo, filterSupplierId, filterCustomerId, filterCategoryId, filterStockSupplierId, filterProductId, filterLowStockOnly])
  useEffect(() => { load() }, [load])

  // Active filter label
  const filterLabel = useMemo(() => {
    if (!dateFrom || !dateTo) return ''
    return fmtFilterLabel(dateFrom, dateTo)
  }, [dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sales">Penjualan</TabsTrigger>
          <TabsTrigger value="purchases">Pembelian</TabsTrigger>
          <TabsTrigger value="stock">Stok</TabsTrigger>
          <TabsTrigger value="stock-mutations">Mutasi Stok</TabsTrigger>
        </TabsList>

        {/* ==================== SALES REPORT ==================== */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dari Tanggal</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sampai Tanggal</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </div>
            </div>
            {/* Customer typeahead filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Customer</label>
              <TypeaheadFilter
                placeholder="Cari customer..."
                searchUrl="/api/customers"
                selectedId={filterCustomerId}
                onSelect={(id, item) => { setFilterCustomerId(id); setSelectedCustomer(item) }}
                onClear={() => { setFilterCustomerId(''); setSelectedCustomer(null) }}
                chipLabel={selectedCustomer ? `${selectedCustomer.code} — ${selectedCustomer.label}${selectedCustomer.sublabel ? ` — ${selectedCustomer.sublabel}` : ''}` : undefined}
              />
            </div>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">{filterLabel}</span>
              {filterCustomerId && selectedCustomer && (
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                  Customer: {selectedCustomer.code} — {selectedCustomer.label}
                </span>
              )}
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-stone-300" /></div> : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Pendapatan</p><p className="text-lg font-bold text-emerald-700">{fmtRp(data?.revenue || 0)}</p><p className="text-[10px] text-muted-foreground">COMPLETED + PAID</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-rose-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Modal</p><p className="text-lg font-bold text-rose-700">{fmtRp(data?.totalCost || 0)}</p><p className="text-[10px] text-muted-foreground">Estimasi HPP</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-teal-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Estimasi Profit</p><p className={`text-lg font-bold ${(data?.estimatedProfit || 0) >= 0 ? 'text-teal-700' : 'text-red-700'}`}>{fmtRp(data?.estimatedProfit || 0)}</p><p className="text-[10px] text-muted-foreground">{data?.revenue ? `${((data.estimatedProfit / data.revenue) * 100).toFixed(1)}% margin` : '-'}</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-lg font-bold">{fmt(data?.totalTransactions || 0)}</p><p className="text-[10px] text-muted-foreground">Tanpa DRAFT/CANCELLED</p></div>
                </CardContent></Card>
              </div>

              {/* Period Table */}
              <Card className="border shadow-sm bg-white"><CardHeader><CardTitle>Laporan Penjualan per Periode</CardTitle></CardHeader><CardContent>
                {data?.grouped?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah Transaksi</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent></Card>

              {/* Top Products + Top Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border shadow-sm bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Produk Terlaris (Pendapatan)</CardTitle></CardHeader><CardContent>
                  {data?.topProductsByRevenue?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Pendapatan</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topProductsByRevenue.map((p: any, i: number) => <TableRow key={i}><TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground font-mono">{p.sku}</div></TableCell><TableCell className="text-center">{p.qty}</TableCell><TableCell className="text-right font-medium">{fmtRp(p.revenue)}</TableCell><TableCell className="text-right text-teal-600">{fmtRp(p.revenue - p.cost)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-4">Tidak ada data</p>}
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" />Customer Teratas</CardTitle></CardHeader><CardContent>
                  {data?.topCustomers?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-center">Order</TableHead><TableHead className="text-right">Total Belanja</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topCustomers.map((c: any, i: number) => <TableRow key={i}><TableCell><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground font-mono">{c.code}</div></TableCell><TableCell className="text-center">{c.orderCount}</TableCell><TableCell className="text-right font-medium">{fmtRp(c.totalSpent)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-4">Tidak ada data</p>}
                </CardContent></Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ==================== PURCHASES REPORT ==================== */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dari Tanggal</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sampai Tanggal</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </div>
            </div>
            {/* Supplier typeahead filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Supplier</label>
              <TypeaheadFilter
                placeholder="Cari supplier..."
                searchUrl="/api/suppliers"
                selectedId={filterSupplierId}
                onSelect={(id, item) => { setFilterSupplierId(id); setSelectedSupplier(item) }}
                onClear={() => { setFilterSupplierId(''); setSelectedSupplier(null) }}
                chipLabel={selectedSupplier ? `${selectedSupplier.code} — ${selectedSupplier.label}${selectedSupplier.sublabel ? ` — ${selectedSupplier.sublabel}` : ''}` : undefined}
              />
            </div>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">{filterLabel}</span>
              {filterSupplierId && selectedSupplier && (
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                  Supplier: {selectedSupplier.code} — {selectedSupplier.label}
                </span>
              )}
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-stone-300" /></div> : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-rose-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Biaya (Diterima)</p><p className="text-lg font-bold text-rose-700">{fmtRp(data?.cost || 0)}</p><p className="text-[10px] text-muted-foreground">Status RECEIVED saja</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-lg font-bold">{fmt(data?.totalTransactions || 0)}</p><p className="text-[10px] text-muted-foreground">Tanpa DRAFT/CANCELLED</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Grand Total</p><p className="text-lg font-bold">{fmtRp(data?.grandTotal || 0)}</p><p className="text-[10px] text-muted-foreground">Semua status (kecuali DRAFT/CANCELLED)</p></div>
                </CardContent></Card>
              </div>

              {/* Period Table */}
              <Card className="border shadow-sm bg-white"><CardHeader><CardTitle>Laporan Pembelian per Periode</CardTitle></CardHeader><CardContent>
                {data?.grouped?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah Transaksi</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent></Card>

              {/* Top Products + Top Suppliers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border shadow-sm bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Produk Termahal (Biaya)</CardTitle></CardHeader><CardContent>
                  {data?.topProductsByCost?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Total Biaya</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topProductsByCost.map((p: any, i: number) => <TableRow key={i}><TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground font-mono">{p.sku}</div></TableCell><TableCell className="text-center">{p.qty}</TableCell><TableCell className="text-right font-medium">{fmtRp(p.cost)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-4">Tidak ada data</p>}
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-4 h-4 text-purple-500" />Supplier Teratas</CardTitle></CardHeader><CardContent>
                  {data?.topSuppliers?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-center">Order</TableHead><TableHead className="text-right">Total Belanja</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topSuppliers.map((s: any, i: number) => <TableRow key={i}><TableCell><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground font-mono">{s.code}</div></TableCell><TableCell className="text-center">{s.orderCount}</TableCell><TableCell className="text-right font-medium">{fmtRp(s.totalSpent)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-4">Tidak ada data</p>}
                </CardContent></Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ==================== STOCK REPORT ==================== */}
        <TabsContent value="stock" className="space-y-4">
          {/* Stock Filters + Date Range */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dari Tanggal</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sampai Tanggal</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </div>
            </div>
            {/* Category — keep dropdown (small list) */}
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}><SelectTrigger className="w-44"><SelectValue placeholder="Semua Kategori" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            {/* Supplier typeahead */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Supplier</label>
              <TypeaheadFilter
                placeholder="Cari supplier..."
                searchUrl="/api/suppliers"
                selectedId={filterStockSupplierId}
                onSelect={(id, item) => { setFilterStockSupplierId(id); setSelectedStockSupplier(item) }}
                onClear={() => { setFilterStockSupplierId(''); setSelectedStockSupplier(null) }}
                chipLabel={selectedStockSupplier ? `${selectedStockSupplier.code} — ${selectedStockSupplier.label}` : undefined}
              />
            </div>
            {/* Product typeahead */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Produk</label>
              <ProductTypeaheadFilter
                selectedId={filterProductId}
                onSelect={(id, item) => { setFilterProductId(id); setSelectedProduct(item) }}
                onClear={() => { setFilterProductId(''); setSelectedProduct(null) }}
                chipLabel={selectedProduct ? `${selectedProduct.code} — ${selectedProduct.label}` : undefined}
              />
            </div>
            <Button variant={filterLowStockOnly ? 'default' : 'outline'} onClick={() => setFilterLowStockOnly(!filterLowStockOnly)} className={filterLowStockOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}><AlertTriangle className="w-4 h-4 mr-2" />Stok Menipis</Button>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">{filterLabel}</span>
              {filterStockSupplierId && selectedStockSupplier && (
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                  Supplier: {selectedStockSupplier.code} — {selectedStockSupplier.label}
                </span>
              )}
              {filterProductId && selectedProduct && (
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                  Produk: {selectedProduct.code} — {selectedProduct.label}
                </span>
              )}
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-stone-300" /></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Varian</p><p className="text-lg font-bold">{fmt(data?.totalVariants || 0)}</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Stok Menipis</p><p className="text-lg font-bold text-amber-600">{fmt(data?.lowStockCount || 0)}</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Nilai Persediaan</p><p className="text-lg font-bold">{fmtRp(data?.totalInventoryValue || 0)}</p></div>
                </CardContent></Card>
              </div>
              <Card className="border shadow-sm bg-white"><CardHeader><CardTitle>Laporan Stok (Per Varian)</CardTitle></CardHeader><CardContent>
                {data?.variants?.length > 0 ? <div className="overflow-x-auto max-h-96"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Varian</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-center">Min</TableHead><TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{data.variants.map((p: any) => <TableRow key={p.id}><TableCell className="font-medium">{p.name || p.productName}</TableCell><TableCell>{p.variantName || '-'}</TableCell><TableCell className="text-center">{p.stock}</TableCell><TableCell className="text-center">{p.minStock}</TableCell><TableCell className="text-right">{fmtRp(p.buyPrice)}</TableCell><TableCell className="text-right">{fmtRp(p.stockValue)}</TableCell>
                    <TableCell><Badge variant={p.stock <= p.minStock ? (p.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={p.stock > p.minStock ? 'bg-emerald-100 text-emerald-700' : p.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{p.stock <= 0 ? 'Habis' : p.stock <= p.minStock ? 'Menipis' : 'Aman'}</Badge></TableCell>
                  </TableRow>)}</TableBody></Table></div> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent></Card>
            </>
          )}
        </TabsContent>

        {/* ==================== STOCK MUTATIONS REPORT ==================== */}
        <TabsContent value="stock-mutations" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dari Tanggal</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sampai Tanggal</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </div>
            </div>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">{filterLabel}</span>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-stone-300" /></div> : (
            <>
              {/* Summary Cards by Type */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><ArrowDownCircle className="w-5 h-5 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Stok Masuk (IN)</p><p className="text-lg font-bold text-emerald-700">{fmt(data?.byType?.IN?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.IN?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><ArrowUpCircle className="w-5 h-5 text-rose-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Stok Keluar (OUT)</p><p className="text-lg font-bold text-rose-700">{fmt(data?.byType?.OUT?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.OUT?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><SlidersHorizontal className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Penyesuaian (ADJ)</p><p className="text-lg font-bold text-amber-700">{fmt(data?.byType?.ADJUSTMENT?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.ADJUSTMENT?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
                <Card className="border shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><ArrowUpDown className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Transfer</p><p className="text-lg font-bold text-blue-700">{fmt(data?.byType?.TRANSFER?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.TRANSFER?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
              </div>

              {/* Mutations Table */}
              <Card className="border shadow-sm bg-white">
                <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4 text-amber-500" />Detail Mutasi Stok</CardTitle></CardHeader>
                <CardContent>
                  {data?.mutations?.length > 0 ? (
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Varian</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead>Gudang</TableHead>
                            <TableHead>Catatan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.mutations.map((m: any) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-sm">{fmtDateTime(m.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  m.type === 'IN' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                                  m.type === 'OUT' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                                  m.type === 'ADJUSTMENT' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                                  'border-blue-300 text-blue-700 bg-blue-50'
                                }>
                                  {m.type === 'IN' ? 'Masuk' : m.type === 'OUT' ? 'Keluar' : m.type === 'ADJUSTMENT' ? 'Penyesuaian' : 'Transfer'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{m.productName}</TableCell>
                              <TableCell>{m.variantName}</TableCell>
                              <TableCell className="text-center font-medium">{m.qty > 0 ? `+${m.qty}` : m.qty}</TableCell>
                              <TableCell>{m.warehouseName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.note || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Tidak ada data mutasi stok untuk periode ini</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportsModule
