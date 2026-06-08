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

import { RefreshCw } from 'lucide-react'

function ReportsModule() {
  const [tab, setTab] = useState('sales')
  const [period, setPeriod] = useState('monthly')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('type', tab === 'stock' ? 'stock' : tab)
      if (tab !== 'stock') { params.set('period', period); if (dateFrom) params.set('dateFrom', dateFrom); if (dateTo) params.set('dateTo', dateTo) }
      const res = await fetch(`/api/reports?${params}`); setData((await res.json()).data ?? null)
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [tab, period, dateFrom, dateTo])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="sales">Penjualan</TabsTrigger><TabsTrigger value="purchases">Pembelian</TabsTrigger><TabsTrigger value="stock">Stok</TabsTrigger></TabsList>
        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            {period === 'custom' && <><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></>}
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Penjualan</CardTitle></CardHeader><CardContent>
              {data?.grouped?.length > 0 ? <><div className="mb-4"><span className="text-muted-foreground">Total: </span><span className="text-xl font-bold">{fmtRp(data.grandTotal || 0)}</span></div><Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table></> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
            </CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            {period === 'custom' && <><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></>}
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Pembelian</CardTitle></CardHeader><CardContent>
              {data?.grouped?.length > 0 ? <><div className="mb-4"><span className="text-muted-foreground">Total: </span><span className="text-xl font-bold">{fmtRp(data.grandTotal || 0)}</span></div><Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table></> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
            </CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="stock" className="space-y-4">
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-amber-500" /></div> : (
            <><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Varian</p><p className="text-2xl font-bold">{fmt(data?.totalVariants || 0)}</p></CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Stok Menipis</p><p className="text-2xl font-bold text-amber-600">{fmt(data?.lowStockCount || 0)}</p></CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Nilai Persediaan</p><p className="text-2xl font-bold">{fmtRp(data?.totalInventoryValue || 0)}</p></CardContent></Card>
            </div>
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Stok (Per Varian)</CardTitle></CardHeader><CardContent>
              {data?.variants?.length > 0 ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Varian</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-center">Min</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{data.variants.map((p: any) => <TableRow key={p.id}><TableCell className="font-medium">{p.name || p.productName}</TableCell><TableCell>{p.variantName || '-'}</TableCell><TableCell className="text-center">{p.stock}</TableCell><TableCell className="text-center">{p.minStock}</TableCell><TableCell className="text-right">{fmtRp(p.stockValue)}</TableCell>
                  <TableCell><Badge variant={p.stock <= p.minStock ? (p.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={p.stock > p.minStock ? 'bg-emerald-100 text-emerald-700' : p.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{p.stock <= 0 ? 'Habis' : p.stock <= p.minStock ? 'Menipis' : 'Aman'}</Badge></TableCell>
                </TableRow>)}</TableBody></Table></div> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
            </CardContent></Card></>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportsModule
