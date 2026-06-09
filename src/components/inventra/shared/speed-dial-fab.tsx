'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
const ANIM_DURATION = 250
const STAGGER_DELAY = 50

// ─── Arc Layout Configuration ─────────────────────────────────────
// Arc spans from -80° to +80° relative to vertical (0° = straight up)
// 5 actions spread across this arc
const ARC_START_DEG = -70   // degrees from vertical (leftmost)
const ARC_END_DEG   =  70   // degrees from vertical (rightmost)
const ARC_RADIUS    = 96    // px distance from FAB center to action center

function degToXY(deg: number, radius: number): { x: number; y: number } {
  // deg=0 → straight up, positive → right
  const rad = (deg * Math.PI) / 180
  return {
    x: Math.sin(rad) * radius,
    y: -Math.cos(rad) * radius,  // negative because Y goes up
  }
}

// ─── Speed Dial FAB Component ─────────────────────────────────────
export default function SpeedDialFAB() {
  const { setActivePage, setOpenSalesForm } = useAppStore()

  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Actions in visual order: left-to-right in the arc
  const actions: SpeedDialAction[] = [
    {
      key: 'sales',
      label: 'Sales',
      icon: <ShoppingBag className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('sales'); setOpenSalesForm(true) },
    },
    {
      key: 'purchase',
      label: 'Purchase',
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
      key: 'product',
      label: 'Product',
      icon: <Package className="w-[18px] h-[18px]" />,
      onClick: () => { setActivePage('products') },
    },
  ]

  // Pre-calculate arc positions
  const arcPositions = useMemo(() => {
    if (actions.length === 1) return [{ x: 0, y: -ARC_RADIUS }]
    const step = (ARC_END_DEG - ARC_START_DEG) / (actions.length - 1)
    return actions.map((_, i) => degToXY(ARC_START_DEG + step * i, ARC_RADIUS))
  }, [actions.length])

  const closeDial = useCallback(() => {
    setIsOpen(false)
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current)
    const totalCloseTime = ANIM_DURATION + (actions.length - 1) * STAGGER_DELAY + 60
    closingTimerRef.current = setTimeout(() => {
      setMounted(false)
      closingTimerRef.current = null
    }, totalCloseTime)
  }, [actions.length])

  const openDial = useCallback(() => {
    if (closingTimerRef.current) {
      clearTimeout(closingTimerRef.current)
      closingTimerRef.current = null
    }
    setMounted(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpen(true)
      })
    })
  }, [])

  const handleToggle = useCallback(() => {
    if (isOpen) { closeDial() } else { openDial() }
  }, [isOpen, closeDial, openDial])

  const handleAction = useCallback((action: SpeedDialAction) => {
    action.onClick()
    closeDial()
  }, [closeDial])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeDial()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, closeDial])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else if (!mounted) {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, mounted])

  // Cleanup timer
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

      {/* ── Arc Actions ── */}
      {mounted && actions.map((action, i) => {
        const pos = arcPositions[i]
        // Opening stagger: center-out (middle first, edges last)
        const centerIndex = (actions.length - 1) / 2
        const distFromCenter = Math.abs(i - centerIndex)
        const openDelay = Math.round(distFromCenter * STAGGER_DELAY)
        // Closing stagger: reverse (edges first, center last)
        const maxDist = (actions.length - 1) / 2
        const closeDelay = Math.round((maxDist - distFromCenter) * STAGGER_DELAY)
        const delay = isOpen ? openDelay : closeDelay

        // Determine if action is to the left or right of center for label placement
        const isLeft = pos.x < -10
        const isRight = pos.x > 10

        return (
          <div
            key={action.key}
            className="fixed z-[56] lg:hidden"
            style={{
              // Position relative to FAB center
              // FAB is at right-4 (16px from right), bottom-24px, w-14 h-14
              // FAB center: right = 16 + 28 = 44px from right, bottom = 24 + 28 = 52px from bottom
              right: `${44 - pos.x}px`,
              bottom: `${52 - pos.y}px`,
              transform: isOpen
                ? 'translate(50%, 50%) scale(1)'
                : 'translate(50%, 50%) scale(0.4)',
              opacity: isOpen ? 1 : 0,
              transition: [
                `opacity ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
                `transform ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
              ].join(', '),
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            <div className="flex items-center gap-2" style={{ flexDirection: isLeft ? 'row-reverse' : 'row' }}>
              {/* Label pill */}
              <span
                className="text-[12px] font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-[#1e2130] pl-2.5 pr-2 py-1.5 rounded-lg whitespace-nowrap select-none"
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
          </div>
        )
      })}

      {/* ── FAB Button ── */}
      <button
        onClick={handleToggle}
        className="fixed z-[57] right-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white flex items-center justify-center lg:hidden select-none"
        style={{
          bottom: '24px',
          boxShadow: isOpen
            ? '0 10px 35px -5px rgba(245,158,11,0.4), 0 4px 12px -4px rgba(0,0,0,0.1)'
            : '0 8px 25px -5px rgba(245,158,11,0.25), 0 2px 8px -2px rgba(0,0,0,0.06)',
          transition: `box-shadow ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
        }}
      >
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
