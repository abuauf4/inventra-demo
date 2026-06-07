'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { StockMutation, Product } from '@/components/inventra/shared/types'
import { fmtDateTime } from '@/components/inventra/shared/constants'

import {
  Card, CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw, ArrowDown, ArrowUp, Minus,
} from 'lucide-react'

function StockMutationsModule() {
  const [mutations, setMutations] = useState<StockMutation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      const [mRes, pRes] = await Promise.all([fetch(`/api/stock-mutations?${params}`), fetch('/api/products')])
      setMutations((await mRes.json()).data); setProducts((await pRes.json()).data)
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [filterType])
  useEffect(() => { load() }, [load])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IN': return <Badge className="bg-emerald-100 text-emerald-700"><ArrowDown className="w-3 h-3 mr-1" />Masuk</Badge>
      case 'OUT': return <Badge className="bg-rose-100 text-rose-700"><ArrowUp className="w-3 h-3 mr-1" />Keluar</Badge>
      case 'ADJUSTMENT': return <Badge className="bg-blue-100 text-blue-700"><Minus className="w-3 h-3 mr-1" />Penyesuaian</Badge>
      default: return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua Tipe</SelectItem><SelectItem value="IN">Masuk</SelectItem><SelectItem value="OUT">Keluar</SelectItem><SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem></SelectContent></Select>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Varian/Produk</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Gudang</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
          <TableBody>{!mutations.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : mutations.map(m => (
            <TableRow key={m.id}><TableCell className="text-sm">{fmtDateTime(m.createdAt)}</TableCell><TableCell className="font-medium">{m.variant?.name || m.product?.name || '-'}</TableCell><TableCell>{getTypeBadge(m.type)}</TableCell><TableCell className="text-right font-medium">{m.type === 'OUT' ? `-${m.qty}` : `+${m.qty}`}</TableCell><TableCell>{m.warehouse?.name || '-'}</TableCell><TableCell className="text-muted-foreground text-sm">{m.note || '-'}</TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
    </div>
  )
}

export default StockMutationsModule
