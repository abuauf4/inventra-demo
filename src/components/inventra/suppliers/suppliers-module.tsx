'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { Supplier } from '@/components/inventra/shared/types'
import { fmtRp, fmtDate, purchaseStatusMap } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'

import {
  Card, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, Plus, Edit, Trash2, Eye, RefreshCw, Package,
} from 'lucide-react'

function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [supplierProducts, setSupplierProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [form, setForm] = useState({ name: '', pic: '', phone: '', email: '', address: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [dialogOpen])

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`); setSuppliers((await res.json()).data ?? []) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`)
      const data = (await res.json()).data
      setDetail(data)
      setDetailOpen(true)
      // Fetch products for this supplier
      setLoadingProducts(true)
      try {
        const pRes = await fetch(`/api/products?supplierId=${id}&limit=100`)
        setSupplierProducts((await pRes.json()).data ?? [])
      } catch { setSupplierProducts([]) }
      finally { setLoadingProducts(false) }
    } catch {}
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama harus diisi'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', pic: '', phone: '', email: '', address: '', notes: '' }); load()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', pic: '', phone: '', email: '', address: '', notes: '' }); setDialogOpen(true) }} className="bg-primary text-primary-foreground text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto mt-5">
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0"><CardContent className="p-2 sm:p-3"><div className="overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>PIC</TableHead><TableHead>Telepon</TableHead><TableHead className="text-center">Produk</TableHead><TableHead className="text-center">Pembelian</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!suppliers.length ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : suppliers.map(s => (
            <TableRow key={s.id}><TableCell><Badge variant="outline" className="font-mono text-xs">{s.code}</Badge></TableCell><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.pic || '-'}</TableCell><TableCell>{s.phone || '-'}</TableCell><TableCell className="text-center"><Badge variant="secondary" className="bg-purple-100 text-purple-700">{s._count?.products || 0}</Badge></TableCell><TableCell className="text-center"><Badge variant="secondary">{s._count?.purchases || 0}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm({ name: s.name, pic: s.pic || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
          ))}</TableBody></Table></div></CardContent></Card>
      )}
      </div>

      {/* Detail Dialog with Tabs */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Supplier</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Nama:</span> <span className="font-medium ml-2">{detail.name}</span></div>
            <div><span className="text-muted-foreground">PIC:</span> <span className="ml-2">{detail.pic || '-'}</span></div>
            <div><span className="text-muted-foreground">Telepon:</span> <span className="ml-2">{detail.phone || '-'}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{detail.email || '-'}</span></div>
            <div className="col-span-1 sm:col-span-2"><span className="text-muted-foreground">Alamat:</span> <span className="ml-2">{detail.address || '-'}</span></div>
          </div>
          <Separator />
          <Tabs defaultValue="purchases">
            <TabsList className="w-full">
              <TabsTrigger value="purchases" className="flex-1">Pembelian ({detail.purchases?.length || 0})</TabsTrigger>
              <TabsTrigger value="products" className="flex-1">Produk ({supplierProducts.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases">
              {detail.purchases?.length > 0 ? <div className="overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{detail.purchases.map((p: any) => <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.transNo}</TableCell><TableCell>{fmtDate(p.date)}</TableCell><TableCell><StatusBadge status={p.status} map={purchaseStatusMap} /></TableCell><TableCell className="text-right">{fmtRp(p.total)}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="text-center text-muted-foreground py-6">Belum ada pembelian</p>}
            </TabsContent>
            <TabsContent value="products">
              {loadingProducts ? <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div> :
                supplierProducts.length > 0 ? <div className="max-h-96 overflow-y-auto overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-center">Varian</TableHead></TableRow></TableHeader>
                  <TableBody>{supplierProducts.map((p: any) => {
                    const totalStock = p.variants?.reduce((s: number, v: any) => s + v.stock, 0) || 0
                    return <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell><Badge variant="outline" className="font-mono text-[10px]">{p.sku}</Badge></TableCell><TableCell className="text-right">{fmtRp(p.buyPrice)}</TableCell><TableCell className="text-right">{fmtRp(p.sellPrice)}</TableCell><TableCell className="text-center"><Badge variant={totalStock <= p.minStock ? (totalStock <= 0 ? 'destructive' : 'secondary') : 'default'} className={totalStock > p.minStock ? 'bg-emerald-100 text-emerald-700' : totalStock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{totalStock}</Badge></TableCell><TableCell className="text-center">{p.variants?.length || 0}</TableCell></TableRow>
                  })}</TableBody></Table></div> : <p className="text-center text-muted-foreground py-6">Belum ada produk terdaftar untuk supplier ini</p>
              }
            </TabsContent>
          </Tabs>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Supplier</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input ref={nameRef} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>PIC</Label><Input value={form.pic} onChange={e => setForm({ ...form, pic: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div><div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button className="bg-primary text-primary-foreground text-white" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default SuppliersModule
