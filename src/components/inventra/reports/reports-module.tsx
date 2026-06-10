'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { fmtRp, fmt, fmtDateTime } from '@/components/inventra/shared/constants'

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

import { RefreshCw, TrendingUp, ShoppingCart, Package, AlertTriangle, Trophy, Users, Truck, Filter, ArrowUpDown, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react'

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

function ReportsModule({ defaultTab }: { defaultTab?: 'sales' | 'purchases' | 'stock' | 'stock-mutations' } = {}) {
  const [tab, setTab] = useState(defaultTab ?? 'sales')
  const [period, setPeriod] = useState('monthly')

  // Default to current month
  const currentMonth = useMemo(() => getCurrentMonthRange(), [])
  const [dateFrom, setDateFrom] = useState(currentMonth.dateFrom)
  const [dateTo, setDateTo] = useState(currentMonth.dateTo)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Filter dropdowns
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filterSupplierId, setFilterSupplierId] = useState('all')
  const [filterCustomerId, setFilterCustomerId] = useState('all')
  const [filterCategoryId, setFilterCategoryId] = useState('all')
  const [filterStockSupplierId, setFilterStockSupplierId] = useState('all')
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)

  // Load suppliers/customers/categories for filters on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()).then(d => d.data ?? []),
      fetch('/api/customers').then(r => r.json()).then(d => d.data ?? []),
      fetch('/api/categories').then(r => r.json()).then(d => d.data ?? []),
    ]).then(([s, c, cat]) => { setSuppliers(s); setCustomers(c); setCategories(cat) }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tab === 'stock') {
        params.set('type', 'stock')
        if (filterCategoryId && filterCategoryId !== 'all') params.set('categoryId', filterCategoryId)
        if (filterStockSupplierId && filterStockSupplierId !== 'all') params.set('supplierId', filterStockSupplierId)
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
        if (tab === 'sales' && filterCustomerId && filterCustomerId !== 'all') params.set('customerId', filterCustomerId)
        if (tab === 'purchases' && filterSupplierId && filterSupplierId !== 'all') params.set('supplierId', filterSupplierId)
      }
      const res = await fetch(`/api/reports?${params}`)
      setData((await res.json()).data ?? null)
    } catch { toast.error('Gagal memuat laporan') }
    finally { setLoading(false) }
  }, [tab, period, dateFrom, dateTo, filterSupplierId, filterCustomerId, filterCategoryId, filterStockSupplierId, filterLowStockOnly])
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
            <Select value={filterCustomerId} onValueChange={setFilterCustomerId}><SelectTrigger className="w-48"><SelectValue placeholder="Semua Customer" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Customer</SelectItem>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.companyName || c.name}</SelectItem>)}</SelectContent></Select>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full">{filterLabel}</span>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Pendapatan</p><p className="text-lg font-bold text-emerald-700">{fmtRp(data?.revenue || 0)}</p><p className="text-[10px] text-muted-foreground">COMPLETED + PAID</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-rose-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Modal</p><p className="text-lg font-bold text-rose-700">{fmtRp(data?.totalCost || 0)}</p><p className="text-[10px] text-muted-foreground">Estimasi HPP</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-teal-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Estimasi Profit</p><p className={`text-lg font-bold ${(data?.estimatedProfit || 0) >= 0 ? 'text-teal-700' : 'text-red-700'}`}>{fmtRp(data?.estimatedProfit || 0)}</p><p className="text-[10px] text-muted-foreground">{data?.revenue ? `${((data.estimatedProfit / data.revenue) * 100).toFixed(1)}% margin` : '-'}</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-lg font-bold">{fmt(data?.totalTransactions || 0)}</p><p className="text-[10px] text-muted-foreground">Tanpa DRAFT/CANCELLED</p></div>
                </CardContent></Card>
              </div>

              {/* Period Table */}
              <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Penjualan per Periode</CardTitle></CardHeader><CardContent>
                {data?.grouped?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah Transaksi</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent></Card>

              {/* Top Products + Top Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Produk Terlaris (Pendapatan)</CardTitle></CardHeader><CardContent>
                  {data?.topProductsByRevenue?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Pendapatan</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topProductsByRevenue.map((p: any, i: number) => <TableRow key={i}><TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground font-mono">{p.sku}</div></TableCell><TableCell className="text-center">{p.qty}</TableCell><TableCell className="text-right font-medium">{fmtRp(p.revenue)}</TableCell><TableCell className="text-right text-teal-600">{fmtRp(p.revenue - p.cost)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-4">Tidak ada data</p>}
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" />Customer Teratas</CardTitle></CardHeader><CardContent>
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
            <Select value={filterSupplierId} onValueChange={setFilterSupplierId}><SelectTrigger className="w-48"><SelectValue placeholder="Semua Supplier" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Supplier</SelectItem>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent></Select>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full">{filterLabel}</span>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-rose-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Biaya (Diterima)</p><p className="text-lg font-bold text-rose-700">{fmtRp(data?.cost || 0)}</p><p className="text-[10px] text-muted-foreground">Status RECEIVED saja</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-lg font-bold">{fmt(data?.totalTransactions || 0)}</p><p className="text-[10px] text-muted-foreground">Tanpa DRAFT/CANCELLED</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Grand Total</p><p className="text-lg font-bold">{fmtRp(data?.grandTotal || 0)}</p><p className="text-[10px] text-muted-foreground">Semua status (kecuali DRAFT/CANCELLED)</p></div>
                </CardContent></Card>
              </div>

              {/* Period Table */}
              <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Pembelian per Periode</CardTitle></CardHeader><CardContent>
                {data?.grouped?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah Transaksi</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent></Card>

              {/* Top Products + Top Suppliers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Produk Termahal (Biaya)</CardTitle></CardHeader><CardContent>
                  {data?.topProductsByCost?.length > 0 ? <Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Total Biaya</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topProductsByCost.map((p: any, i: number) => <TableRow key={i}><TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground font-mono">{p.sku}</div></TableCell><TableCell className="text-center">{p.qty}</TableCell><TableCell className="text-right font-medium">{fmtRp(p.cost)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-center text-muted-foreground py-4">Tidak ada data</p>}
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-4 h-4 text-purple-500" />Supplier Teratas</CardTitle></CardHeader><CardContent>
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
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}><SelectTrigger className="w-44"><SelectValue placeholder="Semua Kategori" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={filterStockSupplierId} onValueChange={setFilterStockSupplierId}><SelectTrigger className="w-48"><SelectValue placeholder="Semua Supplier" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Supplier</SelectItem>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent></Select>
            <Button variant={filterLowStockOnly ? 'default' : 'outline'} onClick={() => setFilterLowStockOnly(!filterLowStockOnly)} className={filterLowStockOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}><AlertTriangle className="w-4 h-4 mr-2" />Stok Menipis</Button>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Active filter label */}
          {filterLabel && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full">{filterLabel}</span>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Varian</p><p className="text-lg font-bold">{fmt(data?.totalVariants || 0)}</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Stok Menipis</p><p className="text-lg font-bold text-amber-600">{fmt(data?.lowStockCount || 0)}</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Nilai Persediaan</p><p className="text-lg font-bold">{fmtRp(data?.totalInventoryValue || 0)}</p></div>
                </CardContent></Card>
              </div>
              <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Stok (Per Varian)</CardTitle></CardHeader><CardContent>
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
              <Filter className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full">{filterLabel}</span>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <>
              {/* Summary Cards by Type */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><ArrowDownCircle className="w-5 h-5 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Stok Masuk (IN)</p><p className="text-lg font-bold text-emerald-700">{fmt(data?.byType?.IN?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.IN?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><ArrowUpCircle className="w-5 h-5 text-rose-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Stok Keluar (OUT)</p><p className="text-lg font-bold text-rose-700">{fmt(data?.byType?.OUT?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.OUT?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><SlidersHorizontal className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Penyesuaian (ADJ)</p><p className="text-lg font-bold text-amber-700">{fmt(data?.byType?.ADJUSTMENT?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.ADJUSTMENT?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><ArrowUpDown className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Transfer</p><p className="text-lg font-bold text-blue-700">{fmt(data?.byType?.TRANSFER?.count || 0)} transaksi</p><p className="text-[10px] text-muted-foreground">Total: {fmt(data?.byType?.TRANSFER?.totalQty || 0)} unit</p></div>
                </CardContent></Card>
              </div>

              {/* Mutations Table */}
              <Card className="border-0 shadow-sm">
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
