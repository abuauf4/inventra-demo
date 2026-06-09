'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { fmtRp, fmt } from '@/components/inventra/shared/constants'

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

import { RefreshCw, TrendingUp, ShoppingCart, Package, AlertTriangle, Trophy, Users, Truck, Filter } from 'lucide-react'

function ReportsModule({ defaultTab }: { defaultTab?: 'sales' | 'purchases' | 'stock' } = {}) {
  const [tab, setTab] = useState(defaultTab ?? 'sales')
  const [period, setPeriod] = useState('monthly')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
      params.set('type', tab === 'stock' ? 'stock' : tab)
      if (tab !== 'stock') {
        params.set('period', period)
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        if (tab === 'sales' && filterCustomerId && filterCustomerId !== 'all') params.set('customerId', filterCustomerId)
        if (tab === 'purchases' && filterSupplierId && filterSupplierId !== 'all') params.set('supplierId', filterSupplierId)
      } else {
        if (filterCategoryId && filterCategoryId !== 'all') params.set('categoryId', filterCategoryId)
        if (filterStockSupplierId && filterStockSupplierId !== 'all') params.set('supplierId', filterStockSupplierId)
        if (filterLowStockOnly) params.set('lowStockOnly', 'true')
      }
      const res = await fetch(`/api/reports?${params}`)
      setData((await res.json()).data ?? null)
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [tab, period, dateFrom, dateTo, filterSupplierId, filterCustomerId, filterCategoryId, filterStockSupplierId, filterLowStockOnly])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="sales">Penjualan</TabsTrigger><TabsTrigger value="purchases">Pembelian</TabsTrigger><TabsTrigger value="stock">Stok</TabsTrigger></TabsList>

        {/* ==================== SALES REPORT ==================== */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            {period === 'custom' && <><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></>}
            <Select value={filterCustomerId} onValueChange={setFilterCustomerId}><SelectTrigger className="w-48"><SelectValue placeholder="Semua Customer" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Customer</SelectItem>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.companyName || c.name}</SelectItem>)}</SelectContent></Select>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

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
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            {period === 'custom' && <><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></>}
            <Select value={filterSupplierId} onValueChange={setFilterSupplierId}><SelectTrigger className="w-48"><SelectValue placeholder="Semua Supplier" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Supplier</SelectItem>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent></Select>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

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
          {/* Stock Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}><SelectTrigger className="w-44"><SelectValue placeholder="Semua Kategori" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={filterStockSupplierId} onValueChange={setFilterStockSupplierId}><SelectTrigger className="w-48"><SelectValue placeholder="Semua Supplier" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Supplier</SelectItem>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent></Select>
            <Button variant={filterLowStockOnly ? 'default' : 'outline'} onClick={() => setFilterLowStockOnly(!filterLowStockOnly)} className={filterLowStockOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}><AlertTriangle className="w-4 h-4 mr-2" />Stok Menipis</Button>
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

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
      </Tabs>
    </div>
  )
}

export default ReportsModule
