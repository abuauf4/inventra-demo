import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppPage =
  | 'dashboard'
  | 'dashboard-analytics'
  | 'products'
  | 'categories'
  | 'suppliers'
  | 'customers'
  | 'purchases'
  | 'sales'
  | 'stock-mutations'
  | 'warehouses'
  | 'activity-logs'
  | 'reports'
  | 'user-management'
  | 'inbox'

export type UserRole = 'owner' | 'admin' | 'staff' | 'warehouse'

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
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  quickActionOpen: boolean
  setQuickActionOpen: (open: boolean) => void
  activeWarehouse: string
  setActiveWarehouse: (warehouse: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
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
      activeWarehouse: 'Gudang Utama',
      setActiveWarehouse: (warehouse) => set({ activeWarehouse: warehouse }),
    }),
    {
      name: 'inventra-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        activeWarehouse: state.activeWarehouse,
      }),
    }
  )
)
