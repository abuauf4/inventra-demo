'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'
import { menuSections } from './sidebar'
import { roleLabels, roleColors } from './constants'
import {
  X, ChevronRight, Lock, Package, Search, Sun, Moon, LogOut,
} from 'lucide-react'

// ─── Full-Screen Mobile Menu (ChatGPT mobile style) ──────────────
interface MobileFullscreenMenuProps {
  open: boolean
  onClose: () => void
}

export default function MobileFullscreenMenu({ open, onClose }: MobileFullscreenMenuProps) {
  const { activePage, setActivePage, currentUser, setSearchOpen, toggleTheme, theme, setCurrentUser } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Auto-expand section containing active page
  useEffect(() => {
    menuSections.forEach((section, i) => {
      if (section.label && section.items.some((item) => item.key === activePage)) {
        setExpanded((prev) => (prev[i] ? prev : { ...prev, [i]: true }))
      }
    })
  }, [activePage])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Scroll to active item on open
  useEffect(() => {
    if (open && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        setTimeout(() => {
          activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 350)
      }
    }
  }, [open])

  const toggleSection = (index: string) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleNavigate = (key: AppPage) => {
    setActivePage(key)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] lg:hidden flex flex-col bg-white dark:bg-[#0f1117] animate-fade-in">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-stone-100 dark:border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md shadow-amber-500/20">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-stone-800 dark:text-white tracking-tight">
            Inventra
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-white/[0.04] transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Profile card ── */}
      <div className="shrink-0 px-4 py-3 border-b border-stone-100 dark:border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${
              roleColors[currentUser?.role ?? 'staff'] || 'from-gray-400 to-gray-500'
            } flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/[0.08] shadow-lg`}
          >
            {(currentUser?.name ?? 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 dark:text-white truncate">
              {currentUser?.name ?? 'User'}
            </p>
            <p className="text-[11px] text-stone-400 capitalize">
              {roleLabels[currentUser?.role ?? 'staff']}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick actions row ── */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-b border-stone-100 dark:border-white/[0.04]">
        <button
          onClick={() => { setSearchOpen(true); onClose() }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/40 dark:border-white/[0.04] text-stone-600 dark:text-stone-300 text-sm font-medium active:scale-[0.97] transition-transform duration-150"
        >
          <Search className="w-4 h-4" />
          Cari
        </button>
        <button
          onClick={toggleTheme}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/40 dark:border-white/[0.04] text-stone-600 dark:text-stone-300 text-sm font-medium active:scale-[0.97] transition-transform duration-150"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
        <button
          onClick={() => { setCurrentUser(null); onClose() }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/40 dark:border-white/[0.04] text-red-500 dark:text-red-400 text-sm font-medium active:scale-[0.97] transition-transform duration-150"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* ── Scrollable menu ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
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
                      data-active={isActive}
                      onClick={() => { if (!item.soon) handleNavigate(item.key) }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300'
                          : 'text-stone-700 dark:text-stone-200 active:bg-stone-50 dark:active:bg-white/[0.02]'
                      }`}
                    >
                      <span className={isActive ? 'text-amber-500' : 'text-stone-400 dark:text-stone-500'}>
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
                className={`w-full flex items-center gap-2 px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 ${
                  hasActive ? 'text-amber-500/70' : 'text-stone-400 dark:text-stone-500'
                }`}
              >
                <ChevronRight
                  className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                />
                {section.label}
              </button>
              <div
                className={`overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {section.items.map((item) => {
                  const isActive = activePage === item.key && !item.soon
                  return (
                    <button
                      key={item.key}
                      data-active={isActive}
                      onClick={() => { if (!item.soon) handleNavigate(item.key) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
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
                            : 'text-stone-400 dark:text-stone-500'
                      }>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.soon && <Lock className="w-3.5 h-3.5 text-stone-200 dark:text-stone-700" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Bottom safe area ── */}
      <div className="shrink-0 pb-safe" />
    </div>
  )
}
