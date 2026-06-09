'use client'

import { useAppStore } from '@/lib/store'
import { menuSections } from './sidebar'

import { Menu, Bell, MoreVertical, LogOut, Search, ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function Header() {
  const {
    activePage,
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    setCurrentUser,
    notifications,
    markNotificationRead,
    setSearchOpen,
    setQuickActionOpen,
  } = useAppStore()

  const allItems = menuSections.flatMap((s) => s.items)
  const label = allItems.find((m) => m.key === activePage)?.label || 'Home'
  const unread = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-md border-b border-stone-200/60 dark:border-white/[0.06] px-4 lg:px-6 h-14 flex items-center gap-3">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-stone-400"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Page title */}
      <h2 className="text-[15px] font-semibold text-stone-800 dark:text-stone-200">
        {label}
      </h2>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-sm text-stone-400 transition-colors border border-stone-200/60 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/[0.06] min-w-[180px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-stone-400 dark:text-stone-500">Cari...</span>
        <kbd className="ml-auto text-[10px] bg-white dark:bg-white/[0.06] px-1.5 py-0.5 rounded border border-stone-200 dark:border-white/[0.06] font-mono text-stone-300 dark:text-stone-500">
          Ctrl+K
        </kbd>
      </button>

      {/* Quick Sale */}
      <Button
        variant="ghost"
        size="sm"
        className="hidden sm:flex text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5 text-xs font-medium"
        onClick={() => setQuickActionOpen(true)}
      >
        <ShoppingBag className="w-4 h-4" />
        <span className="hidden md:inline">Jual Cepat</span>
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 rounded-xl dark:bg-[#1a1f2e] dark:border-white/[0.06]"
        >
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-stone-400 dark:text-stone-500">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.slice(0, 5).map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className="flex flex-col items-start gap-1 p-3"
              >
                <span className="text-sm dark:text-stone-200">{n.message}</span>
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  {n.createdAt}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4 text-stone-400 dark:text-stone-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-xl dark:bg-[#1a1f2e] dark:border-white/[0.06]"
        >
          <DropdownMenuItem
            onClick={() => {
              setCurrentUser(null)
            }}
            className="text-red-600 dark:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default Header
