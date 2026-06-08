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
import QuickSaleDialog from '@/components/inventra/shared/quick-sale-dialog'

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">
        {title}
      </h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md">
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
    setQuickActionOpen,
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
        setQuickActionOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchOpen, setQuickActionOpen])

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
        return <UserManagementModule />
      case 'branch':
        return <ComingSoonPage title="Cabang" />
      case 'branding':
        return <ComingSoonPage title="Branding" />
      case 'doc-numbering':
        return <ComingSoonPage title="Nomor Dokumen" />

      // Legacy redirects (old page keys that may persist in localStorage)
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
    <div className="min-h-screen flex bg-[#f4f6fb] dark:bg-[#0f1117]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-4 lg:p-8 pb-20 lg:pb-8">{renderPage()}</main>
      </div>
      <GlobalSearch />
      <QuickSaleDialog />
      {/* Mobile Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 lg:hidden z-40">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-12 h-12 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => setQuickActionOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        >
          <ShoppingBag className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
