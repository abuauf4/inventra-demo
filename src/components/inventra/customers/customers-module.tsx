'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { Customer } from '@/components/inventra/shared/types'
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

function CustomersModule() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [dialogOpen])

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`); setCustomers((await res.json()).data) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama harus diisi'); return }
    try {
      const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); load()
    } catch { toast.error('Gagal') }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead className="text-center">Penjualan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!customers.length ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : customers.map(c => (
            <TableRow key={c.id}><TableCell><Badge variant="outline" className="font-mono text-xs">{c.code}</Badge></TableCell><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.phone || '-'}</TableCell><TableCell className="text-center"><Badge variant="secondary">{c._count?.sales || 0}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={async () => { try { const res = await fetch(`/api/customers/${c.id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch {} }}><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Customer</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">Nama:</span> <span className="font-medium ml-2">{detail.name}</span></div><div><span className="text-muted-foreground">Telepon:</span> <span className="ml-2">{detail.phone || '-'}</span></div><div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{detail.email || '-'}</span></div><div><span className="text-muted-foreground">Alamat:</span> <span className="ml-2">{detail.address || '-'}</span></div></div><Separator />{detail.sales?.length > 0 && <div><h4 className="font-medium mb-2">Riwayat Penjualan</h4><Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{detail.sales.map((s: any) => <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell><StatusBadge status={s.status} map={saleStatusMap} /></TableCell><TableCell className="text-right">{fmtRp(s.total)}</TableCell></TableRow>)}</TableBody></Table></div>}</div>}
      </DialogContent></Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Customer</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input ref={nameRef} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div></div><div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div><div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default CustomersModule
