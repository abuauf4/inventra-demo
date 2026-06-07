'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { roleColors } from './constants'

import {
  Package, FolderOpen, Truck, Users, ShoppingCart, ShoppingBag,
  ArrowLeftRight, FileBarChart, UserCog, Activity, X,
  Warehouse as WarehouseIcon, Inbox as InboxIcon, Home,
  LayoutDashboard, Briefcase, PenLine,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

// ===================== ROLE ICONS =====================
const roleIcons: Record<string, React.ReactNode> = {
  owner: <Briefcase className="w-4 h-4" />,
  admin: <UserCog className="w-4 h-4" />,
  staff: <PenLine className="w-4 h-4" />,
  warehouse: <WarehouseIcon className="w-4 h-4" />,
}

// ===================== MENU SECTIONS =====================
const menuSections = [
  { label: null, items: [
    { key: 'dashboard' as AppPage, label: 'Home', icon: <Home className="w-4 h-4" /> },
    { key: 'inbox' as AppPage, label: 'Inbox', icon: <InboxIcon className="w-4 h-4" /> },
  ]},
  { label: 'Analisa', items: [
    { key: 'dashboard-analytics' as AppPage, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'reports' as AppPage, label: 'Laporan', icon: <FileBarChart className="w-4 h-4" /> },
  ]},
  { label: 'Transaksi', items: [
    { key: 'products' as AppPage, label: 'Produk', icon: <Package className="w-4 h-4" /> },
    { key: 'purchases' as AppPage, label: 'Pembelian', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'sales' as AppPage, label: 'Penjualan', icon: <ShoppingBag className="w-4 h-4" /> },
  ]},
  { label: 'Inventory', items: [
    { key: 'stock-mutations' as AppPage, label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { key: 'warehouses' as AppPage, label: 'Gudang', icon: <WarehouseIcon className="w-4 h-4" /> },
  ]},
  { label: 'Master', items: [
    { key: 'categories' as AppPage, label: 'Kategori', icon: <FolderOpen className="w-4 h-4" /> },
    { key: 'suppliers' as AppPage, label: 'Supplier', icon: <Truck className="w-4 h-4" /> },
    { key: 'customers' as AppPage, label: 'Customer', icon: <Users className="w-4 h-4" /> },
  ]},
  { label: 'System', items: [
    { key: 'activity-logs' as AppPage, label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
    { key: 'user-management' as AppPage, label: 'User Management', icon: <UserCog className="w-4 h-4" /> },
  ]},
]

// Export menuSections for use in Header and other components
export { menuSections }

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser } = useAppStore()
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-stone-50/80 backdrop-blur-sm border-r border-stone-200/60 transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 p-4 border-b border-stone-200/60">
          <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shadow-sm"><Package className="w-4 h-4 text-white" /></div>
          <div><h1 className="font-bold text-sm bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">NAUKA INVENTRA</h1><p className="text-[10px] text-stone-400">Northline Apparel</p></div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <ScrollArea className="h-[calc(100vh-180px)]">
          <nav className="p-2 space-y-0.5">
            {menuSections.map((section, si) => (
              <div key={si}>
                {section.label && <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{section.label}</p>}
                {section.items.map(item => (
                  <button key={item.key} onClick={() => { setActivePage(item.key); onClose() }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activePage === item.key ? 'bg-white text-rose-700 shadow-sm' : 'text-stone-500 hover:bg-white/60 hover:text-stone-700'}`}>
                    {item.icon}{item.label}
                    {item.key === 'inbox' && <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">4</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>
        {currentUser && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-stone-200/60 bg-stone-50/90 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[currentUser.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>{currentUser.name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-stone-800 truncate">{currentUser.name}</p><div className="flex items-center gap-1.5"><span className="text-[10px] text-stone-400 flex items-center gap-1">{roleIcons[currentUser.role]}<span className="capitalize">{currentUser.role}</span></span></div></div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
