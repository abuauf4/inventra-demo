'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { menuSections } from './sidebar'
import MobileFullscreenMenu from './mobile-fullscreen-menu'

import { Menu, Bell, MoreVertical, LogOut, Search, ShoppingBag, Sun, Moon, KeyRound, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

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
    setActivePage,
    setOpenSalesForm,
    theme,
    toggleTheme,
  } = useAppStore()

  // Mobile full-screen menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Change password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error('Semua field wajib diisi')
      return
    }
    if (newPw !== confirmPw) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (newPw.length < 4) {
      toast.error('Password baru minimal 4 karakter')
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Gagal mengubah password')
        return
      }
      toast.success('Password berhasil diubah')
      setChangePasswordOpen(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch {
      toast.error('Gagal mengubah password')
    } finally {
      setSavingPw(false)
    }
  }

  const allItems = menuSections.flatMap((s) => s.items)
  const label = allItems.find((m) => m.key === activePage)?.label || 'Home'
  const unread = notifications.filter((n) => !n.read).length

  return (
    <>
      <header className="shrink-0 z-30 bg-white/60 dark:bg-[#0f1117]/60 backdrop-blur-md border-b border-stone-200/30 dark:border-white/[0.03] px-4 lg:px-6 h-14 flex items-center gap-3 transition-all duration-300">
        {/* Mobile hamburger — opens full-screen menu */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-700 hover:bg-stone-100/50 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-white/[0.04] transition-all duration-200"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        <h2
          key={activePage}
          className="text-[15px] font-semibold text-stone-800 dark:text-stone-200 tracking-tight page-enter"
        >
          {label}
        </h2>

        <div className="flex-1" />

        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-50/60 hover:bg-stone-100/60 text-sm text-stone-400 transition-all duration-200 ease-out border border-stone-200/30 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] dark:border-white/[0.03] min-w-[180px]"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-stone-400 dark:text-stone-500">Cari...</span>
          <kbd className="ml-auto text-[10px] bg-white/60 dark:bg-white/[0.03] px-1.5 py-0.5 rounded-lg border border-stone-200/40 dark:border-white/[0.04] font-mono text-stone-300 dark:text-stone-600">
            Ctrl+K
          </kbd>
        </button>

        {/* Quick Sale — navigate to Penjualan page */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50/60 dark:hover:bg-amber-950/15 gap-1.5 text-xs font-medium transition-all duration-200 ease-out rounded-xl"
          onClick={() => { setActivePage('sales'); setOpenSalesForm(true) }}
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="hidden md:inline">Jual Cepat</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative transition-all duration-200 rounded-xl hover:bg-stone-100/50">
              <Bell className="w-4 h-4 text-stone-400 dark:text-stone-500" />
              {unread > 0 && (
                <span className="badge-breathe absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold ">
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

        {/* Theme toggle — Sun/Moon icon */}
        <Button
          variant="ghost"
          size="icon"
          className="transition-all duration-200 rounded-xl hover:bg-stone-100/50"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-stone-400" />
          ) : (
            <Sun className="w-4 h-4 text-stone-500" />
          )}
        </Button>

        {/* Three-dot menu — Password + Logout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="transition-all duration-200 rounded-xl hover:bg-stone-100/50">
              <MoreVertical className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-xl dark:bg-[#1a1f2e] dark:border-white/[0.06]"
          >
            <DropdownMenuItem
              onClick={() => setChangePasswordOpen(true)}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Ganti Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentUser(null)
                toast.success('Berhasil logout')
              }}
              className="text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        if (!open) { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
        setChangePasswordOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Password saat ini</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Masukkan password saat ini"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChangePassword() } }}
              />
            </div>
            <div className="space-y-2">
              <Label>Password baru</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Masukkan password baru (min. 4 karakter)"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChangePassword() } }}
              />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi password baru</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Ulangi password baru"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChangePassword() } }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordOpen(false)
                setCurrentPw('')
                setNewPw('')
                setConfirmPw('')
              }}
              disabled={savingPw}
            >
              Batal
            </Button>
            <Button
              className="bg-stone-900 hover:bg-stone-800 text-white"
              onClick={handleChangePassword}
              disabled={savingPw}
            >
              {savingPw ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Full-Screen Menu */}
      <MobileFullscreenMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  )
}

export default Header
