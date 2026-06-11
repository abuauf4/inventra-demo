'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Construction, Loader2 } from 'lucide-react'

// Workspace
import WorkspaceHome from '@/components/inventra/workspace/workspace-home'

// Shared UI
import LoginScreen from '@/components/inventra/shared/login-screen'
import Sidebar from '@/components/inventra/shared/sidebar'
import Header from '@/components/inventra/shared/header'
import GlobalSearch from '@/components/inventra/shared/global-search'
import SpeedDialFAB from '@/components/inventra/shared/speed-dial-fab'

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
import TrashModule from '@/components/inventra/trash/trash-module'

// ===================== COMING SOON PLACEHOLDER =====================
function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
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
    _hasHydrated,
    activePage,
    sidebarOpen,
    setSidebarOpen,
    setSearchOpen,
    setActivePage,
    setOpenSalesForm,
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
        setOpenSalesForm(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchOpen, setActivePage, setOpenSalesForm])

  // Timeout fallback: if hydration takes too long, force render anyway
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false)
  useEffect(() => {
    if (!_hasHydrated) {
      const timer = setTimeout(() => setHydrationTimedOut(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [_hasHydrated, hydrationTimedOut])

  // Show minimal splash while Zustand rehydrates from localStorage
  // But don't block forever - timeout after 3 seconds
  if (!_hasHydrated && !hydrationTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      </div>
    )
  }

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
      case 'trash':
        return <TrashModule />
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
    <div className="min-h-screen flex lg:items-start bg-stone-50/80 dark:bg-[#0f1117] transition-colors duration-300">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 lg:pt-6 pb-4 transition-colors duration-500">{renderPage()}</main>
      </div>
      <GlobalSearch />
      {/* Mobile Speed Dial FAB */}
      <SpeedDialFAB />
    </div>
  )
}
