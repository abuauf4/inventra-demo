'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Search, ShoppingBag } from 'lucide-react'

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
import ActivityLogModule from '@/components/inventra/activity-logs/activity-log-module'
import PurchasesModule from '@/components/inventra/purchases/purchases-module'
import SalesModule from '@/components/inventra/sales/sales-module'
import ReportsModule from '@/components/inventra/reports/reports-module'
import UserManagementModule from '@/components/inventra/user-management/user-management-module'
import InboxModule from '@/components/inventra/inbox/inbox-module'

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
      case 'dashboard':
        return <WorkspaceHome />
      case 'dashboard-analytics':
        return <ReportsModule />
      case 'inbox':
        return <InboxModule />
      case 'products':
        return <ProductsModule />
      case 'categories':
        return <CategoriesModule />
      case 'suppliers':
        return <SuppliersModule />
      case 'customers':
        return <CustomersModule />
      case 'purchases':
        return <PurchasesModule />
      case 'sales':
        return <SalesModule />
      case 'stock-mutations':
        return <StockMutationsModule />
      case 'warehouses':
        return <WarehousesModule />
      case 'activity-logs':
        return <ActivityLogModule />
      case 'reports':
        return <ReportsModule />
      case 'user-management':
        return <UserManagementModule />
      default:
        return <WorkspaceHome />
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f4f6fb] dark:bg-[#0f1117]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-8">{renderPage()}</main>
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
