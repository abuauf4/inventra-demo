'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Switch } from '@/components/ui/switch'

import {
  Search, Plus, Edit, Trash2, RefreshCw, KeyRound,
} from 'lucide-react'

function UserManagementModule() {
  const { currentUser } = useAppStore()
  const isOwner = currentUser?.role === 'owner'
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'staff', isActive: true })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Reset password state
  const [resetPwUser, setResetPwUser] = useState<User | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetPwConfirm, setResetPwConfirm] = useState('')
  const [resetPwSaving, setResetPwSaving] = useState(false)

  // Helper: build headers with current user context
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-current-user-id': currentUser?.id || '',
    'x-current-user-role': currentUser?.role || '',
  })

  // Available roles based on current user's role
  const availableRoles = isOwner
    ? ['owner', 'admin', 'staff', 'warehouse']
    : ['admin', 'staff', 'warehouse']

  // Can edit role for a given user
  const canEditRole = (targetUser: User) => {
    // Cannot change own role
    if (targetUser.id === currentUser?.id) return false
    // Only owner can change roles
    if (!isOwner) return false
    return true
  }

  // Can delete a given user
  const canDelete = (targetUser: User) => {
    // Cannot delete self
    if (targetUser.id === currentUser?.id) return false
    // Only owner can delete
    if (!isOwner) return false
    return true
  }

  const handleResetPassword = async () => {
    if (!resetPw || !resetPwConfirm) {
      toast.error('Semua field wajib diisi')
      return
    }
    if (resetPw !== resetPwConfirm) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (resetPw.length < 4) {
      toast.error('Password baru minimal 4 karakter')
      return
    }
    if (!resetPwUser) return
    setResetPwSaving(true)
    try {
      const res = await fetch(`/api/users/${resetPwUser.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ password: resetPw }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Gagal mereset password')
        return
      }
      toast.success(`Password ${resetPwUser.name} berhasil direset`)
      setResetPwUser(null)
      setResetPw('')
      setResetPwConfirm('')
    } catch {
      toast.error('Gagal mereset password')
    } finally {
      setResetPwSaving(false)
    }
  }

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [dialogOpen])

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`); const data = await res.json(); setUsers((data.data ?? []).map((u: any) => { const { password, ...rest } = u; return rest })) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.username || (!editing && !form.password)) { toast.error('Field wajib harus diisi'); return }

    // Client-side role protection
    if (form.role === 'owner' && !isOwner) {
      toast.error('Hanya owner yang dapat menetapkan role owner')
      return
    }
    if (editing && editing.id === currentUser?.id && form.role !== editing.role) {
      toast.error('Anda tidak dapat mengubah role akun sendiri')
      return
    }

    setSaving(true)
    try {
      const body: any = { name: form.name, username: form.username, email: form.email || undefined, role: form.role, isActive: form.isActive }
      if (form.password) body.password = form.password
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', username: '', email: '', password: '', role: 'staff', isActive: true }); load()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }
  const handleDelete = async (id: string) => {
    if (currentUser?.id === id) { toast.error('Tidak bisa hapus akun sendiri'); setDeleteConfirm(null); return }
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return }
      toast.success('Dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', username: '', email: '', password: '', role: 'staff', isActive: true }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto mt-5">
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-2 sm:p-3"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!users.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : users.map(u => (
            <TableRow key={u.id}><TableCell className="font-medium">{u.name}</TableCell><TableCell className="font-mono text-sm">{u.username}</TableCell><TableCell>{u.email || '-'}</TableCell><TableCell><Badge className={u.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : u.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : u.role === 'warehouse' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Badge></TableCell><TableCell><Badge variant={u.isActive ? 'default' : 'secondary'} className={u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'dark:bg-gray-800 dark:text-gray-400'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(u); setForm({ name: u.name, username: u.username, email: u.email || '', password: '', role: u.role, isActive: u.isActive }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setResetPwUser(u); setResetPw(''); setResetPwConfirm('') }} title="Reset Password" className="text-amber-500"><KeyRound className="w-4 h-4" /></Button>{canDelete(u) && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} User</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input ref={nameRef} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>Username *</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Opsional" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2"><Label>{editing ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }} /></div><div className="space-y-2">
          <Label>Role {editing && !canEditRole(editing) && <span className="text-muted-foreground text-[11px] font-normal">(tidak dapat diubah)</span>}</Label>
          {editing && !canEditRole(editing) ? (
            <Input readOnly className="bg-muted text-muted-foreground" value={form.role.charAt(0).toUpperCase() + form.role.slice(1)} />
          ) : (
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger /><SelectContent>
              {availableRoles.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
            </SelectContent></Select>
          )}
        </div><div className="flex items-center justify-between"><Label>Aktif</Label><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwUser} onOpenChange={(open) => {
        if (!open) { setResetPwUser(null); setResetPw(''); setResetPwConfirm('') }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password — {resetPwUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Password baru</Label>
              <Input
                type="password"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="Masukkan password baru (min. 4 karakter)"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleResetPassword() } }}
              />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi password baru</Label>
              <Input
                type="password"
                value={resetPwConfirm}
                onChange={(e) => setResetPwConfirm(e.target.value)}
                placeholder="Ulangi password baru"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleResetPassword() } }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setResetPwUser(null); setResetPw(''); setResetPwConfirm('') }}
              disabled={resetPwSaving}
            >
              Batal
            </Button>
            <Button
              className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"
              onClick={handleResetPassword}
              disabled={resetPwSaving}
            >
              {resetPwSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManagementModule
