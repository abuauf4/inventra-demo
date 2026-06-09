'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Plus, ShoppingBag, ShoppingCart, Users, Truck, Package,
} from 'lucide-react'

// ─── Speed Dial Action Definition ─────────────────────────────────
interface SpeedDialAction {
  key: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}

// ─── Animation Constants ──────────────────────────────────────────
// Motion Spec: Google Drive FAB style
// Opening: 220-280ms, opacity 0→1, translateY(12px)→0, scale 0.92→1
// Stagger: 40-60ms between items
// Closing: reverse stagger — topmost disappears first
const ANIM_DURATION = 250  // ms — within 220-280ms range
const STAGGER_DELAY = 50   // ms — within 40-60ms range

// ─── Speed Dial FAB Component ─────────────────────────────────────
export default function SpeedDialFAB() {
  const { setActivePage, setOpenSalesForm } = useAppStore()

  // ── State ──
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)   // controls DOM presence for exit animation
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Actions (order = bottom-to-top visually) ──
  // Penjualan is closest to FAB → appears first on open
  const actions: SpeedDialAction[] = [
    {
      key: 'penjualan',
      label: 'Penjualan',
      icon: <ShoppingBag className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('sales'); setOpenSalesForm(true) },
    },
    {
      key: 'pembelian',
      label: 'Pembelian',
      icon: <ShoppingCart className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('purchases') },
    },
    {
      key: 'customer',
      label: 'Customer',
      icon: <Users className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('customers') },
    },
    {
      key: 'supplier',
      label: 'Supplier',
      icon: <Truck className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('suppliers') },
    },
    {
      key: 'produk',
      label: 'Produk',
      icon: <Package className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('products') },
    },
  ]

  // ── Open / Close handlers ──
  const closeDial = useCallback(() => {
    setIsOpen(false)
    // Keep mounted until closing animation finishes, then unmount
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current)
    const totalCloseTime = ANIM_DURATION + (actions.length - 1) * STAGGER_DELAY + 60
    closingTimerRef.current = setTimeout(() => {
      setMounted(false)
      closingTimerRef.current = null
    }, totalCloseTime)
  }, [actions.length])

  const openDial = useCallback(() => {
    // Cancel any pending close timer
    if (closingTimerRef.current) {
      clearTimeout(closingTimerRef.current)
      closingTimerRef.current = null
    }
    setMounted(true)
    // Double rAF ensures the browser has painted the initial (hidden) state
    // before we trigger the opening transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpen(true)
      })
    })
  }, [])

  const handleToggle = useCallback(() => {
    if (isOpen) {
      closeDial()
    } else {
      openDial()
    }
  }, [isOpen, closeDial, openDial])

  const handleAction = useCallback((action: SpeedDialAction) => {
    action.onClick()
    closeDial()
  }, [closeDial])

  // ── Close on Escape ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeDial()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, closeDial])

  // ── Prevent body scroll when dial is open ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else if (!mounted) {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, mounted])

  // ── Cleanup timer on unmount ──
  useEffect(() => {
    return () => {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current)
    }
  }, [])

  return (
    <>
      {/* ── Backdrop ── */}
      {mounted && (
        <div
          className="fixed inset-0 z-[55] lg:hidden"
          style={{
            backgroundColor: 'rgba(0,0,0,0.32)',
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          onClick={closeDial}
        />
      )}

      {/* ── Speed Dial Actions ── */}
      {mounted && (
        <div
          className="fixed z-[56] right-4 flex flex-col-reverse items-end gap-3 lg:hidden"
          style={{ bottom: '140px' }}
        >
          {actions.map((action, i) => {
            // flex-col-reverse: index 0 renders closest to FAB (bottom)
            // Opening stagger: index 0 appears first (delay=0), last appears last
            // Closing stagger: last disappears first, index 0 disappears last
            const openDelay = i * STAGGER_DELAY
            const closeDelay = (actions.length - 1 - i) * STAGGER_DELAY
            const delay = isOpen ? openDelay : closeDelay

            return (
              <div
                key={action.key}
                className="flex items-center gap-2.5"
                style={{
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen
                    ? 'translateY(0) scale(1)'
                    : 'translateY(12px) scale(0.92)',
                  transition: [
                    `opacity ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
                    `transform ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
                  ].join(', '),
                  pointerEvents: isOpen ? 'auto' : 'none',
                }}
              >
                {/* Label pill */}
                <span
                  className="text-[13px] font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-[#1e2130] pl-3 pr-2.5 py-[7px] rounded-lg whitespace-nowrap select-none"
                  style={{
                    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.12), 0 1px 3px -1px rgba(0,0,0,0.06)',
                  }}
                >
                  {action.label}
                </span>

                {/* Icon button */}
                <button
                  onClick={() => handleAction(action)}
                  className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 active:scale-90 transition-transform duration-150"
                  style={{
                    boxShadow: '0 3px 12px -3px rgba(180,83,9,0.15), 0 1px 4px -1px rgba(0,0,0,0.06)',
                  }}
                >
                  {action.icon}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FAB Button ── */}
      <button
        onClick={handleToggle}
        className="fixed z-[57] right-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white flex items-center justify-center lg:hidden select-none"
        style={{
          bottom: '76px',
          boxShadow: isOpen
            ? '0 10px 35px -5px rgba(245,158,11,0.4), 0 4px 12px -4px rgba(0,0,0,0.1)'
            : '0 8px 25px -5px rgba(245,158,11,0.25), 0 2px 8px -2px rgba(0,0,0,0.06)',
          transition: `box-shadow ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
        }}
      >
        {/* Plus → X rotation (Plus at 45° = visual X) */}
        <Plus
          className="w-6 h-6 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </>
  )
}
