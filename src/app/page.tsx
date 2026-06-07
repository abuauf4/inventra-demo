'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'

import {
  LayoutDashboard, Package, FolderOpen, Truck, Users, ShoppingCart, ShoppingBag,
  ArrowLeftRight, FileBarChart, UserCog, Bell, Menu, X, LogOut, MoreVertical,
  Search, Plus, Edit, Trash2, Eye, RefreshCw, Warehouse as WarehouseIcon,
  Activity, ChevronRight, Check, XCircle, Clock, AlertTriangle, TrendingUp,
  TrendingDown, ArrowDown, ArrowUp, Minus, Paperclip, ChevronDown, MapPin
} from 'lucide-react'

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
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
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

// ===================== TYPES =====================
interface Category { id: string; name: string; description?: string; _count?: { products: number }; createdAt: string }
interface Supplier { id: string; name: string; pic?: string; phone?: string; email?: string; address?: string; notes?: string; _count?: { purchases: number }; createdAt: string }
interface Customer { id: string; name: string; phone?: string; email?: string; address?: string; notes?: string; _count?: { sales: number }; createdAt: string }
interface ProductVariant { id: string; productId: string; name: string; sku: string; attributes: string; buyPrice: number; sellPrice: number; stock: number; minStock: number; isActive: boolean; barcode?: string; createdAt: string }
interface Product { id: string; name: string; sku: string; categoryId: string; supplierId?: string; description?: string; image?: string; buyPrice: number; sellPrice: number; minStock: number; isActive: boolean; category?: Category; supplier?: Supplier; variants?: ProductVariant[]; createdAt: string }
interface Warehouse { id: string; name: string; code: string; address?: string; isActive: boolean; _count?: { stocks: number }; createdAt: string }
interface PurchaseItem { id?: string; purchaseId?: string; variantId?: string; productId?: string; qty: number; buyPrice: number; variant?: ProductVariant; product?: Product }
interface SaleItem { id?: string; saleId?: string; variantId?: string; productId?: string; qty: number; sellPrice: number; variant?: ProductVariant; product?: Product }
interface Purchase { id: string; transNo: string; supplierId: string; date: string; total: number; status: string; notes?: string; supplier?: Supplier; items: PurchaseItem[]; createdAt: string }
interface Sale { id: string; transNo: string; customerId?: string; date: string; total: number; status: string; notes?: string; customer?: Customer; items: SaleItem[]; createdAt: string }
interface StockMutation { id: string; variantId?: string; productId?: string; warehouseId?: string; type: string; qty: number; note?: string; variant?: ProductVariant; product?: Product; warehouse?: Warehouse; createdAt: string }
interface ActivityLog { id: string; userId: string; action: string; entity: string; entityId?: string; details: string; user?: { id: string; name: string; email: string; role: string }; createdAt: string }
interface User { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }

