import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppPage =
  // Home
  | 'dashboard'
  // Data Master
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'categories'
  | 'warehouses'
  // Distribusi
  | 'purchases'
  | 'sales'
  | 'sales-order'
  | 'purchase-order'
  | 'sales-return'
  | 'purchase-return'
  // Inventory
  | 'stock-mutations'
  | 'warehouse-transfer'
  | 'stock-opname'
  | 'stock-adjustment'
  // Finance
  | 'invoice'
  | 'receivable'
  | 'payment'
  | 'cash'
  // Accounting
  | 'journal'
  | 'ledger'
  | 'balance-sheet'
  | 'profit-loss'
  // Report
  | 'report-sales'
  | 'report-purchases'
  | 'report-stock'
  | 'report-customer'
  | 'report-supplier'
  // Pengaturan
  | 'user-management'
  | 'branch'
  | 'branding'
  | 'doc-numbering'
  // Legacy (kept for backwards compat with persisted store)
  | 'dashboard-analytics'
  | 'activity-logs'
  | 'inbox'

export type UserRole = 'owner' | 'admin' | 'staff' | 'warehouse'
export type ThemeMode = 'light' | 'dark'

interface CurrentUser {
  id: string
  name: string
  username: string
  email?: string
  role: UserRole
}

interface Notification {
  id: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

interface AppState {
  activePage: AppPage
  setActivePage: (page: AppPage) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  _hasHydrated: boolean
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  quickActionOpen: boolean
  setQuickActionOpen: (open: boolean) => void
  openSalesForm: boolean
  setOpenSalesForm: (open: boolean) => void
  activeWarehouse: string
  setActiveWarehouse: (warehouse: string) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      _hasHydrated: false,
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({ notifications: [notification, ...state.notifications] })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      quickActionOpen: false,
      setQuickActionOpen: (open) => set({ quickActionOpen: open }),
      openSalesForm: false,
      setOpenSalesForm: (open) => set({ openSalesForm: open }),
      activeWarehouse: 'Gudang Utama',
      setActiveWarehouse: (warehouse) => set({ activeWarehouse: warehouse }),
      theme: 'light',
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
        set({ theme })
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'inventra-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        activeWarehouse: state.activeWarehouse,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => {
        if (typeof window !== 'undefined') {
          console.log('[Zustand] onRehydrateStorage called - rehydration starting')
        }
        return (_state, error) => {
          if (typeof window !== 'undefined') {
            console.log('[Zustand] Rehydration complete', { error: String(error) })
          }
          if (error) {
            console.error('[Zustand] Rehydration error:', error)
          }
          // Use setTimeout to avoid TDZ (temporal dead zone) issue:
          // useAppStore cannot be referenced during module initialization
          // because the const hasn't been assigned yet.
          setTimeout(() => {
            useAppStore.setState({ _hasHydrated: true })
          }, 0)
        }
      },
    }
  )
)

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ZUSTAND_STORE__ = useAppStore
}
