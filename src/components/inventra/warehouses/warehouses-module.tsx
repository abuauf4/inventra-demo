'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { Warehouse } from '@/components/inventra/shared/types'
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Search, Plus, Edit, Trash2, RefreshCw, MapPin, Warehouse as WarehouseIcon,
} from 'lucide-react'

function WarehousesModule() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [form, setForm] = useState({ name: '', code: '', address: '', isActive: true })
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
    try { const res = await fetch(`/api/warehouses?search=${encodeURIComponent(search)}`); setWarehouses((await res.json()).data ?? []) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Nama dan kode wajib'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/warehouses/${editing.id}` : '/api/warehouses'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', code: '', address: '', isActive: true }); load()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/warehouses/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', code: '', address: '', isActive: true }); setDialogOpen(true) }} className="bg-primary text-primary-foreground text-white"><Plus className="w-4 h-4 mr-2" />Tambah Gudang</Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto mt-5">
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground">Belum ada gudang</div> : warehouses.map(w => (
            <Card key={w.id} className="border-0 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-100 dark:bg-white/[0.06] rounded-lg flex items-center justify-center text-rose-600"><WarehouseIcon className="w-5 h-5" /></div>
                    <div><h3 className="font-semibold">{w.name}</h3><p className="text-xs text-muted-foreground font-mono">{w.code}</p></div>
                  </div>
                  <Badge variant={w.isActive ? 'default' : 'secondary'} className={w.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{w.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
                {w.address && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{w.address}</p>}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">{w._count?.stocks || 0} item stok</span>
                  <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(w); setForm({ name: w.name, code: w.code, address: w.address || '', isActive: w.isActive }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(w.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Gudang</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Nama *</Label><Input ref={nameRef} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="cth: GDG-01" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div></div><div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button className="bg-primary text-primary-foreground text-white" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default WarehousesModule
