'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'
import { menuSections } from './sidebar'
import { roleIcons, roleLabels } from './constants'
import {
  Home, Search, Inbox as InboxIcon, Menu,
  X, ChevronRight, Lock, Package,
} from 'lucide-react'

// ─── Mobile Menu Sheet (Bottom Sheet) ──────────────────────────────
function MobileMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser } = useAppStore()
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Track which sections are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuSections.forEach((section, i) => {
      if (section.label && section.items.some((item) => item.key === activePage)) {
        initial[i] = true
      }
    })
    return initial
  })

  // Auto-expand section when activePage changes
  useEffect(() => {
    menuSections.forEach((section, i) => {
      if (section.label && section.items.some((item) => item.key === activePage)) {
        setExpanded((prev) => (prev[i] ? prev : { ...prev, [i]: true }))
      }
    })
  }, [activePage])

  const toggleSection = (index: string) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#0f1117] rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0 border-b border-stone-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md shadow-amber-500/20">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-white">
                Inventra Menu
              </p>
              <p className="text-[10px] text-stone-400">
                {currentUser?.name} · {roleLabels[currentUser?.role ?? 'staff']}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-white/[0.04] transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          {menuSections.map((section, si) => {
            // Hide "Pengaturan" for non-owners
            if (section.label === 'Pengaturan' && currentUser?.role !== 'owner') return null

            // Home section (no label) — show inline
            if (!section.label) {
              return (
                <div key={si} className="mb-1">
                  {section.items.map((item) => {
                    const isActive = activePage === item.key && !item.soon
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          if (!item.soon) {
                            setActivePage(item.key)
                            onClose()
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300'
                            : 'text-stone-600 dark:text-stone-300 active:bg-stone-50 dark:active:bg-white/[0.02]'
                        }`}
                      >
                        <span className={isActive ? 'text-amber-500' : 'text-stone-400'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )
            }

            // Categorized sections
            const isExpanded = expanded[si] ?? false
            const hasActive = section.items.some((item) => item.key === activePage && !item.soon)

            return (
              <div key={si} className="mb-0.5">
                <button
                  onClick={() => toggleSection(String(si))}
                  className={`w-full flex items-center gap-2 px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
                    hasActive ? 'text-amber-500/70' : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  <ChevronRight
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  {section.label}
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {section.items.map((item) => {
                    const isActive = activePage === item.key && !item.soon
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          if (!item.soon) {
                            setActivePage(item.key)
                            onClose()
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                          item.soon
                            ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
                            : isActive
                              ? 'bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300'
                              : 'text-stone-600 dark:text-stone-300 active:bg-stone-50 dark:active:bg-white/[0.02]'
                        }`}
                      >
                        <span className={
                          item.soon
                            ? 'text-stone-200 dark:text-stone-700'
                            : isActive
                              ? 'text-amber-500'
                              : 'text-stone-400'
                        }>
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.soon && <Lock className="w-3 h-3 text-stone-200 dark:text-stone-700" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom safe area */}
        <div className="shrink-0 h-safe-bottom" />
      </div>
    </div>
  )
}

// ─── Bottom Navigation Bar ─────────────────────────────────────────
function MobileBottomNav() {
  const { activePage, setActivePage, setSearchOpen } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const isHome = activePage === 'dashboard'
  const isMenuActive = menuOpen || menuSections.some((section, i) => {
    if (i === 0) return false // skip Home section
    return section.items.some((item) => item.key === activePage && !item.soon)
  })

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-xl border-t border-stone-200/40 dark:border-white/[0.04]">
        <div className="flex items-center justify-around h-14 px-2">
          {/* 🏠 Home */}
          <button
            onClick={() => setActivePage('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 ${
              isHome
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500 active:text-stone-600'
            }`}
          >
            <span className={`transition-transform duration-200 ${isHome ? 'scale-110' : ''}`}>
              <Home className="w-5 h-5" />
            </span>
            <span className={`text-[10px] leading-tight ${isHome ? 'font-semibold' : 'font-medium'}`}>
              Home
            </span>
          </button>

          {/* 🔍 Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 text-stone-400 dark:text-stone-500 active:text-stone-600`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">
              Cari
            </span>
          </button>

          {/* 📥 Inbox */}
          <button
            onClick={() => setActivePage('inbox')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 ${
              activePage === 'inbox'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500 active:text-stone-600'
            }`}
          >
            <InboxIcon className="w-5 h-5" />
            <span className={`text-[10px] leading-tight ${activePage === 'inbox' ? 'font-semibold' : 'font-medium'}`}>
              Inbox
            </span>
          </button>

          {/* ☰ Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 ${
              isMenuActive
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500 active:text-stone-600'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className={`text-[10px] leading-tight ${isMenuActive ? 'font-semibold' : 'font-medium'}`}>
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Menu Bottom Sheet */}
      <MobileMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

export default MobileBottomNav
