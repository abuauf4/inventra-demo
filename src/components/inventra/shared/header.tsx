'use client'

import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { fmtDateTime } from './constants'
import { menuSections } from './sidebar'

import { Menu, Bell, MoreVertical, LogOut, Search, ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

function Header() {
  const { activePage, sidebarOpen, setSidebarOpen, currentUser, setCurrentUser, notifications, markNotificationRead, setSearchOpen, setQuickActionOpen } = useAppStore()
  const allItems = menuSections.flatMap(s => s.items)
  const label = allItems.find(m => m.key === activePage)?.label || 'Home'
  const unread = notifications.filter(n => !n.read).length

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-stone-200/60 px-4 lg:px-6 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="w-5 h-5" /></Button>
      <h2 className="text-lg font-semibold text-stone-800">{label}</h2>
      <div className="flex-1" />
      <button onClick={() => setSearchOpen(true)} className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-sm text-stone-400 transition-colors border border-stone-200/60 min-w-[200px]">
        <Search className="w-4 h-4" /><span className="text-stone-400">Cari...</span><kbd className="ml-auto text-[10px] bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-stone-400">Ctrl+K</kbd>
      </button>
      <Button variant="ghost" size="sm" className="hidden sm:flex text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5 text-xs font-medium" onClick={() => setQuickActionOpen(true)}><ShoppingBag className="w-4 h-4" /><span className="hidden md:inline">Jual Cepat</span><kbd className="text-[10px] bg-emerald-100 px-1 py-0.5 rounded font-mono">Alt+S</kbd></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative"><Bell className="w-5 h-5 text-stone-400" />{unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center">{unread}</span>}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 rounded-xl">
          {notifications.length === 0 ? <div className="p-4 text-center text-sm text-stone-400">Tidak ada notifikasi</div> :
            notifications.slice(0, 5).map(n => <DropdownMenuItem key={n.id} onClick={() => markNotificationRead(n.id)} className="flex flex-col items-start gap-1 p-3"><span className="text-sm">{n.message}</span><span className="text-xs text-stone-400">{fmtDateTime(n.createdAt)}</span></DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5 text-stone-400" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl"><DropdownMenuItem onClick={() => { setCurrentUser(null); toast.success('Berhasil logout') }} className="text-red-600"><LogOut className="w-4 h-4 mr-2" />Logout</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default Header
