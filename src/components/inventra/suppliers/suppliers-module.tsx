'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { Supplier } from '@/components/inventra/shared/types'
import { fmtRp, fmtDate, purchaseStatusMap, saleStatusMap } from '@/components/inventra/shared/constants'
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
import {
  Search, Plus, Edit, Trash2, Eye, RefreshCw,
} from 'lucide-react'

function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState({ name: '', pic: '', phone: '', email: '', address: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`); setSuppliers((await res.json()).data) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama harus diisi'); return }
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', pic: '', phone: '', email: '', address: '', notes: '' }); load()
    } catch { toast.error('Gagal') }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', pic: '', phone: '', email: '', address: '', notes: '' }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>PIC</TableHead><TableHead>Telepon</TableHead><TableHead className="text-center">Pembelian</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!suppliers.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : suppliers.map(s => (
            <TableRow key={s.id}><TableCell><Badge variant="outline" className="font-mono text-xs">{s.code}</Badge></TableCell><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.pic || '-'}</TableCell><TableCell>{s.phone || '-'}</TableCell><TableCell className="text-center"><Badge variant="secondary">{s._count?.purchases || 0}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={async () => { try { const res = await fetch(`/api/suppliers/${s.id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch {} }}><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm({ name: s.name, pic: s.pic || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Supplier</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">Nama:</span> <span className="font-medium ml-2">{detail.name}</span></div><div><span className="text-muted-foreground">PIC:</span> <span className="ml-2">{detail.pic || '-'}</span></div><div><span className="text-muted-foreground">Telepon:</span> <span className="ml-2">{detail.phone || '-'}</span></div><div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{detail.email || '-'}</span></div><div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> <span className="ml-2">{detail.address || '-'}</span></div></div><Separator />{detail.purchases?.length > 0 && <div><h4 className="font-medium mb-2">Riwayat Pembelian</h4><Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{detail.purchases.map((p: any) => <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.transNo}</TableCell><TableCell>{fmtDate(p.date)}</TableCell><TableCell><StatusBadge status={p.status} map={purchaseStatusMap} /></TableCell><TableCell className="text-right">{fmtRp(p.total)}</TableCell></TableRow>)}</TableBody></Table></div>}</div>}
      </DialogContent></Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Supplier</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>PIC</Label><Input value={form.pic} onChange={e => setForm({ ...form, pic: e.target.value })} /></div><div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div><div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default SuppliersModule
