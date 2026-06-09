'use client'

import { useState, useEffect } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'
import { roleColors } from './constants'

import {
  Package, FolderOpen, Truck, Users, ShoppingCart, ShoppingBag,
  ArrowLeftRight, FileBarChart, UserCog, Activity, X,
  Warehouse as WarehouseIcon, Inbox as InboxIcon, Home,
  LayoutDashboard, Briefcase, PenLine, Sun, Moon, LogOut,
  ChevronRight, KeyRound,
  ClipboardList, RotateCcw,
  ArrowRightLeft, ClipboardCheck, Sliders,
  Receipt, CreditCard, Wallet, Banknote,
  BookOpen, BookMarked, Scale, TrendingUp,
  BarChart3, UserCircle, Truck as TruckReport,
  Building2, Palette, FileText,
  Lock, Circle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

// ===================== ROLE ICONS =====================
const roleIcons: Record<string, React.ReactNode> = {
  owner: <Briefcase className="w-3.5 h-3.5" />,
  admin: <UserCog className="w-3.5 h-3.5" />,
  staff: <PenLine className="w-3.5 h-3.5" />,
  warehouse: <WarehouseIcon className="w-3.5 h-3.5" />,
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
  warehouse: 'Gudang',
}

// ===================== MENU ITEM TYPE =====================
interface MenuItem {
  key: AppPage
  label: string
  icon: React.ReactNode
  soon?: boolean
}

interface MenuSection {
  label: string | null
  items: MenuItem[]
}

// ===================== MENU SECTIONS =====================
const menuSections: MenuSection[] = [
  {
    label: null,
    items: [
      { key: 'dashboard' as AppPage, label: 'Home', icon: <Home className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Data Master',
    items: [
      { key: 'customers' as AppPage, label: 'Customer', icon: <Users className="w-[18px] h-[18px]" /> },
      { key: 'suppliers' as AppPage, label: 'Supplier', icon: <Truck className="w-[18px] h-[18px]" /> },
      { key: 'products' as AppPage, label: 'Produk', icon: <Package className="w-[18px] h-[18px]" /> },
      { key: 'categories' as AppPage, label: 'Kategori', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
      { key: 'warehouses' as AppPage, label: 'Gudang', icon: <WarehouseIcon className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Distribusi',
    items: [
      { key: 'purchases' as AppPage, label: 'Pembelian', icon: <ShoppingCart className="w-[18px] h-[18px]" /> },
      { key: 'sales' as AppPage, label: 'Penjualan', icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
      { key: 'sales-order' as AppPage, label: 'Sales Order', icon: <ClipboardList className="w-[18px] h-[18px]" />, soon: true },
      { key: 'purchase-order' as AppPage, label: 'Purchase Order', icon: <ClipboardList className="w-[18px] h-[18px]" />, soon: true },
      { key: 'sales-return' as AppPage, label: 'Retur Penjualan', icon: <RotateCcw className="w-[18px] h-[18px]" />, soon: true },
      { key: 'purchase-return' as AppPage, label: 'Retur Pembelian', icon: <RotateCcw className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { key: 'stock-mutations' as AppPage, label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-[18px] h-[18px]" /> },
      { key: 'warehouse-transfer' as AppPage, label: 'Transfer Gudang', icon: <ArrowRightLeft className="w-[18px] h-[18px]" />, soon: true },
      { key: 'stock-opname' as AppPage, label: 'Stock Opname', icon: <ClipboardCheck className="w-[18px] h-[18px]" />, soon: true },
      { key: 'stock-adjustment' as AppPage, label: 'Penyesuaian Stok', icon: <Sliders className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { key: 'invoice' as AppPage, label: 'Invoice', icon: <Receipt className="w-[18px] h-[18px]" />, soon: true },
      { key: 'receivable' as AppPage, label: 'Piutang', icon: <CreditCard className="w-[18px] h-[18px]" />, soon: true },
      { key: 'payment' as AppPage, label: 'Pelunasan', icon: <Wallet className="w-[18px] h-[18px]" />, soon: true },
      { key: 'cash' as AppPage, label: 'Kas', icon: <Banknote className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { key: 'journal' as AppPage, label: 'Jurnal', icon: <BookOpen className="w-[18px] h-[18px]" />, soon: true },
      { key: 'ledger' as AppPage, label: 'Buku Besar', icon: <BookMarked className="w-[18px] h-[18px]" />, soon: true },
      { key: 'balance-sheet' as AppPage, label: 'Neraca', icon: <Scale className="w-[18px] h-[18px]" />, soon: true },
      { key: 'profit-loss' as AppPage, label: 'Laba Rugi', icon: <TrendingUp className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Report',
    items: [
      { key: 'report-sales' as AppPage, label: 'Penjualan', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { key: 'report-purchases' as AppPage, label: 'Pembelian', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { key: 'report-stock' as AppPage, label: 'Stok', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { key: 'report-customer' as AppPage, label: 'Customer', icon: <UserCircle className="w-[18px] h-[18px]" />, soon: true },
      { key: 'report-supplier' as AppPage, label: 'Supplier', icon: <TruckReport className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { key: 'user-management' as AppPage, label: 'User', icon: <UserCog className="w-[18px] h-[18px]" /> },
      { key: 'branch' as AppPage, label: 'Cabang', icon: <Building2 className="w-[18px] h-[18px]" />, soon: true },
      { key: 'branding' as AppPage, label: 'Branding', icon: <Palette className="w-[18px] h-[18px]" />, soon: true },
      { key: 'doc-numbering' as AppPage, label: 'Nomor Dokumen', icon: <FileText className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
]

// Export menuSections for use in Header and other components
export { menuSections }
export type { MenuItem, MenuSection }

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser, theme, toggleTheme, setCurrentUser } = useAppStore()

  // Change password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error('Semua field wajib diisi')
      return
    }
    if (newPw !== confirmPw) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (newPw.length < 4) {
      toast.error('Password baru minimal 4 karakter')
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Gagal mengubah password')
        return
      }
      toast.success('Password berhasil diubah')
      setChangePasswordOpen(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch {
      toast.error('Gagal mengubah password')
    } finally {
      setSavingPw(false)
    }
  }

  // Track which sections are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuSections.forEach((section, i) => {
      if (section.label && section.items.some((item) => item.key === activePage)) {
        initial[i] = true
      }
    })
    return initial
  })

  // Auto-expand section when activePage changes
  useEffect(() => {
    menuSections.forEach((section, i) => {
      if (section.label && section.items.some((item) => item.key === activePage)) {
        setExpanded((prev) => (prev[i] ? prev : { ...prev, [i]: true }))
      }
    })
  }, [activePage])

  const toggleSection = (index: string) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-500"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[272px] bg-[#0e1525] transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-2xl lg:shadow-none overflow-hidden ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ===== Ambient Light Orbs — the breath ===== */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Primary warm orb — top right */}
          <div
            className="sidebar-ambient-orb absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/[0.07] blur-3xl"
          />
          {/* Cool orb — middle left */}
          <div
            className="sidebar-ambient-orb absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-blue-500/[0.04] blur-3xl"
            style={{ animationDelay: '3s' }}
          />
          {/* Subtle bottom warm glow */}
          <div
            className="sidebar-ambient-orb absolute -bottom-16 right-8 w-48 h-48 rounded-full bg-amber-600/[0.05] blur-3xl"
            style={{ animationDelay: '5s' }}
          />
        </div>

        {/* ===== Profile Area — the face ===== */}
        <div className="relative px-5 pt-6 pb-4">
          <div className="flex items-center gap-3.5">
            {/* Avatar — with breathing ring */}
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                  roleColors[currentUser?.role ?? 'staff'] || 'from-gray-400 to-gray-500'
                } flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/[0.08] shadow-lg transition-shadow duration-500`}
              >
                {(currentUser?.name ?? 'U').slice(0, 2).toUpperCase()}
              </div>
              {/* Online indicator — breathing */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-[#0e1525] sidebar-active-bar" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[14px] text-white/85 truncate leading-tight">
                {currentUser?.name ?? 'User'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-amber-400/60">
                  {roleIcons[currentUser?.role ?? 'staff']}
                </span>
                <span className="text-[11px] text-white/30 capitalize">
                  {roleLabels[currentUser?.role ?? 'staff']}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden w-8 h-8 text-white/30 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-xl"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Brand — with breathing icon */}
          <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-white/[0.04]">
            <div className="sidebar-brand-icon w-8 h-8 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-[13px] text-white/75 tracking-tight">
                Inventra
              </span>
              <span className="text-[10px] text-white/15 ml-1.5">
                by Nauka
              </span>
            </div>
            {/* Subtle version badge */}
            <span className="text-[9px] text-white/10 font-mono">v1.1</span>
          </div>
        </div>

        {/* ===== Navigation — the pulse ===== */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch px-3 pb-2">
          <nav className="space-y-0.5">
            {menuSections.map((section, si) => {
              // Hide "Pengaturan" section for non-owners
              if (section.label === 'Pengaturan' && currentUser?.role !== 'owner') return null

              const isGroup = section.label !== null
              const isExpanded = expanded[si] ?? false
              const hasActive = section.items.some((item) => item.key === activePage && !item.soon)

              // Ungrouped items (Home)
              if (!isGroup) {
                return (
                  <div key={si}>
                    {section.items.map((item) => {
                      const isActive = activePage === item.key
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setActivePage(item.key)
                            onClose()
                          }}
                          className={`sidebar-nav-item group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ease-out relative ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300'
                              : 'text-white/45 hover:bg-white/[0.03] hover:text-white/70'
                          }`}
                          style={{ animationDelay: `${si * 30}ms` }}
                        >
                          {/* Active left accent — breathing */}
                          {isActive && (
                            <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-amber-300 to-amber-500 rounded-r-full shadow-lg shadow-amber-400/40" />
                          )}
                          <span className={`transition-all duration-300 ${isActive ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]' : 'text-white/25 group-hover:text-white/50'}`}>
                            {item.icon}
                          </span>
                          {item.label}
                          {isActive && (
                            <Circle className="ml-auto w-1.5 h-1.5 fill-amber-400/60 text-amber-400/60 sidebar-active-bar" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              }

              // Grouped sections
              return (
                <div key={si} className="mt-1">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(String(si))}
                    className={`w-full flex items-center gap-2 px-3.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 ${
                      hasActive ? 'text-amber-400/40' : 'text-white/15'
                    } hover:text-white/30`}
                  >
                    <ChevronRight
                      className={`w-3 h-3 transition-transform duration-400 ease-out ${
                        isExpanded ? 'rotate-90' : 'rotate-0'
                      }`}
                    />
                    <span className="flex-1 text-left">{section.label}</span>
                    {hasActive && (
                      <span className="w-1 h-1 rounded-full bg-amber-400/50 sidebar-active-bar" />
                    )}
                  </button>

                  {/* Section items */}
                  <div
                    className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {section.items.map((item, ii) => {
                      const isActive = activePage === item.key && !item.soon
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            if (item.soon) return
                            setActivePage(item.key)
                            onClose()
                          }}
                          className={`sidebar-nav-item group w-full flex items-center gap-3 px-3.5 py-[7px] rounded-xl text-[13px] font-medium transition-all duration-300 ease-out relative ${
                            item.soon
                              ? 'text-white/15 cursor-not-allowed'
                              : isActive
                                ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300'
                                : 'text-white/45 hover:bg-white/[0.03] hover:text-white/70'
                          }`}
                          style={{ animationDelay: `${(si * 30) + (ii * 20)}ms` }}
                        >
                          {/* Active left accent — breathing */}
                          {isActive && (
                            <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-amber-300 to-amber-500 rounded-r-full shadow-lg shadow-amber-400/40" />
                          )}
                          <span className={`transition-all duration-300 ${
                            item.soon
                              ? 'text-white/10'
                              : isActive
                                ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]'
                                : 'text-white/20 group-hover:text-white/45'
                          }`}>
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.soon && (
                            <Lock className="w-3 h-3 text-white/[0.06]" />
                          )}
                          {isActive && !item.soon && (
                            <Circle className="w-1.5 h-1.5 fill-amber-400/50 text-amber-400/50 sidebar-active-bar" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
        </div>

        {/* ===== Bottom — the anchor ===== */}
        <div className="relative border-t border-white/[0.04] px-3 py-3 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="group w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[12px] text-white/25 hover:bg-white/[0.03] hover:text-white/50 transition-all duration-300 ease-out"
          >
            <span className="transition-transform duration-500 ease-out group-hover:rotate-12">
              {theme === 'light' ? (
                <Moon className="w-[16px] h-[16px]" />
              ) : (
                <Sun className="w-[16px] h-[16px]" />
              )}
            </span>
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="group flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-white/20 hover:bg-amber-500/[0.08] hover:text-amber-400/70 transition-all duration-300 ease-out"
            >
              <KeyRound className="w-[14px] h-[14px] transition-transform duration-300 group-hover:scale-110" />
              <span>Password</span>
            </button>
            <button
              onClick={() => {
                setCurrentUser(null)
                toast.success('Berhasil logout')
              }}
              className="group flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-white/20 hover:bg-red-500/[0.08] hover:text-red-400/70 transition-all duration-300 ease-out"
            >
              <LogOut className="w-[14px] h-[14px] transition-transform duration-300 group-hover:-translate-x-0.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        if (!open) { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
        setChangePasswordOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Password saat ini</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Masukkan password saat ini"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChangePassword() } }}
              />
            </div>
            <div className="space-y-2">
              <Label>Password baru</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Masukkan password baru (min. 4 karakter)"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChangePassword() } }}
              />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi password baru</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Ulangi password baru"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChangePassword() } }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordOpen(false)
                setCurrentPw('')
                setNewPw('')
                setConfirmPw('')
              }}
              disabled={savingPw}
            >
              Batal
            </Button>
            <Button
              className="bg-stone-900 hover:bg-stone-800 text-white"
              onClick={handleChangePassword}
              disabled={savingPw}
            >
              {savingPw ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Sidebar
