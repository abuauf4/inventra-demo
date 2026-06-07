'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'

// Icons
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Truck,
  Users,
  ShoppingCart,
  ShoppingBag,
  ArrowLeftRight,
  FileBarChart,
  UserCog,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Box,
  DollarSign,
  RefreshCw,
  MoreVertical,
  Check,
  Save,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// ===================== TYPES =====================
interface Category { id: string; name: string; description?: string; _count?: { products: number }; createdAt: string }
interface Supplier { id: string; name: string; pic?: string; phone?: string; email?: string; address?: string; notes?: string; _count?: { purchases: number; products: number }; createdAt: string }
interface Customer { id: string; name: string; phone?: string; email?: string; address?: string; notes?: string; _count?: { sales: number }; createdAt: string }
interface Product { id: string; name: string; sku: string; categoryId: string; supplierId?: string; buyPrice: number; sellPrice: number; stock: number; minStock: number; isActive: boolean; category?: Category; supplier?: Supplier; createdAt: string }
interface PurchaseItem { id?: string; purchaseId?: string; productId: string; qty: number; buyPrice: number; product?: Product }
interface SaleItem { id?: string; saleId?: string; productId: string; qty: number; sellPrice: number; product?: Product }
interface Purchase { id: string; transNo: string; supplierId: string; date: string; total: number; notes?: string; supplier?: Supplier; items: PurchaseItem[]; createdAt: string }
interface Sale { id: string; transNo: string; customerId?: string; date: string; total: number; notes?: string; customer?: Customer; items: SaleItem[]; createdAt: string }
interface StockMutation { id: string; productId: string; type: string; qty: number; note?: string; referenceId?: string; product?: Product; createdAt: string }
interface User { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }
interface DashboardData {
  totalProducts: number; totalCustomers: number; totalSuppliers: number;
  totalSales: number; totalPurchases: number;
  lowStockProducts: Product[]; recentTransactions: { type: string; transNo: string; date: string; total: number }[]
}

