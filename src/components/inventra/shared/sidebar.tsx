'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { roleColors } from './constants'

import {
  Package, FolderOpen, Truck, Users, ShoppingCart, ShoppingBag,
  ArrowLeftRight, FileBarChart, UserCog, X,
  Warehouse as WarehouseIcon, Home,
  Briefcase, PenLine, Sun, Moon, LogOut,
  // Data Master icons
  LayoutGrid,
  // Distribusi future icons
  ClipboardList, RotateCcw,
  // Inventory future icons
  ArrowRightLeft, ClipboardCheck, Sliders,
  // Finance icons
  Receipt, CreditCard, Wallet, Banknote,
  // Accounting icons
  BookOpen, BookMarked, Scale, TrendingUp,
  // Report icons
  BarChart3, UserCircle, Truck as TruckReport,
  // Settings icons
  Building2, Palette, FileText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  /** If true, item is disabled and shows "Soon" badge */
  soon?: boolean
}

interface MenuSection {
  label: string | null
  items: MenuItem[]
}

// ===================== MENU SECTIONS — FINAL STRUCTURE =====================
// Structure based on alur kerja (workflow), not modul teknis
const menuSections: MenuSection[] = [
  {
    label: null,
    items: [
      { key: 'dashboard' as AppPage, label: 'Home', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Data Master',
    items: [
      { key: 'customers' as AppPage, label: 'Customer', icon: <Users className="w-4 h-4" /> },
      { key: 'suppliers' as AppPage, label: 'Supplier', icon: <Truck className="w-4 h-4" /> },
      { key: 'products' as AppPage, label: 'Produk', icon: <Package className="w-4 h-4" /> },
      { key: 'categories' as AppPage, label: 'Kategori', icon: <FolderOpen className="w-4 h-4" /> },
      { key: 'warehouses' as AppPage, label: 'Gudang', icon: <WarehouseIcon className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Distribusi',
    items: [
      { key: 'purchases' as AppPage, label: 'Pembelian', icon: <ShoppingCart className="w-4 h-4" /> },
      { key: 'sales' as AppPage, label: 'Penjualan', icon: <ShoppingBag className="w-4 h-4" /> },
      { key: 'sales-order' as AppPage, label: 'Sales Order', icon: <ClipboardList className="w-4 h-4" />, soon: true },
      { key: 'purchase-order' as AppPage, label: 'Purchase Order', icon: <ClipboardList className="w-4 h-4" />, soon: true },
      { key: 'sales-return' as AppPage, label: 'Retur Penjualan', icon: <RotateCcw className="w-4 h-4" />, soon: true },
      { key: 'purchase-return' as AppPage, label: 'Retur Pembelian', icon: <RotateCcw className="w-4 h-4" />, soon: true },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { key: 'stock-mutations' as AppPage, label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-4 h-4" /> },
      { key: 'warehouse-transfer' as AppPage, label: 'Transfer Gudang', icon: <ArrowRightLeft className="w-4 h-4" />, soon: true },
      { key: 'stock-opname' as AppPage, label: 'Stock Opname', icon: <ClipboardCheck className="w-4 h-4" />, soon: true },
      { key: 'stock-adjustment' as AppPage, label: 'Penyesuaian Stok', icon: <Sliders className="w-4 h-4" />, soon: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { key: 'invoice' as AppPage, label: 'Invoice', icon: <Receipt className="w-4 h-4" />, soon: true },
      { key: 'receivable' as AppPage, label: 'Piutang', icon: <CreditCard className="w-4 h-4" />, soon: true },
      { key: 'payment' as AppPage, label: 'Pelunasan', icon: <Wallet className="w-4 h-4" />, soon: true },
      { key: 'cash' as AppPage, label: 'Kas', icon: <Banknote className="w-4 h-4" />, soon: true },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { key: 'journal' as AppPage, label: 'Jurnal', icon: <BookOpen className="w-4 h-4" />, soon: true },
      { key: 'ledger' as AppPage, label: 'Buku Besar', icon: <BookMarked className="w-4 h-4" />, soon: true },
      { key: 'balance-sheet' as AppPage, label: 'Neraca', icon: <Scale className="w-4 h-4" />, soon: true },
      { key: 'profit-loss' as AppPage, label: 'Laba Rugi', icon: <TrendingUp className="w-4 h-4" />, soon: true },
    ],
  },
  {
    label: 'Report',
    items: [
      { key: 'report-sales' as AppPage, label: 'Penjualan', icon: <BarChart3 className="w-4 h-4" /> },
      { key: 'report-purchases' as AppPage, label: 'Pembelian', icon: <BarChart3 className="w-4 h-4" /> },
      { key: 'report-stock' as AppPage, label: 'Stok', icon: <BarChart3 className="w-4 h-4" /> },
      { key: 'report-customer' as AppPage, label: 'Customer', icon: <UserCircle className="w-4 h-4" />, soon: true },
      { key: 'report-supplier' as AppPage, label: 'Supplier', icon: <TruckReport className="w-4 h-4" />, soon: true },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { key: 'user-management' as AppPage, label: 'User', icon: <UserCog className="w-4 h-4" /> },
      { key: 'branch' as AppPage, label: 'Cabang', icon: <Building2 className="w-4 h-4" />, soon: true },
      { key: 'branding' as AppPage, label: 'Branding', icon: <Palette className="w-4 h-4" />, soon: true },
      { key: 'doc-numbering' as AppPage, label: 'Nomor Dokumen', icon: <FileText className="w-4 h-4" />, soon: true },
    ],
  },
]

// Export menuSections for use in Header and other components
export { menuSections }
export type { MenuItem, MenuSection }

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser, theme, toggleTheme, setCurrentUser } = useAppStore()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-[#162032] transform transition-transform duration-200 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ===== Brand Area — always dark teal ===== */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm shadow-amber-500/20">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm text-white tracking-tight">
                NAUKA INVENTRA
              </h1>
              <p className="text-[10px] text-teal-400/60 truncate">
                Sistem Operasional Bisnis
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden w-8 h-8 text-teal-400/60 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ===== Navigation — always dark teal ===== */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {menuSections.map((section, si) => {
              // Check if section has any enabled items
              const hasEnabledItems = section.items.some((item) => !item.soon)

              return (
                <div key={si}>
                  {section.label && (
                    <p className={`px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                      hasEnabledItems
                        ? 'text-teal-500/40'
                        : 'text-teal-500/20'
                    }`}>
                      {section.label}
                    </p>
                  )}
                  {section.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        if (item.soon) return // Disabled items are not clickable
                        setActivePage(item.key)
                        onClose()
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        item.soon
                          ? 'text-teal-200/20 cursor-not-allowed'
                          : activePage === item.key
                            ? 'bg-white/[0.08] text-amber-400 border-l-2 border-amber-500 pl-[10px]'
                            : 'text-teal-200/50 hover:bg-white/[0.04] hover:text-teal-100/80'
                      }`}
                    >
                      <span className={
                        item.soon
                          ? 'text-teal-400/15'
                          : activePage === item.key
                            ? 'text-amber-500'
                            : 'text-teal-400/40'
                      }>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.soon && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-teal-400/10 text-teal-400/30 uppercase tracking-wider">
                          Soon
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>
        </ScrollArea>

        {/* ===== Bottom: User + Theme + Logout — always dark ===== */}
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          {/* User */}
          {currentUser && (
            <div className="flex items-center gap-2.5 px-1">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                  roleColors[currentUser.role ?? 'staff'] || 'from-gray-400 to-gray-500'
                } flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}
              >
                {(currentUser.name ?? 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {currentUser.name ?? 'User'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-teal-400/50">
                    {roleIcons[currentUser.role ?? 'staff']}
                  </span>
                  <span className="text-[11px] text-teal-400/50 capitalize">
                    {roleLabels[currentUser.role ?? 'staff']}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Theme + Logout row */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-teal-200/50 hover:bg-white/[0.04] hover:text-teal-100/80 transition-all"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
            <button
              onClick={() => {
                setCurrentUser(null)
                toast.success('Berhasil logout')
              }}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-teal-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