// ===================== FORMAT HELPERS =====================
const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n)
const fmtRp = (n: number) => `Rp ${fmt(n)}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// ===================== STATUS BADGES =====================
const purchaseStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}
const saleStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  PAID: { label: 'Dibayar', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  return <Badge className={s.color}>{s.label}</Badge>
}

// ===================== LOGIN SCREEN =====================
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useAppStore()

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Email dan password harus diisi'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (data.success) { setCurrentUser(data.user); toast.success(`Selamat datang, ${data.user.name}!`) }
      else { toast.error(data.message || 'Login gagal') }
    } catch { toast.error('Terjadi kesalahan') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">NAUKA INVENTRA</CardTitle>
          <CardDescription className="text-sm">Sistem Operasional Bisnis untuk UMKM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="owner@inventra.id" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
          <Button className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white" onClick={handleLogin} disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</Button>
          <p className="text-xs text-center text-muted-foreground mt-4">Default: owner@inventra.id / owner123</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== SIDEBAR =====================
const menuItems: { key: AppPage; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { key: 'products', label: 'Produk', icon: <Package className="w-5 h-5" /> },
  { key: 'categories', label: 'Kategori', icon: <FolderOpen className="w-5 h-5" /> },
  { key: 'suppliers', label: 'Supplier', icon: <Truck className="w-5 h-5" /> },
  { key: 'customers', label: 'Customer', icon: <Users className="w-5 h-5" /> },
  { key: 'purchases', label: 'Pembelian', icon: <ShoppingCart className="w-5 h-5" /> },
  { key: 'sales', label: 'Penjualan', icon: <ShoppingBag className="w-5 h-5" /> },
  { key: 'stock-mutations', label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-5 h-5" /> },
  { key: 'warehouses', label: 'Gudang', icon: <WarehouseIcon className="w-5 h-5" /> },
  { key: 'activity-logs', label: 'Activity Log', icon: <Activity className="w-5 h-5" /> },
  { key: 'reports', label: 'Laporan', icon: <FileBarChart className="w-5 h-5" /> },
  { key: 'user-management', label: 'User Management', icon: <UserCog className="w-5 h-5" /> },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser } = useAppStore()
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
          <div><h1 className="font-bold text-sm bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">NAUKA INVENTRA</h1><p className="text-[10px] text-muted-foreground">Sistem Operasional Bisnis</p></div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <ScrollArea className="h-[calc(100vh-180px)]">
          <nav className="p-2 space-y-0.5">
            {menuItems.map(item => (
              <button key={item.key} onClick={() => { setActivePage(item.key); onClose() }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activePage === item.key ? 'bg-gradient-to-r from-rose-50 to-amber-50 text-rose-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                {item.icon}{item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>
        {currentUser && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-rose-100 to-amber-100 text-rose-700 text-xs">{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{currentUser.name}</p><p className="text-[10px] text-muted-foreground capitalize">{currentUser.role}</p></div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

// ===================== HEADER =====================
function Header() {
  const { activePage, sidebarOpen, setSidebarOpen, currentUser, setCurrentUser, notifications, markNotificationRead } = useAppStore()
  const label = menuItems.find(m => m.key === activePage)?.label || 'Overview'
  const unread = notifications.filter(n => !n.read).length
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="w-5 h-5" /></Button>
      <h2 className="text-lg font-semibold">{label}</h2>
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative"><Bell className="w-5 h-5" />{unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center">{unread}</span>}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {notifications.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada notifikasi</div> :
            notifications.slice(0, 5).map(n => <DropdownMenuItem key={n.id} onClick={() => markNotificationRead(n.id)} className="flex flex-col items-start gap-1 p-3"><span className="text-sm">{n.message}</span><span className="text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</span></DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setCurrentUser(null); toast.success('Berhasil logout') }} className="text-red-600"><LogOut className="w-4 h-4 mr-2" />Logout</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

// ===================== OVERVIEW (DASHBOARD) =====================
function OverviewModule() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/dashboard'); const d = await res.json(); setData(d.data) } catch { toast.error('Gagal memuat overview') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (loading || !data) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div>

  const cards = [
    { label: 'Total Produk', value: fmt(data.totalProducts), icon: <Package className="w-5 h-5" />, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Total Customer', value: fmt(data.totalCustomers), icon: <Users className="w-5 h-5" />, gradient: 'from-purple-500 to-pink-500' },
    { label: 'Total Supplier', value: fmt(data.totalSuppliers), icon: <Truck className="w-5 h-5" />, gradient: 'from-orange-500 to-red-500' },
    { label: 'Total Penjualan', value: fmtRp(data.totalSales), icon: <TrendingUp className="w-5 h-5" />, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Total Pembelian', value: fmtRp(data.totalPurchases), icon: <TrendingDown className="w-5 h-5" />, gradient: 'from-rose-500 to-pink-500' },
    { label: 'Stok Menipis', value: fmt(data.lowStockProducts?.length || 0), icon: <AlertTriangle className="w-5 h-5" />, gradient: 'from-amber-500 to-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white`}>{c.icon}</div>
              <div><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-xl font-bold">{c.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.lowStockProducts?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />Stok Menipis</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Varian</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min. Stok</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.lowStockProducts.map((p: any) => (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.productName || p.name}</TableCell><TableCell>{p.variantName || '-'}</TableCell><TableCell className="font-mono text-sm">{p.sku}</TableCell>
                    <TableCell className="text-right"><Badge variant={p.stock <= 0 ? 'destructive' : 'secondary'}>{p.stock}</Badge></TableCell><TableCell className="text-right">{p.minStock}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Transaksi Terbaru</CardTitle></CardHeader>
        <CardContent>
          {!data.recentTransactions?.length ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Tipe</TableHead><TableHead>No. Transaksi</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.recentTransactions.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell><Badge className={t.type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>{t.type === 'sale' ? 'Penjualan' : 'Pembelian'}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{t.transNo}</TableCell>
                    <TableCell>{t.status ? <StatusBadge status={t.status} map={t.type === 'sale' ? saleStatusMap : purchaseStatusMap} /> : '-'}</TableCell>
                    <TableCell>{fmtDate(t.date)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtRp(t.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {data.recentActivities?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-rose-500" />Aktivitas Terbaru</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivities.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-600 text-xs font-medium mt-0.5">{a.user?.name?.slice(0, 2)?.toUpperCase() || '?'}</div>
                  <div className="flex-1"><span className="font-medium">{a.user?.name}</span> <span className="text-muted-foreground">{a.action === 'CREATE' ? 'membuat' : a.action === 'UPDATE' ? 'mengubah' : a.action === 'DELETE' ? 'menghapus' : a.action.toLowerCase()} {a.entity}</span><p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(a.createdAt)}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== CATEGORIES MODULE =====================
function CategoriesModule() {
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/categories?search=${encodeURIComponent(search)}`); setCategories((await res.json()).data) } catch { toast.error('Gagal memuat') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama harus diisi'); return }
    try {
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', description: '' }); load()
    } catch { toast.error('Gagal') }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Deskripsi</TableHead><TableHead className="text-center">Produk</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!categories.length ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : categories.map(c => (
            <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-muted-foreground">{c.description || '-'}</TableCell><TableCell className="text-center"><Badge variant="secondary">{c._count?.products || 0}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Kategori</DialogTitle></DialogHeader>
        <div className="space-y-4"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

// ===================== SUPPLIERS MODULE =====================
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
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>PIC</TableHead><TableHead>Telepon</TableHead><TableHead className="text-center">Pembelian</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!suppliers.length ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : suppliers.map(s => (
            <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.pic || '-'}</TableCell><TableCell>{s.phone || '-'}</TableCell><TableCell className="text-center"><Badge variant="secondary">{s._count?.purchases || 0}</Badge></TableCell>
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

// ===================== CUSTOMERS MODULE =====================
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
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Email</TableHead><TableHead className="text-center">Penjualan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!customers.length ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : customers.map(c => (
            <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.phone || '-'}</TableCell><TableCell>{c.email || '-'}</TableCell><TableCell className="text-center"><Badge variant="secondary">{c._count?.sales || 0}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={async () => { try { const res = await fetch(`/api/customers/${c.id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch {} }}><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Customer</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">Nama:</span> <span className="font-medium ml-2">{detail.name}</span></div><div><span className="text-muted-foreground">Telepon:</span> <span className="ml-2">{detail.phone || '-'}</span></div><div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{detail.email || '-'}</span></div><div><span className="text-muted-foreground">Alamat:</span> <span className="ml-2">{detail.address || '-'}</span></div></div><Separator />{detail.sales?.length > 0 && <div><h4 className="font-medium mb-2">Riwayat Penjualan</h4><Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{detail.sales.map((s: any) => <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell><StatusBadge status={s.status} map={saleStatusMap} /></TableCell><TableCell className="text-right">{fmtRp(s.total)}</TableCell></TableRow>)}</TableBody></Table></div>}</div>}
      </DialogContent></Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Customer</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div><div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div><div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

// ===================== PRODUCTS MODULE (WITH VARIANTS) =====================
function ProductsModule() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', categoryId: '', supplierId: '', description: '', buyPrice: '', sellPrice: '', minStock: '0', isActive: true })
  const [variantForm, setVariantForm] = useState({ name: '', sku: '', attributes: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCategory && filterCategory !== 'all') params.set('categoryId', filterCategory)
      if (filterLowStock) params.set('lowStock', 'true')
      const [pRes, cRes, sRes] = await Promise.all([fetch(`/api/products?${params}`), fetch('/api/categories'), fetch('/api/suppliers')])
      setProducts((await pRes.json()).data); setCategories((await cRes.json()).data); setSuppliers((await sRes.json()).data)
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search, filterCategory, filterLowStock])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.categoryId) { toast.error('Nama, SKU, dan Kategori wajib'); return }
    try {
      const body = { name: form.name, sku: form.sku, categoryId: form.categoryId, supplierId: form.supplierId || undefined, description: form.description || undefined, buyPrice: parseFloat(form.buyPrice) || 0, sellPrice: parseFloat(form.sellPrice) || 0, minStock: parseInt(form.minStock) || 0, isActive: form.isActive }
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', sku: '', categoryId: '', supplierId: '', description: '', buyPrice: '', sellPrice: '', minStock: '0', isActive: true }); load()
    } catch { toast.error('Gagal') }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/products/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  const handleAddVariant = async () => {
    if (!selectedProduct || !variantForm.name || !variantForm.sku) { toast.error('Nama dan SKU varian wajib'); return }
    try {
      const body = { productId: selectedProduct.id, name: variantForm.name, sku: variantForm.sku, attributes: variantForm.attributes, buyPrice: parseFloat(variantForm.buyPrice) || selectedProduct.buyPrice, sellPrice: parseFloat(variantForm.sellPrice) || selectedProduct.sellPrice, stock: parseInt(variantForm.stock) || 0, minStock: parseInt(variantForm.minStock) || 0 }
      const res = await fetch('/api/product-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Varian ditambahkan'); setVariantDialogOpen(false); setVariantForm({ name: '', sku: '', attributes: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0' }); load()
    } catch { toast.error('Gagal') }
  }

  const handleDeleteVariant = async (id: string) => {
    try { const res = await fetch(`/api/product-variants/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Varian dihapus'); load() } catch { toast.error('Gagal') }
  }

  const toggleExpand = (id: string) => {
    setExpandedProducts(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const getTotalStock = (p: Product) => p.variants?.reduce((s, v) => s + v.stock, 0) || 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-44"><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Button variant={filterLowStock ? 'default' : 'outline'} onClick={() => setFilterLowStock(!filterLowStock)} className={filterLowStock ? 'bg-amber-500 hover:bg-amber-600' : ''}><AlertTriangle className="w-4 h-4 mr-2" />Stok Menipis</Button>
        <Button onClick={() => { setEditing(null); setForm({ name: '', sku: '', categoryId: '', supplierId: '', description: '', buyPrice: '', sellPrice: '', minStock: '0', isActive: true }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <div className="space-y-3">
          {products.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="text-center py-8 text-muted-foreground">Belum ada produk</CardContent></Card> : products.map(p => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-600"><Package className="w-6 h-6" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><h3 className="font-semibold">{p.name}</h3><Badge variant="outline" className="font-mono text-xs">{p.sku}</Badge><Badge className="bg-rose-100 text-rose-700">{p.category?.name}</Badge><Badge variant={p.isActive ? 'default' : 'secondary'} className={p.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge></div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Beli: {fmtRp(p.buyPrice)}</span><span>Jual: {fmtRp(p.sellPrice)}</span>
                      <span className={getTotalStock(p) <= p.minStock ? 'text-amber-600 font-medium' : ''}>Total Stok: {getTotalStock(p)}</span>
                      <span>{p.variants?.length || 0} varian</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(p); setVariantForm({ name: '', sku: '', attributes: '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: '0', minStock: '0' }); setVariantDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" />Varian</Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleExpand(p.id)}><ChevronRight className={`w-4 h-4 transition-transform ${expandedProducts.has(p.id) ? 'rotate-90' : ''}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setForm({ name: p.name, sku: p.sku, categoryId: p.categoryId, supplierId: p.supplierId || '', description: p.description || '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), minStock: String(p.minStock), isActive: p.isActive }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                {expandedProducts.has(p.id) && p.variants && p.variants.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <Table><TableHeader><TableRow><TableHead>Varian</TableHead><TableHead>SKU</TableHead><TableHead>Atribut</TableHead><TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-center">Stok</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                      <TableBody>{p.variants.map(v => {
                        const attrs = (() => { try { return JSON.parse(v.attributes) } catch { return {} } })()
                        return <TableRow key={v.id}><TableCell className="font-medium">{v.name}</TableCell><TableCell className="font-mono text-xs">{v.sku}</TableCell><TableCell><div className="flex gap-1 flex-wrap">{Object.entries(attrs).map(([k, val]) => <Badge key={k} variant="outline" className="text-xs">{k}: {String(val)}</Badge>)}</div></TableCell>
                          <TableCell className="text-right">{fmtRp(v.buyPrice)}</TableCell><TableCell className="text-right">{fmtRp(v.sellPrice)}</TableCell>
                          <TableCell className="text-center"><Badge variant={v.stock <= v.minStock ? (v.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={v.stock > v.minStock ? 'bg-emerald-100 text-emerald-700' : v.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{v.stock}</Badge></TableCell>
                          <TableCell><Badge variant={v.isActive ? 'default' : 'secondary'} className={v.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{v.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteVariant(v.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      })}</TableBody></Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Produk</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Kategori *</Label><Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Supplier</Label><Select value={form.supplierId || 'none'} onValueChange={v => setForm({ ...form, supplierId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Harga Beli</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div><div className="space-y-2"><Label>Harga Jual</Label><Input type="number" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Min. Stok</Label><Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}><DialogContent><DialogHeader><DialogTitle>Tambah Varian — {selectedProduct?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Nama Varian *</Label><Input placeholder='cth: Black M' value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} /></div><div className="space-y-2"><Label>SKU Varian *</Label><Input placeholder='cth: OVT-BLK-M' value={variantForm.sku} onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} /></div></div>
          <div className="space-y-2"><Label>Atribut (JSON)</Label><Input placeholder='{"color":"Black","size":"M"}' value={variantForm.attributes} onChange={e => setVariantForm({ ...variantForm, attributes: e.target.value })} /><p className="text-xs text-muted-foreground">Format JSON untuk atribut seperti warna, ukuran, dll.</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Harga Beli</Label><Input type="number" value={variantForm.buyPrice} onChange={e => setVariantForm({ ...variantForm, buyPrice: e.target.value })} /></div><div className="space-y-2"><Label>Harga Jual</Label><Input type="number" value={variantForm.sellPrice} onChange={e => setVariantForm({ ...variantForm, sellPrice: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Stok</Label><Input type="number" value={variantForm.stock} onChange={e => setVariantForm({ ...variantForm, stock: e.target.value })} /></div><div className="space-y-2"><Label>Min. Stok</Label><Input type="number" value={variantForm.minStock} onChange={e => setVariantForm({ ...variantForm, minStock: e.target.value })} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setVariantDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleAddVariant}>Simpan Varian</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

// ===================== WAREHOUSES MODULE =====================
function WarehousesModule() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [form, setForm] = useState({ name: '', code: '', address: '', isActive: true })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/warehouses?search=${encodeURIComponent(search)}`); setWarehouses((await res.json()).data) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Nama dan kode wajib'); return }
    try {
      const url = editing ? `/api/warehouses/${editing.id}` : '/api/warehouses'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', code: '', address: '', isActive: true }); load()
    } catch { toast.error('Gagal') }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/warehouses/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', code: '', address: '', isActive: true }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah Gudang</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground">Belum ada gudang</div> : warehouses.map(w => (
            <Card key={w.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 rounded-lg flex items-center justify-center text-rose-600"><WarehouseIcon className="w-5 h-5" /></div>
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Gudang</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="cth: GDG-01" /></div></div><div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

// ===================== ACTIVITY LOG MODULE =====================
function ActivityLogModule() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/activity-logs'); setLogs((await res.json()).data) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus className="w-4 h-4 text-emerald-500" />
      case 'UPDATE': return <Edit className="w-4 h-4 text-blue-500" />
      case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />
      case 'STATUS_CHANGE': return <ChevronRight className="w-4 h-4 text-amber-500" />
      case 'LOGIN': return <Check className="w-4 h-4 text-emerald-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h3 className="text-sm text-muted-foreground">Menampilkan {logs.length} aktivitas terbaru</h3><Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button></div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          {logs.length === 0 ? <p className="text-center py-8 text-muted-foreground">Belum ada aktivitas</p> : (
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-sm">{log.user?.name || 'Unknown'}</span><Badge variant="outline" className="text-xs">{log.action}</Badge><Badge variant="secondary" className="text-xs">{log.entity}</Badge></div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  )
}

// ===================== PURCHASES MODULE (WITH STATUS) =====================
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
      toast.success('Status diperbarui'); load()
    } catch { toast.error('Gagal') }
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
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
            <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.transNo}</TableCell><TableCell>{p.supplier?.name}</TableCell><TableCell>{fmtDate(p.date)}</TableCell><TableCell><StatusBadge status={p.status} map={purchaseStatusMap} /></TableCell><TableCell className="text-right font-medium">{fmtRp(p.total)}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openDetail(p.id)}><Eye className="w-4 h-4" /></Button>
                {p.status === 'DRAFT' && <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => handleStatusChange(p.id, 'APPROVED')}>Setujui</Button>}
                {p.status === 'APPROVED' && <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => handleStatusChange(p.id, 'RECEIVED')}>Terima</Button>}
                {p.status === 'DRAFT' && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}
              </div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Pembelian</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div><div><span className="text-muted-foreground">Supplier:</span> <span className="ml-2">{detail.supplier?.name}</span></div><div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div><div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={detail.status} map={purchaseStatusMap} /></span></div><div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div></div><Separator />
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
    </div>
  )
}

// ===================== SALES MODULE (WITH STATUS) =====================
function SalesModule() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Sale | null>(null)
  const [form, setForm] = useState({ customerId: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'DRAFT', items: [{ variantId: '', productId: '', qty: '1', sellPrice: '0' }] })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const [sRes, cRes, pRes] = await Promise.all([fetch(`/api/sales?${params}`), fetch('/api/customers'), fetch('/api/products')])
      setSales((await sRes.json()).data); setCustomers((await cRes.json()).data); setProducts((await pRes.json()).data)
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search, filterStatus])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    try {
      const body = { customerId: form.customerId || undefined, date: form.date, notes: form.notes || undefined, status: form.status, items: form.items.filter(i => i.variantId || i.productId).map(i => ({ variantId: i.variantId || undefined, productId: i.productId || undefined, qty: parseInt(i.qty) || 0, sellPrice: parseFloat(i.sellPrice) || 0 })) }
      if (!body.items.length) { toast.error('Item wajib'); return }
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Penjualan dicatat'); setDialogOpen(false); setForm({ customerId: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'DRAFT', items: [{ variantId: '', productId: '', qty: '1', sellPrice: '0' }] }); load()
    } catch { toast.error('Gagal') }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try { const res = await fetch(`/api/sales/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Status diperbarui'); load() } catch { toast.error('Gagal') }
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { variantId: '', productId: '', qty: '1', sellPrice: '0' }] })
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }
    if (field === 'variantId') { const p = products.find(p => p.variants?.some(v => v.id === value)); const v = p?.variants?.find(v => v.id === value); if (v) items[idx].sellPrice = String(v.sellPrice) }
    setForm({ ...form, items })
  }
  const openDetail = async (id: string) => { try { const res = await fetch(`/api/sales/${id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch {} }
  const total = form.items.reduce((s, i) => s + (parseInt(i.qty) || 0) * (parseFloat(i.sellPrice) || 0), 0)
  const allVariants = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.name, productStock: v.stock })))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari no. transaksi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PAID">Dibayar</SelectItem><SelectItem value="COMPLETED">Selesai</SelectItem><SelectItem value="CANCELLED">Dibatalkan</SelectItem></SelectContent></Select>
        <Button onClick={() => { setForm({ customerId: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'DRAFT', items: [{ variantId: '', productId: '', qty: '1', sellPrice: '0' }] }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Customer</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!sales.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : sales.map(s => (
            <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{s.customer?.name || 'Umum'}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell><StatusBadge status={s.status} map={saleStatusMap} /></TableCell><TableCell className="text-right font-medium">{fmtRp(s.total)}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button>
                {s.status === 'DRAFT' && <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => handleStatusChange(s.id, 'PAID')}>Bayar</Button>}
                {s.status === 'PAID' && <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => handleStatusChange(s.id, 'COMPLETED')}>Selesai</Button>}
                {s.status === 'DRAFT' && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}
              </div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Penjualan</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div><div><span className="text-muted-foreground">Customer:</span> <span className="ml-2">{detail.customer?.name || 'Umum'}</span></div><div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div><div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={detail.status} map={saleStatusMap} /></span></div><div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div></div><Separator />
          <Table><TableHeader><TableRow><TableHead>Produk/Varian</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
            <TableBody>{detail.items?.map((item: any) => <TableRow key={item.id}><TableCell>{item.variant?.name || item.product?.name || '-'}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">{fmtRp(item.sellPrice)}</TableCell><TableCell className="text-right">{fmtRp(item.qty * item.sellPrice)}</TableCell></TableRow>)}</TableBody></Table>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Tambah Penjualan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>Customer</Label><Select value={form.customerId || 'none'} onValueChange={v => setForm({ ...form, customerId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="none">Umum</SelectItem>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger /><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PAID">Dibayar</SelectItem><SelectItem value="COMPLETED">Selesai</SelectItem></SelectContent></Select></div></div>
          <div className="space-y-2"><Label>Catatan</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Separator />
          <div className="space-y-2"><div className="flex items-center justify-between"><Label>Item</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Tambah</Button></div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5"><Select value={item.variantId} onValueChange={v => updateItem(idx, 'variantId', v)}><SelectTrigger><SelectValue placeholder="Pilih varian" /></SelectTrigger><SelectContent>{allVariants.map(v => <SelectItem key={v.id} value={v.id}>{v.productName} — {v.name} (Stok: {v.productStock})</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></div>
                <div className="col-span-3"><Input type="number" placeholder="Harga" value={item.sellPrice} onChange={e => updateItem(idx, 'sellPrice', e.target.value)} /></div>
                <div className="col-span-2 flex justify-end">{form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div>
              </div>
            ))}
          </div>
          <div className="text-right text-lg font-bold">Total: {fmtRp(total)}</div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

// ===================== STOCK MUTATIONS MODULE =====================
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

// ===================== REPORTS MODULE =====================
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
      const res = await fetch(`/api/reports?${params}`); setData((await res.json()).data)
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
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
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
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Pembelian</CardTitle></CardHeader><CardContent>
              {data?.grouped?.length > 0 ? <><div className="mb-4"><span className="text-muted-foreground">Total: </span><span className="text-xl font-bold">{fmtRp(data.grandTotal || 0)}</span></div><Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody></Table></> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
            </CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="stock" className="space-y-4">
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
            <><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Varian</p><p className="text-2xl font-bold">{fmt(data?.totalProducts || 0)}</p></CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Stok Menipis</p><p className="text-2xl font-bold text-amber-600">{fmt(data?.lowStockCount || 0)}</p></CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Nilai Persediaan</p><p className="text-2xl font-bold">{fmtRp(data?.totalInventoryValue || 0)}</p></CardContent></Card>
            </div>
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Laporan Stok (Per Varian)</CardTitle></CardHeader><CardContent>
              {data?.products?.length > 0 ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Varian</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-center">Min</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{data.products.map((p: any) => <TableRow key={p.id}><TableCell className="font-medium">{p.name || p.productName}</TableCell><TableCell>{p.variantName || '-'}</TableCell><TableCell className="text-center">{p.stock}</TableCell><TableCell className="text-center">{p.minStock}</TableCell><TableCell className="text-right">{fmtRp(p.stockValue)}</TableCell>
                  <TableCell><Badge variant={p.stock <= p.minStock ? (p.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={p.stock > p.minStock ? 'bg-emerald-100 text-emerald-700' : p.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{p.stock <= 0 ? 'Habis' : p.stock <= p.minStock ? 'Menipis' : 'Aman'}</Badge></TableCell>
                </TableRow>)}</TableBody></Table></div> : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
            </CardContent></Card></>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===================== USER MANAGEMENT MODULE =====================
function UserManagementModule() {
  const { currentUser } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', isActive: true })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`); const data = await res.json(); setUsers(data.data.map((u: any) => { const { password, ...rest } = u; return rest })) } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) { toast.error('Field wajib harus diisi'); return }
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive }
      if (form.password) body.password = form.password
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', email: '', password: '', role: 'staff', isActive: true }); load()
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
        <Button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'staff', isActive: true }); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!users.length ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : users.map(u => (
            <TableRow key={u.id}><TableCell className="font-medium">{u.name}</TableCell><TableCell>{u.email}</TableCell><TableCell><Badge className={u.role === 'owner' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Badge></TableCell><TableCell><Badge variant={u.isActive ? 'default' : 'secondary'} className={u.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>{currentUser?.id !== u.id && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} User</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="space-y-2"><Label>{editing ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div><div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger /><SelectContent><SelectItem value="owner">Owner</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave}>Simpan</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

// ===================== MAIN APP =====================
export default function InventraApp() {
  const { currentUser, activePage, sidebarOpen, setSidebarOpen } = useAppStore()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!seeded) { fetch('/api/seed').then(() => setSeeded(true)).catch(() => setSeeded(true)) }
  }, [seeded])

  if (!currentUser) return <LoginScreen />

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <OverviewModule />
      case 'products': return <ProductsModule />
      case 'categories': return <CategoriesModule />
      case 'suppliers': return <SuppliersModule />
      case 'customers': return <CustomersModule />
      case 'purchases': return <PurchasesModule />
      case 'sales': return <SalesModule />
      case 'stock-mutations': return <StockMutationsModule />
      case 'warehouses': return <WarehousesModule />
      case 'activity-logs': return <ActivityLogModule />
      case 'reports': return <ReportsModule />
      case 'user-management': return <UserManagementModule />
      default: return <OverviewModule />
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-rose-50/30">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-6">{renderPage()}</main>
      </div>
    </div>
  )
}
