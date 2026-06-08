'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { roleColors } from './constants'

import {
  Package, FolderOpen, Truck, Users, ShoppingCart, ShoppingBag,
  ArrowLeftRight, FileBarChart, UserCog, Activity, X,
  Warehouse as WarehouseIcon, Inbox as InboxIcon, Home,
  LayoutDashboard, Briefcase, PenLine, Sun, Moon, LogOut,
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

// ===================== MENU SECTIONS =====================
const menuSections = [
  {
    label: null,
    items: [
      { key: 'dashboard' as AppPage, label: 'Home', icon: <Home className="w-4 h-4" /> },
      { key: 'inbox' as AppPage, label: 'Inbox', icon: <InboxIcon className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Analisa',
    items: [
      { key: 'dashboard-analytics' as AppPage, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { key: 'reports' as AppPage, label: 'Laporan', icon: <FileBarChart className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { key: 'products' as AppPage, label: 'Produk', icon: <Package className="w-4 h-4" /> },
      { key: 'purchases' as AppPage, label: 'Pembelian', icon: <ShoppingCart className="w-4 h-4" /> },
      { key: 'sales' as AppPage, label: 'Penjualan', icon: <ShoppingBag className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { key: 'stock-mutations' as AppPage, label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-4 h-4" /> },
      { key: 'warehouses' as AppPage, label: 'Gudang', icon: <WarehouseIcon className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Master',
    items: [
      { key: 'categories' as AppPage, label: 'Kategori', icon: <FolderOpen className="w-4 h-4" /> },
      { key: 'suppliers' as AppPage, label: 'Supplier', icon: <Truck className="w-4 h-4" /> },
      { key: 'customers' as AppPage, label: 'Customer', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'activity-logs' as AppPage, label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
      { key: 'user-management' as AppPage, label: 'User Management', icon: <UserCog className="w-4 h-4" /> },
    ],
  },
]

// Export menuSections for use in Header and other components
export { menuSections }

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser, theme, toggleTheme, setCurrentUser } = useAppStore()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-stone-50 dark:bg-stone-950 border-r border-stone-200/60 dark:border-stone-800/60 transform transition-transform duration-200 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ===== Brand Area ===== */}
        <div className="p-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shadow-sm shadow-rose-500/20">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm text-stone-900 dark:text-stone-100 tracking-tight">
                NAUKA INVENTRA
              </h1>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                Northline Apparel
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden w-8 h-8 text-stone-400"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ===== Navigation ===== */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {menuSections.map((section, si) => (
              <div key={si}>
                {section.label && (
                  <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    {section.label}
                  </p>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActivePage(item.key)
                      onClose()
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      activePage === item.key
                        ? 'bg-white dark:bg-stone-800 text-rose-700 dark:text-rose-400 shadow-sm dark:shadow-stone-900/50'
                        : 'text-stone-500 dark:text-stone-400 hover:bg-white/60 dark:hover:bg-stone-800/50 hover:text-stone-700 dark:hover:text-stone-300'
                    }`}
                  >
                    <span className={activePage === item.key ? 'text-rose-500' : ''}>
                      {item.icon}
                    </span>
                    {item.label}
                    {item.key === 'inbox' && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                        4
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* ===== Bottom: User + Theme + Logout ===== */}
        <div className="border-t border-stone-200/60 dark:border-stone-800/60 p-3 space-y-2">
          {/* User */}
          {currentUser && (
            <div className="flex items-center gap-2.5 px-1">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                  roleColors[currentUser.role] || 'from-gray-400 to-gray-500'
                } flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}
              >
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400 dark:text-stone-500">
                    {roleIcons[currentUser.role]}
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-stone-500 capitalize">
                    {roleLabels[currentUser.role]}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Theme + Logout row */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-stone-500 dark:text-stone-400 hover:bg-white/60 dark:hover:bg-stone-800/50 hover:text-stone-700 dark:hover:text-stone-300 transition-all"
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
              className="flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all"
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
