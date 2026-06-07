'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { User } from '@/components/inventra/shared/types'
import { useAppStore } from '@/lib/store'

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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import {
  Search, Plus, Edit, Trash2, RefreshCw,
} from 'lucide-react'

function UserManagementModule() {
  const { currentUser } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'staff', isActive: true })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`); const data = await res.json(); setUsers(data.data.map((u: any) => { const { password, ...rest } = u; return rest })) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.username || (!editing && !form.password)) { toast.error('Field wajib harus diisi'); return }
    try {
      const body: any = { name: form.name, username: form.username, email: form.email || undefined, role: form.role, isActive: form.isActive }
      if (form.password) body.password = form.password
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', username: '', email: '', password: '', role: 'staff', isActive: true }); load()
    } catch { toast.error('Gagal') }
  }
  const handleDelete = async (id: string) => {
    if (currentUser?.id === id) { toast.error('Tidak bisa hapus akun sendiri'); setDeleteConfirm(null); return }
    try { const res = await fetch(`/api/users/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', username: '', email: '', password: '', role: 'staff', isActive: true }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!users.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : users.map(u => (
            <TableRow key={u.id}><TableCell className="font-medium">{u.name}</TableCell><TableCell className="font-mono text-sm">{u.username}</TableCell><TableCell>{u.email || '-'}</TableCell><TableCell><Badge className={u.role === 'owner' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Badge></TableCell><TableCell><Badge variant={u.isActive ? 'default' : 'secondary'} className={u.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(u); setForm({ name: u.name, username: u.username, email: u.email || '', password: '', role: u.role, isActive: u.isActive }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>{currentUser?.id !== u.id && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} User</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Username *</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Opsional" /></div><div className="space-y-2"><Label>{editing ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div><div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger /><SelectContent><SelectItem value="owner">Owner</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default UserManagementModule
