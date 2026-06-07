'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Purchase, PurchaseItem, Product, ProductVariant, Supplier } from '@/components/inventra/shared/types'
import { fmtDate, fmtRp, purchaseStatusMap } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'

import {
  Card, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'

import {
  Search, Plus, Eye, Trash2, RefreshCw,
} from 'lucide-react'

function PurchasesModule() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Purchase | null>(null)
  const [form, setForm] = useState({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'DRAFT', items: [{ variantId: '', productId: '', qty: '1', buyPrice: '0' }] })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; status: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const [pRes, sRes, prRes] = await Promise.all([fetch(`/api/purchases?${params}`), fetch('/api/suppliers'), fetch('/api/products')])
      setPurchases((await pRes.json()).data); setSuppliers((await sRes.json()).data); setProducts((await prRes.json()).data)
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search, filterStatus])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.supplierId) { toast.error('Supplier wajib'); return }
    try {
      const body = { supplierId: form.supplierId, date: form.date, notes: form.notes || undefined, status: form.status, items: form.items.filter(i => i.variantId || i.productId).map(i => ({ variantId: i.variantId || undefined, productId: i.productId || undefined, qty: parseInt(i.qty) || 0, buyPrice: parseFloat(i.buyPrice) || 0 })) }
      if (!body.items.length) { toast.error('Item wajib diisi'); return }
      const res = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Pembelian dicatat'); setDialogOpen(false); setForm({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'DRAFT', items: [{ variantId: '', productId: '', qty: '1', buyPrice: '0' }] }); load()
    } catch { toast.error('Gagal') }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Status diperbarui'); setDetailOpen(false); load()
    } catch { toast.error('Gagal') }
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  const handleCancel = async () => {
    if (!cancelConfirm) return
    try {
      const res = await fetch(`/api/purchases/${cancelConfirm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Pembelian dibatalkan'); setCancelConfirm(null); setDetailOpen(false); load()
    } catch { toast.error('Gagal') }
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { variantId: '', productId: '', qty: '1', buyPrice: '0' }] })
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }
    if (field === 'variantId') { const p = products.find(p => p.variants?.some(v => v.id === value)); const v = p?.variants?.find(v => v.id === value); if (v) items[idx].buyPrice = String(v.buyPrice) }
    setForm({ ...form, items })
  }
  const openDetail = async (id: string) => { try { const res = await fetch(`/api/purchases/${id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch {} }
  const total = form.items.reduce((s, i) => s + (parseInt(i.qty) || 0) * (parseFloat(i.buyPrice) || 0), 0)

  // Flatten variants for select
  const allVariants = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.name })))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari no. transaksi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Status</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="APPROVED">Disetujui</SelectItem><SelectItem value="RECEIVED">Diterima</SelectItem><SelectItem value="CANCELLED">Dibatalkan</SelectItem></SelectContent></Select>
        <Button onClick={() => { setForm({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'DRAFT', items: [{ variantId: '', productId: '', qty: '1', buyPrice: '0' }] }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Supplier</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!purchases.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : purchases.map(p => (
            <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.transNo}</TableCell><TableCell>{p.supplier?.name}</TableCell><TableCell>{fmtDate(p.date)}</TableCell><TableCell><StatusBadge status={p.status} map="purchase" /></TableCell><TableCell className="text-right font-medium">{fmtRp(p.total)}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openDetail(p.id)}><Eye className="w-4 h-4" /></Button>
                {p.status === 'DRAFT' && <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => handleStatusChange(p.id, 'APPROVED')}>Setujui</Button>}
                {p.status === 'APPROVED' && <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => handleStatusChange(p.id, 'RECEIVED')}>Terima</Button>}
                {['DRAFT', 'APPROVED', 'RECEIVED'].includes(p.status) && <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => setCancelConfirm({ id: p.id, status: p.status })}>Batalkan</Button>}
                {p.status === 'DRAFT' && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>}
              </div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Pembelian</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div><div><span className="text-muted-foreground">Supplier:</span> <span className="ml-2">{detail.supplier?.name}</span></div><div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div><div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={detail.status} map="purchase" /></span></div><div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div></div><Separator />
          <Table><TableHeader><TableRow><TableHead>Produk/Varian</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
            <TableBody>{detail.items?.map((item: any) => <TableRow key={item.id}><TableCell>{item.variant?.name || item.product?.name || '-'}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">{fmtRp(item.buyPrice)}</TableCell><TableCell className="text-right">{fmtRp(item.qty * item.buyPrice)}</TableCell></TableRow>)}</TableBody></Table>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Tambah Pembelian</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>Supplier *</Label><Select value={form.supplierId} onValueChange={v => setForm({ ...form, supplierId: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger /><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="APPROVED">Disetujui</SelectItem><SelectItem value="RECEIVED">Diterima</SelectItem></SelectContent></Select></div></div>
          <div className="space-y-2"><Label>Catatan</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Separator />
          <div className="space-y-2"><div className="flex items-center justify-between"><Label>Item</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Tambah</Button></div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5"><Select value={item.variantId} onValueChange={v => updateItem(idx, 'variantId', v)}><SelectTrigger><SelectValue placeholder="Pilih varian" /></SelectTrigger><SelectContent>{allVariants.map(v => <SelectItem key={v.id} value={v.id}>{v.productName} — {v.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></div>
                <div className="col-span-3"><Input type="number" placeholder="Harga" value={item.buyPrice} onChange={e => updateItem(idx, 'buyPrice', e.target.value)} /></div>
                <div className="col-span-2 flex justify-end">{form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div>
              </div>
            ))}
          </div>
          <div className="text-right text-lg font-bold">Total: {fmtRp(total)}</div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus? Stok tidak akan terpengaruh jika status Draft.</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Batalkan Pembelian?</AlertDialogTitle><AlertDialogDescription>{cancelConfirm?.status === 'RECEIVED' ? 'Stok yang sudah masuk akan dikembalikan. Transaksi ini tidak dapat dibatalkan kembali.' : cancelConfirm?.status === 'APPROVED' ? 'Pembelian yang sudah disetujui akan dibatalkan. Stok tidak terpengaruh karena belum diterima.' : 'Pembelian draft akan dibatalkan.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Kembali</AlertDialogCancel><AlertDialogAction onClick={handleCancel} className="bg-red-600">Ya, Batalkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default PurchasesModule
