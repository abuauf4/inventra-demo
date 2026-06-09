'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Search, ShoppingBag, Construction } from 'lucide-react'

// Workspace
import WorkspaceHome from '@/components/inventra/workspace/workspace-home'

// Shared UI
import LoginScreen from '@/components/inventra/shared/login-screen'
import Sidebar from '@/components/inventra/shared/sidebar'
import Header from '@/components/inventra/shared/header'
import GlobalSearch from '@/components/inventra/shared/global-search'

// Business Modules
import CategoriesModule from '@/components/inventra/categories/categories-module'
import SuppliersModule from '@/components/inventra/suppliers/suppliers-module'
import CustomersModule from '@/components/inventra/customers/customers-module'
import ProductsModule from '@/components/inventra/products/products-module'
import WarehousesModule from '@/components/inventra/warehouses/warehouses-module'
import StockMutationsModule from '@/components/inventra/stock-mutations/stock-mutations-module'
import PurchasesModule from '@/components/inventra/purchases/purchases-module'
import SalesModule from '@/components/inventra/sales/sales-module'
import ReportsModule from '@/components/inventra/reports/reports-module'
import UserManagementModule from '@/components/inventra/user-management/user-management-module'

// ===================== COMING SOON PLACEHOLDER =====================
function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-stone-300 dark:text-stone-600" />
      </div>
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">
        {title}
      </h2>
      <p className="text-sm text-stone-400 max-w-sm">
        Fitur ini sedang dalam pengembangan dan akan tersedia di update mendatang.
      </p>
    </div>
  )
}

export default function InventraApp() {
  const {
    currentUser,
    activePage,
    sidebarOpen,
    setSidebarOpen,
    setSearchOpen,
    setActivePage,
    theme,
  } = useAppStore()

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.altKey && e.key === 's') {
        e.preventDefault()
        setActivePage('sales')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchOpen, setActivePage])

  if (!currentUser) return <LoginScreen />

  const renderPage = () => {
    switch (activePage) {
      // Home
      case 'dashboard':
        return <WorkspaceHome />

      // Data Master
      case 'customers':
        return <CustomersModule />
      case 'suppliers':
        return <SuppliersModule />
      case 'products':
        return <ProductsModule />
      case 'categories':
        return <CategoriesModule />
      case 'warehouses':
        return <WarehousesModule />

      // Distribusi
      case 'purchases':
        return <PurchasesModule />
      case 'sales':
        return <SalesModule />
      case 'sales-order':
        return <ComingSoonPage title="Sales Order" />
      case 'purchase-order':
        return <ComingSoonPage title="Purchase Order" />
      case 'sales-return':
        return <ComingSoonPage title="Retur Penjualan" />
      case 'purchase-return':
        return <ComingSoonPage title="Retur Pembelian" />

      // Inventory
      case 'stock-mutations':
        return <StockMutationsModule />
      case 'warehouse-transfer':
        return <ComingSoonPage title="Transfer Gudang" />
      case 'stock-opname':
        return <ComingSoonPage title="Stock Opname" />
      case 'stock-adjustment':
        return <ComingSoonPage title="Penyesuaian Stok" />

      // Finance
      case 'invoice':
        return <ComingSoonPage title="Invoice" />
      case 'receivable':
        return <ComingSoonPage title="Piutang" />
      case 'payment':
        return <ComingSoonPage title="Pelunasan" />
      case 'cash':
        return <ComingSoonPage title="Kas" />

      // Accounting
      case 'journal':
        return <ComingSoonPage title="Jurnal" />
      case 'ledger':
        return <ComingSoonPage title="Buku Besar" />
      case 'balance-sheet':
        return <ComingSoonPage title="Neraca" />
      case 'profit-loss':
        return <ComingSoonPage title="Laba Rugi" />

      // Report
      case 'report-sales':
        return <ReportsModule defaultTab="sales" />
      case 'report-purchases':
        return <ReportsModule defaultTab="purchases" />
      case 'report-stock':
        return <ReportsModule defaultTab="stock" />
      case 'report-customer':
        return <ComingSoonPage title="Report Customer" />
      case 'report-supplier':
        return <ComingSoonPage title="Report Supplier" />

      // Pengaturan
      case 'user-management':
        return currentUser.role === 'owner' ? <UserManagementModule /> : <ComingSoonPage title="User Management" />
      case 'branch':
        return <ComingSoonPage title="Cabang" />
      case 'branding':
        return <ComingSoonPage title="Branding" />
      case 'doc-numbering':
        return <ComingSoonPage title="Nomor Dokumen" />

      // Legacy redirects
      case 'dashboard-analytics':
      case 'reports':
        return <ReportsModule />
      case 'activity-logs':
        return <ComingSoonPage title="Activity Log" />
      case 'inbox':
        return <ComingSoonPage title="Inbox" />

      default:
        return <WorkspaceHome />
    }
  }

  return (
    <div className="min-h-screen flex bg-stone-50/80 dark:bg-[#0f1117] transition-colors duration-300">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main key={activePage} className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-auto transition-colors duration-500">{renderPage()}</main>
      </div>
      <GlobalSearch />
      {/* Mobile Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 lg:hidden z-40">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-11 h-11 rounded-full bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm text-stone-600 dark:text-stone-300 shadow-lg border border-stone-200/40 dark:border-stone-700/40 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActivePage('sales')}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-105 hover:from-amber-500 hover:to-amber-600 transition-all duration-300 flex items-center justify-center"
        >
          <ShoppingBag className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