// ===================== FORMAT HELPERS =====================
const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n)
const fmtRp = (n: number) => `Rp ${fmt(n)}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (data.success) {
        setCurrentUser(data.user)
        toast.success(`Selamat datang, ${data.user.name}!`)
      } else {
        toast.error(data.message || 'Login gagal')
      }
    } catch { toast.error('Terjadi kesalahan') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">NAUKA INVENTRA</CardTitle>
          <CardDescription>Sistem Operasional Bisnis untuk UMKM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="owner@inventra.id" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleLogin} disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Default: owner@inventra.id / owner123
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== SIDEBAR =====================
const menuItems: { key: AppPage; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { key: 'products', label: 'Produk', icon: <Package className="w-5 h-5" /> },
  { key: 'categories', label: 'Kategori', icon: <FolderOpen className="w-5 h-5" /> },
  { key: 'suppliers', label: 'Supplier', icon: <Truck className="w-5 h-5" /> },
  { key: 'customers', label: 'Customer', icon: <Users className="w-5 h-5" /> },
  { key: 'purchases', label: 'Pembelian', icon: <ShoppingCart className="w-5 h-5" /> },
  { key: 'sales', label: 'Penjualan', icon: <ShoppingBag className="w-5 h-5" /> },
  { key: 'stock-mutations', label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-5 h-5" /> },
  { key: 'reports', label: 'Laporan', icon: <FileBarChart className="w-5 h-5" /> },
  { key: 'user-management', label: 'User Management', icon: <UserCog className="w-5 h-5" /> },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser } = useAppStore()

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">NAUKA INVENTRA</h1>
            <p className="text-xs text-muted-foreground">Sistem Operasional Bisnis</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-180px)]">
          <nav className="p-2 space-y-1">
            {menuItems.map(item => (
              <button key={item.key} onClick={() => { setActivePage(item.key); onClose() }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activePage === item.key ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>
        {currentUser && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{currentUser.role}</p>
              </div>
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
  const [notifOpen, setNotifOpen] = useState(false)
  const label = menuItems.find(m => m.key === activePage)?.label || 'Dashboard'
  const unread = notifications.filter(n => !n.read).length

  const handleLogout = () => { setCurrentUser(null); toast.success('Berhasil logout') }

  return (
    <header className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu className="w-5 h-5" />
      </Button>
      <h2 className="text-lg font-semibold">{label}</h2>
      <div className="flex-1" />
      <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">{unread}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada notifikasi</div>
          ) : notifications.slice(0, 5).map(n => (
            <DropdownMenuItem key={n.id} onClick={() => markNotificationRead(n.id)} className="flex flex-col items-start gap-1 p-3">
              <span className="text-sm">{n.message}</span>
              <span className="text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleLogout} className="text-red-600"><LogOut className="w-4 h-4 mr-2" />Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

// ===================== DASHBOARD =====================
function DashboardModule() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const d = await res.json()
      setData(d.data)
    } catch { toast.error('Gagal memuat dashboard') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div>

  const cards = [
    { label: 'Total Produk', value: fmt(data.totalProducts), icon: <Package className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Customer', value: fmt(data.totalCustomers), icon: <Users className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Supplier', value: fmt(data.totalSuppliers), icon: <Truck className="w-5 h-5" />, color: 'bg-orange-50 text-orange-600' },
    { label: 'Total Penjualan', value: fmtRp(data.totalSales), icon: <TrendingUp className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Pembelian', value: fmtRp(data.totalPurchases), icon: <TrendingDown className="w-5 h-5" />, color: 'bg-rose-50 text-rose-600' },
    { label: 'Stok Menipis', value: fmt(data.lowStockProducts.length), icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${c.color}`}>{c.icon}</div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-xl font-bold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.lowStockProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min. Stok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStockProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell className="text-right"><Badge variant={p.stock <= 0 ? 'destructive' : 'secondary'}>{p.stock}</Badge></TableCell>
                    <TableCell className="text-right">{p.minStock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={t.type === 'sale' ? 'default' : 'secondary'} className={t.type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                        {t.type === 'sale' ? 'Penjualan' : 'Pembelian'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{t.transNo}</TableCell>
                    <TableCell>{fmtDate(t.date)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtRp(t.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
    try {
      const res = await fetch(`/api/categories?search=${encodeURIComponent(search)}`)
      setCategories((await res.json()).data)
    } catch { toast.error('Gagal memuat kategori') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama kategori harus diisi'); return }
    try {
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success(editing ? 'Kategori diperbarui' : 'Kategori ditambahkan')
      setDialogOpen(false); setEditing(null); setForm({ name: '', description: '' })
      load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('Kategori dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const openEdit = (cat: Category) => {
    setEditing(cat); setForm({ name: cat.name, description: cat.description || '' }); setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null); setForm({ name: '', description: '' }); setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari kategori..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah Kategori</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-center">Produk</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada kategori</TableCell></TableRow>
                ) : categories.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.description || '-'}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{c._count?.products || 0}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nama Kategori</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama kategori" /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi opsional" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Kategori?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [detail, setDetail] = useState<Supplier & { purchases?: Purchase[] } | null>(null)
  const [form, setForm] = useState({ name: '', pic: '', phone: '', email: '', address: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`)
      setSuppliers((await res.json()).data)
    } catch { toast.error('Gagal memuat supplier') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama supplier harus diisi'); return }
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success(editing ? 'Supplier diperbarui' : 'Supplier ditambahkan')
      setDialogOpen(false); setEditing(null); setForm({ name: '', pic: '', phone: '', email: '', address: '', notes: '' }); load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('Supplier dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`)
      setDetail((await res.json()).data); setDetailOpen(true)
    } catch { toast.error('Gagal memuat detail') }
  }

  const openEdit = (s: Supplier) => {
    setEditing(s); setForm({ name: s.name, pic: s.pic || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null); setForm({ name: '', pic: '', phone: '', email: '', address: '', notes: '' }); setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah Supplier</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead className="text-center">Pembelian</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada supplier</TableCell></TableRow>
                ) : suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.pic || '-'}</TableCell>
                    <TableCell>{s.phone || '-'}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{s._count?.purchases || 0}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detail Supplier</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nama:</span> <span className="font-medium ml-2">{detail.name}</span></div>
                <div><span className="text-muted-foreground">PIC:</span> <span className="ml-2">{detail.pic || '-'}</span></div>
                <div><span className="text-muted-foreground">Telepon:</span> <span className="ml-2">{detail.phone || '-'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{detail.email || '-'}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> <span className="ml-2">{detail.address || '-'}</span></div>
                {detail.notes && <div className="col-span-2"><span className="text-muted-foreground">Catatan:</span> <span className="ml-2">{detail.notes}</span></div>}
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Riwayat Pembelian</h4>
                {(!detail.purchases || detail.purchases.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Belum ada pembelian</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detail.purchases.map(p => (
                        <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.transNo}</TableCell><TableCell>{fmtDate(p.date)}</TableCell><TableCell className="text-right">{fmtRp(p.total)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'Tambah Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nama Supplier *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>PIC</Label><Input value={form.pic} onChange={e => setForm({ ...form, pic: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Supplier?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [detail, setDetail] = useState<Customer & { sales?: Sale[] } | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`)
      setCustomers((await res.json()).data)
    } catch { toast.error('Gagal memuat customer') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama customer harus diisi'); return }
    try {
      const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success(editing ? 'Customer diperbarui' : 'Customer ditambahkan')
      setDialogOpen(false); setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('Customer dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const openDetail = async (id: string) => {
    try { const res = await fetch(`/api/customers/${id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch { toast.error('Gagal memuat detail') }
  }

  const openEdit = (c: Customer) => {
    setEditing(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah Customer</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Email</TableHead><TableHead className="text-center">Penjualan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada customer</TableCell></TableRow>
                ) : customers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{c._count?.sales || 0}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(c.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detail Customer</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nama:</span> <span className="font-medium ml-2">{detail.name}</span></div>
                <div><span className="text-muted-foreground">Telepon:</span> <span className="ml-2">{detail.phone || '-'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{detail.email || '-'}</span></div>
                <div><span className="text-muted-foreground">Alamat:</span> <span className="ml-2">{detail.address || '-'}</span></div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Riwayat Penjualan</h4>
                {(!detail.sales || detail.sales.length === 0) ? <p className="text-sm text-muted-foreground">Belum ada penjualan</p> : (
                  <Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>{detail.sales.map(s => <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell className="text-right">{fmtRp(s.total)}</TableCell></TableRow>)}</TableBody></Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Tambah Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nama Customer *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Customer?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===================== PRODUCTS MODULE =====================
function ProductsModule() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', categoryId: '', supplierId: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0', isActive: true })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCategory && filterCategory !== 'all') params.set('categoryId', filterCategory)
      if (filterLowStock) params.set('lowStock', 'true')
      const [pRes, cRes, sRes] = await Promise.all([
        fetch(`/api/products?${params}`),
        fetch('/api/categories'),
        fetch('/api/suppliers')
      ])
      setProducts((await pRes.json()).data)
      setCategories((await cRes.json()).data)
      setSuppliers((await sRes.json()).data)
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [search, filterCategory, filterLowStock])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.categoryId) { toast.error('Nama, SKU, dan Kategori harus diisi'); return }
    try {
      const body = {
        name: form.name, sku: form.sku, categoryId: form.categoryId,
        supplierId: form.supplierId || undefined,
        buyPrice: parseFloat(form.buyPrice) || 0, sellPrice: parseFloat(form.sellPrice) || 0,
        stock: parseInt(form.stock) || 0, minStock: parseInt(form.minStock) || 0, isActive: form.isActive
      }
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success(editing ? 'Produk diperbarui' : 'Produk ditambahkan')
      setDialogOpen(false); setEditing(null); setForm({ name: '', sku: '', categoryId: '', supplierId: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0', isActive: true }); load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('Produk dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, sku: p.sku, categoryId: p.categoryId, supplierId: p.supplierId || '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: String(p.stock), minStock: String(p.minStock), isActive: p.isActive })
    setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', sku: '', categoryId: '', supplierId: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0', isActive: true })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant={filterLowStock ? 'default' : 'outline'} onClick={() => setFilterLowStock(!filterLowStock)} className={filterLowStock ? 'bg-amber-600 hover:bg-amber-700' : ''}>
          <AlertTriangle className="w-4 h-4 mr-2" />Stok Menipis
        </Button>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah Produk</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada produk</TableCell></TableRow>
                  ) : products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell><Badge variant="outline">{p.category?.name || '-'}</Badge></TableCell>
                      <TableCell className="text-right">{fmtRp(p.buyPrice)}</TableCell>
                      <TableCell className="text-right">{fmtRp(p.sellPrice)}</TableCell>
                      <TableCell className="text-center"><Badge variant={p.stock <= p.minStock ? (p.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={p.stock > p.minStock ? 'bg-emerald-100 text-emerald-700' : p.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{p.stock}</Badge></TableCell>
                      <TableCell><Badge variant={p.isActive ? 'default' : 'secondary'} className={p.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nama Produk *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Kategori *</Label><Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Supplier</Label><Select value={form.supplierId || 'none'} onValueChange={v => setForm({ ...form, supplierId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa Supplier</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Harga Beli</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div>
              <div className="space-y-2"><Label>Harga Jual</Label><Input type="number" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Stok</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Minimum Stok</Label><Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Produk?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===================== PURCHASES MODULE =====================
function PurchasesModule() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Purchase | null>(null)
  const [form, setForm] = useState({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ productId: '', qty: '1', buyPrice: '0' }] })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const [pRes, sRes, prRes] = await Promise.all([
        fetch(`/api/purchases?${params}`),
        fetch('/api/suppliers'),
        fetch('/api/products')
      ])
      setPurchases((await pRes.json()).data)
      setSuppliers((await sRes.json()).data)
      setProducts((await prRes.json()).data)
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.supplierId || form.items.length === 0 || form.items.some(i => !i.productId)) {
      toast.error('Supplier dan item harus diisi'); return
    }
    try {
      const body = {
        supplierId: form.supplierId, date: form.date, notes: form.notes || undefined,
        items: form.items.map(i => ({ productId: i.productId, qty: parseInt(i.qty) || 0, buyPrice: parseFloat(i.buyPrice) || 0 }))
      }
      const res = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success('Pembelian berhasil dicatat')
      setDialogOpen(false)
      setForm({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ productId: '', qty: '1', buyPrice: '0' }] })
      load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('Pembelian dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', qty: '1', buyPrice: '0' }] })
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) items[idx].buyPrice = String(product.buyPrice)
    }
    setForm({ ...form, items })
  }

  const openDetail = async (id: string) => {
    try { const res = await fetch(`/api/purchases/${id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch { toast.error('Gagal memuat detail') }
  }

  const total = form.items.reduce((sum, i) => sum + (parseInt(i.qty) || 0) * (parseFloat(i.buyPrice) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari no. transaksi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ productId: '', qty: '1', buyPrice: '0' }] }); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah Pembelian</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Supplier</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada pembelian</TableCell></TableRow>
                ) : purchases.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.transNo}</TableCell>
                    <TableCell>{p.supplier?.name || '-'}</TableCell>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtRp(p.total)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(p.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detail Pembelian</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div>
                <div><span className="text-muted-foreground">Supplier:</span> <span className="ml-2">{detail.supplier?.name}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div>
                {detail.notes && <div className="col-span-2"><span className="text-muted-foreground">Catatan:</span> <span className="ml-2">{detail.notes}</span></div>}
              </div>
              <Separator />
              <Table>
                <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detail.items?.map(item => (
                    <TableRow key={item.id}><TableCell>{item.product?.name}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">{fmtRp(item.buyPrice)}</TableCell><TableCell className="text-right">{fmtRp(item.qty * item.buyPrice)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Tambah Pembelian</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Supplier *</Label><Select value={form.supplierId} onValueChange={v => setForm({ ...form, supplierId: v })}><SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tanggal *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Item Pembelian</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Tambah Item</Button></div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5"><Select value={item.productId} onValueChange={v => updateItem(idx, 'productId', v)}><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></div>
                  <div className="col-span-3"><Input type="number" placeholder="Harga Beli" value={item.buyPrice} onChange={e => updateItem(idx, 'buyPrice', e.target.value)} /></div>
                  <div className="col-span-2 flex justify-end">{form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div>
                </div>
              ))}
            </div>
            <div className="text-right text-lg font-bold">Total: {fmtRp(total)}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan Pembelian</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Pembelian?</AlertDialogTitle><AlertDialogDescription>Stok akan dikembalikan. Apakah Anda yakin?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===================== SALES MODULE =====================
function SalesModule() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Sale | null>(null)
  const [form, setForm] = useState({ customerId: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ productId: '', qty: '1', sellPrice: '0' }] })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const [sRes, cRes, pRes] = await Promise.all([
        fetch(`/api/sales?${params}`),
        fetch('/api/customers'),
        fetch('/api/products')
      ])
      setSales((await sRes.json()).data)
      setCustomers((await cRes.json()).data)
      setProducts((await pRes.json()).data)
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (form.items.length === 0 || form.items.some(i => !i.productId)) {
      toast.error('Item penjualan harus diisi'); return
    }
    try {
      const body = {
        customerId: form.customerId || undefined, date: form.date, notes: form.notes || undefined,
        items: form.items.map(i => ({ productId: i.productId, qty: parseInt(i.qty) || 0, sellPrice: parseFloat(i.sellPrice) || 0 }))
      }
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success('Penjualan berhasil dicatat')
      setDialogOpen(false)
      setForm({ customerId: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ productId: '', qty: '1', sellPrice: '0' }] })
      load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('Penjualan dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', qty: '1', sellPrice: '0' }] })
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) items[idx].sellPrice = String(product.sellPrice)
    }
    setForm({ ...form, items })
  }

  const openDetail = async (id: string) => {
    try { const res = await fetch(`/api/sales/${id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch { toast.error('Gagal memuat detail') }
  }

  const total = form.items.reduce((sum, i) => sum + (parseInt(i.qty) || 0) * (parseFloat(i.sellPrice) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari no. transaksi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ customerId: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ productId: '', qty: '1', sellPrice: '0' }] }); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah Penjualan</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Customer</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada penjualan</TableCell></TableRow>
                ) : sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.transNo}</TableCell>
                    <TableCell>{s.customer?.name || 'Umum'}</TableCell>
                    <TableCell>{fmtDate(s.date)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtRp(s.total)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detail Penjualan</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div>
                <div><span className="text-muted-foreground">Customer:</span> <span className="ml-2">{detail.customer?.name || 'Umum'}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div>
              </div>
              <Separator />
              <Table>
                <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>{detail.items?.map(item => <TableRow key={item.id}><TableCell>{item.product?.name}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">{fmtRp(item.sellPrice)}</TableCell><TableCell className="text-right">{fmtRp(item.qty * item.sellPrice)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Tambah Penjualan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Customer</Label><Select value={form.customerId || 'none'} onValueChange={v => setForm({ ...form, customerId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Pilih customer" /></SelectTrigger><SelectContent><SelectItem value="none">Umum</SelectItem>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tanggal *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Item Penjualan</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Tambah Item</Button></div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5"><Select value={item.productId} onValueChange={v => updateItem(idx, 'productId', v)}><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></div>
                  <div className="col-span-3"><Input type="number" placeholder="Harga Jual" value={item.sellPrice} onChange={e => updateItem(idx, 'sellPrice', e.target.value)} /></div>
                  <div className="col-span-2 flex justify-end">{form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}</div>
                </div>
              ))}
            </div>
            <div className="text-right text-lg font-bold">Total: {fmtRp(total)}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan Penjualan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Penjualan?</AlertDialogTitle><AlertDialogDescription>Stok akan dikembalikan. Apakah Anda yakin?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===================== STOCK MUTATIONS MODULE =====================
function StockMutationsModule() {
  const [mutations, setMutations] = useState<StockMutation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filterType, setFilterType] = useState('all')
  const [filterProduct, setFilterProduct] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType && filterType !== 'all') params.set('type', filterType)
      if (filterProduct && filterProduct !== 'all') params.set('productId', filterProduct)
      const [mRes, pRes] = await Promise.all([fetch(`/api/stock-mutations?${params}`), fetch('/api/products')])
      setMutations((await mRes.json()).data)
      setProducts((await pRes.json()).data)
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [filterType, filterProduct])

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
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Tipe</SelectItem><SelectItem value="IN">Barang Masuk</SelectItem><SelectItem value="OUT">Barang Keluar</SelectItem><SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem></SelectContent>
        </Select>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Semua Produk" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Produk</SelectItem>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Produk</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
              <TableBody>
                {mutations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada mutasi stok</TableCell></TableRow>
                ) : mutations.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtDateTime(m.createdAt)}</TableCell>
                    <TableCell className="font-medium">{m.product?.name || '-'}</TableCell>
                    <TableCell>{getTypeBadge(m.type)}</TableCell>
                    <TableCell className="text-right font-medium">{m.type === 'OUT' ? `-${m.qty}` : `+${m.qty}`}</TableCell>
                    <TableCell className="text-muted-foreground">{m.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
      if (tab !== 'stock') {
        params.set('period', period)
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
      }
      const res = await fetch(`/api/reports?${params}`)
      setData((await res.json()).data)
    } catch { toast.error('Gagal memuat laporan') }
    finally { setLoading(false) }
  }, [tab, period, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sales">Laporan Penjualan</TabsTrigger>
          <TabsTrigger value="purchases">Laporan Pembelian</TabsTrigger>
          <TabsTrigger value="stock">Laporan Stok</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </>
            )}
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
            <Card>
              <CardHeader><CardTitle>Laporan Penjualan</CardTitle></CardHeader>
              <CardContent>
                {data?.grouped?.length > 0 ? (
                  <>
                    <div className="mb-4"><span className="text-muted-foreground">Total Penjualan: </span><span className="text-xl font-bold">{fmtRp(data.grandTotal || 0)}</span></div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah Transaksi</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </>
                ) : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </>
            )}
            <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
            <Card>
              <CardHeader><CardTitle>Laporan Pembelian</CardTitle></CardHeader>
              <CardContent>
                {data?.grouped?.length > 0 ? (
                  <>
                    <div className="mb-4"><span className="text-muted-foreground">Total Pembelian: </span><span className="text-xl font-bold">{fmtRp(data.grandTotal || 0)}</span></div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Periode</TableHead><TableHead className="text-center">Jumlah Transaksi</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>{data.grouped.map((item: any, i: number) => <TableRow key={i}><TableCell>{item.period}</TableCell><TableCell className="text-center">{item.count}</TableCell><TableCell className="text-right font-medium">{fmtRp(item.totalAmount)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </>
                ) : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Produk</p><p className="text-2xl font-bold">{fmt(data?.totalProducts || 0)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Stok Menipis</p><p className="text-2xl font-bold text-amber-600">{fmt(data?.lowStockCount || 0)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Nilai Persediaan</p><p className="text-2xl font-bold">{fmtRp(data?.totalInventoryValue || 0)}</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Laporan Stok</CardTitle></CardHeader>
                <CardContent>
                  {data?.products?.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>SKU</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-center">Min. Stok</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{data.products.map((p: any) => (
                        <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="font-mono text-sm">{p.sku}</TableCell><TableCell className="text-center">{p.stock}</TableCell><TableCell className="text-center">{p.minStock}</TableCell><TableCell className="text-right">{fmtRp(p.stockValue)}</TableCell>
                          <TableCell><Badge variant={p.stock <= p.minStock ? (p.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={p.stock > p.minStock ? 'bg-emerald-100 text-emerald-700' : p.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{p.stock <= 0 ? 'Habis' : p.stock <= p.minStock ? 'Menipis' : 'Aman'}</Badge></TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  ) : <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
                </CardContent>
              </Card>
            </>
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
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setUsers(data.data.map((u: any) => { const { password, ...rest } = u; return rest }))
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) { toast.error('Field wajib harus diisi'); return }
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive }
      if (form.password) body.password = form.password
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menyimpan'); return }
      toast.success(editing ? 'User diperbarui' : 'User ditambahkan')
      setDialogOpen(false); setEditing(null); setForm({ name: '', email: '', password: '', role: 'staff', isActive: true }); load()
    } catch { toast.error('Gagal menyimpan') }
  }

  const handleDelete = async (id: string) => {
    if (currentUser?.id === id) { toast.error('Tidak dapat menghapus akun sendiri'); setDeleteConfirm(null); return }
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal menghapus'); return }
      toast.success('User dihapus'); setDeleteConfirm(null); load()
    } catch { toast.error('Gagal menghapus') }
  }

  const openEdit = (u: User) => {
    setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive }); setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null); setForm({ name: '', email: '', password: '', role: 'staff', isActive: true }); setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari user..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Tambah User</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada user</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge className={u.role === 'owner' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Badge></TableCell>
                    <TableCell><Badge variant={u.isActive ? 'default' : 'secondary'} className={u.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Edit className="w-4 h-4" /></Button>
                        {currentUser?.id !== u.id && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Tambah User'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>{editing ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="owner">Owner</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus User?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===================== MAIN APP =====================
export default function InventraApp() {
  const { currentUser, activePage, sidebarOpen, setSidebarOpen } = useAppStore()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    // Auto-seed on first load
    if (!seeded) {
      fetch('/api/seed').then(() => setSeeded(true)).catch(() => setSeeded(true))
    }
  }, [seeded])

  if (!currentUser) return <LoginScreen />

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardModule />
      case 'products': return <ProductsModule />
      case 'categories': return <CategoriesModule />
      case 'suppliers': return <SuppliersModule />
      case 'customers': return <CustomersModule />
      case 'purchases': return <PurchasesModule />
      case 'sales': return <SalesModule />
      case 'stock-mutations': return <StockMutationsModule />
      case 'reports': return <ReportsModule />
      case 'user-management': return <UserManagementModule />
      default: return <DashboardModule />
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
