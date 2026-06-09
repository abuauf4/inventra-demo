'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { menuSections } from './sidebar'
import {
  Home, FolderOpen, ShoppingBag, Package,
  BarChart3, Sliders,
} from 'lucide-react'

// Bottom nav items — one per section, using the section's catIcon
// When tapped, navigate to the first non-soon item in that section
const bottomNavItems: {
  key: string
  label: string
  icon: React.ReactNode
  sectionIndex: number
}[] = [
  { key: 'home', label: 'Home', icon: <Home className="w-5 h-5" />, sectionIndex: 0 },
  { key: 'master', label: 'Master', icon: <FolderOpen className="w-5 h-5" />, sectionIndex: 1 },
  { key: 'distribusi', label: 'Transaksi', icon: <ShoppingBag className="w-5 h-5" />, sectionIndex: 2 },
  { key: 'inventory', label: 'Stok', icon: <Package className="w-5 h-5" />, sectionIndex: 3 },
  { key: 'report', label: 'Laporan', icon: <BarChart3 className="w-5 h-5" />, sectionIndex: 6 },
  { key: 'pengaturan', label: 'Setting', icon: <Sliders className="w-5 h-5" />, sectionIndex: 7 },
]

function MobileBottomNav() {
  const { activePage, setActivePage, setSidebarOpen, currentUser } = useAppStore()

  const isSectionActive = (sectionIndex: number) => {
    const section = menuSections[sectionIndex]
    if (!section) return false
    return section.items.some((item) => item.key === activePage && !item.soon)
  }

  const handleTap = (sectionIndex: number) => {
    const section = menuSections[sectionIndex]
    if (!section) return

    // If section has items, navigate to first active one
    const firstActive = section.items.find((item) => !item.soon)
    if (firstActive) {
      setActivePage(firstActive.key as AppPage)
    }
  }

  // Hide "Pengaturan" for non-owners
  const items = bottomNavItems.filter((item) => {
    if (item.key === 'pengaturan' && currentUser?.role !== 'owner') return false
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-xl border-t border-stone-200/40 dark:border-white/[0.04] safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {items.map((item) => {
          const active = isSectionActive(item.sectionIndex)
          return (
            <button
              key={item.key}
              onClick={() => handleTap(item.sectionIndex)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-all duration-200 ${
                active
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-stone-400 dark:text-stone-500 active:text-stone-600 dark:active:text-stone-400'
              }`}
            >
              <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium leading-tight ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav
