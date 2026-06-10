'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'
import { roleColors } from './constants'

import {
  Package, FolderOpen, Truck, Users, ShoppingCart, ShoppingBag,
  ArrowLeftRight, UserCog, X,
  Warehouse as WarehouseIcon, Home,
  Briefcase, PenLine,
  ChevronRight,
  ClipboardList, RotateCcw,
  ArrowRightLeft, ClipboardCheck, Sliders,
  Receipt, CreditCard, Wallet, Banknote,
  BookOpen, BookMarked, Scale, TrendingUp,
  BarChart3, UserCircle, Truck as TruckReport,
  Building2, Palette, FileText,
  Lock, Circle, PanelLeftClose, PanelLeft,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

// ===================== ROLE ICONS =====================
const roleIcons: Record<string, React.ReactNode> = {
  owner: <Briefcase className="w-3.5 h-3.5" />,
  admin: <UserCog className="w-3.5 h-3.5" />,
  staff: <PenLine className="w-3.5 h-3.5" />,
  warehouse: <WarehouseIcon className="w-3.5 h-3.5" />,
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
  warehouse: 'Gudang',
}

// ===================== MENU ITEM TYPE =====================
interface MenuItem {
  key: AppPage
  label: string
  icon: React.ReactNode
  soon?: boolean
}

interface MenuSection {
  label: string | null
  catIcon?: React.ReactNode
  items: MenuItem[]
}

// ===================== MENU SECTIONS =====================
const menuSections: MenuSection[] = [
  {
    label: null,
    items: [
      { key: 'dashboard' as AppPage, label: 'Home', icon: <Home className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Data Master',
    catIcon: <FolderOpen className="w-[18px] h-[18px]" />,
    items: [
      { key: 'customers' as AppPage, label: 'Customer', icon: <Users className="w-[18px] h-[18px]" /> },
      { key: 'suppliers' as AppPage, label: 'Supplier', icon: <Truck className="w-[18px] h-[18px]" /> },
      { key: 'products' as AppPage, label: 'Produk', icon: <Package className="w-[18px] h-[18px]" /> },
      { key: 'categories' as AppPage, label: 'Kategori', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
      { key: 'warehouses' as AppPage, label: 'Gudang', icon: <WarehouseIcon className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Distribusi',
    catIcon: <ShoppingBag className="w-[18px] h-[18px]" />,
    items: [
      { key: 'purchases' as AppPage, label: 'Pembelian', icon: <ShoppingCart className="w-[18px] h-[18px]" /> },
      { key: 'sales' as AppPage, label: 'Penjualan', icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
      { key: 'sales-order' as AppPage, label: 'Sales Order', icon: <ClipboardList className="w-[18px] h-[18px]" />, soon: true },
      { key: 'purchase-order' as AppPage, label: 'Purchase Order', icon: <ClipboardList className="w-[18px] h-[18px]" />, soon: true },
      { key: 'sales-return' as AppPage, label: 'Retur Penjualan', icon: <RotateCcw className="w-[18px] h-[18px]" />, soon: true },
      { key: 'purchase-return' as AppPage, label: 'Retur Pembelian', icon: <RotateCcw className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Inventory',
    catIcon: <Package className="w-[18px] h-[18px]" />,
    items: [
      { key: 'stock-mutations' as AppPage, label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-[18px] h-[18px]" /> },
      { key: 'warehouse-transfer' as AppPage, label: 'Transfer Gudang', icon: <ArrowRightLeft className="w-[18px] h-[18px]" />, soon: true },
      { key: 'stock-opname' as AppPage, label: 'Stock Opname', icon: <ClipboardCheck className="w-[18px] h-[18px]" />, soon: true },
      { key: 'stock-adjustment' as AppPage, label: 'Penyesuaian Stok', icon: <Sliders className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Finance',
    catIcon: <Wallet className="w-[18px] h-[18px]" />,
    items: [
      { key: 'invoice' as AppPage, label: 'Invoice', icon: <Receipt className="w-[18px] h-[18px]" />, soon: true },
      { key: 'receivable' as AppPage, label: 'Piutang', icon: <CreditCard className="w-[18px] h-[18px]" />, soon: true },
      { key: 'payment' as AppPage, label: 'Pelunasan', icon: <Wallet className="w-[18px] h-[18px]" />, soon: true },
      { key: 'cash' as AppPage, label: 'Kas', icon: <Banknote className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Accounting',
    catIcon: <BookOpen className="w-[18px] h-[18px]" />,
    items: [
      { key: 'journal' as AppPage, label: 'Jurnal', icon: <BookOpen className="w-[18px] h-[18px]" />, soon: true },
      { key: 'ledger' as AppPage, label: 'Buku Besar', icon: <BookMarked className="w-[18px] h-[18px]" />, soon: true },
      { key: 'balance-sheet' as AppPage, label: 'Neraca', icon: <Scale className="w-[18px] h-[18px]" />, soon: true },
      { key: 'profit-loss' as AppPage, label: 'Laba Rugi', icon: <TrendingUp className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Report',
    catIcon: <BarChart3 className="w-[18px] h-[18px]" />,
    items: [
      { key: 'report-sales' as AppPage, label: 'Penjualan', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { key: 'report-purchases' as AppPage, label: 'Pembelian', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { key: 'report-stock' as AppPage, label: 'Stok', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { key: 'report-customer' as AppPage, label: 'Customer', icon: <UserCircle className="w-[18px] h-[18px]" />, soon: true },
      { key: 'report-supplier' as AppPage, label: 'Supplier', icon: <TruckReport className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
  {
    label: 'Pengaturan',
    catIcon: <Sliders className="w-[18px] h-[18px]" />,
    items: [
      { key: 'user-management' as AppPage, label: 'User', icon: <UserCog className="w-[18px] h-[18px]" /> },
      { key: 'branch' as AppPage, label: 'Cabang', icon: <Building2 className="w-[18px] h-[18px]" />, soon: true },
      { key: 'branding' as AppPage, label: 'Branding', icon: <Palette className="w-[18px] h-[18px]" />, soon: true },
      { key: 'doc-numbering' as AppPage, label: 'Nomor Dokumen', icon: <FileText className="w-[18px] h-[18px]" />, soon: true },
    ],
  },
]

// Export menuSections for use in Header and other components
export { menuSections }
export type { MenuItem, MenuSection }

// ===================== TOOLTIP WRAPPER =====================
function TooltipWrap({ label, children, collapsed }: { label: string; children: React.ReactNode; collapsed: boolean }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  if (!collapsed) return <>{children}</>

  return (
    <div
      className="relative"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setPos({ x: rect.right + 8, y: rect.top + rect.height / 2 })
        setShow(true)
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="fixed z-[100] px-2.5 py-1.5 text-[12px] font-medium text-white bg-[#1e293b] rounded-lg shadow-xl border border-white/[0.06] whitespace-nowrap pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translateY(-50%)' }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activePage, setActivePage, currentUser, sidebarCollapsed, toggleSidebarCollapsed } = useAppStore()

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

  // ===== Floating panel for collapsed categories =====
  const [hoveredCat, setHoveredCat] = useState<number | null>(null)
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 })
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCatEnter = useCallback((si: number, e: React.MouseEvent) => {
    if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPanelPos({ x: rect.right, y: rect.top })
    setHoveredCat(si)
  }, [])

  const handleCatLeave = useCallback(() => {
    panelTimeoutRef.current = setTimeout(() => {
      setHoveredCat(null)
    }, 180)
  }, [])

  const handlePanelEnter = useCallback(() => {
    if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current)
  }, [])

  const handlePanelLeave = useCallback(() => {
    setHoveredCat(null)
  }, [])

  // Check if any item in a section is active
  const isSectionActive = (section: MenuSection) =>
    section.items.some((item) => item.key === activePage && !item.soon)

  const w = sidebarCollapsed ? 'w-[280px] lg:w-[68px]' : 'w-[260px]'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 ${w} bg-[#0e1525] transform transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-2xl lg:shadow-none overflow-hidden group/sidebar lg:sticky lg:top-0 lg:h-screen lg:z-auto rounded-tr-2xl ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ===== Ambient Light Orbs ===== */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="sidebar-ambient-orb absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/[0.06] blur-3xl" />
          <div className="sidebar-ambient-orb absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-blue-500/[0.03] blur-3xl" style={{ animationDelay: '3s' }} />
        </div>

        {/* ===== Profile Area — FIXED, tidak ikut scroll ===== */}
        <div className={`relative shrink-0 pt-5 pb-3 transition-all duration-[220ms] ${sidebarCollapsed ? 'px-2 lg:px-2 px-5' : 'px-5'}`}>
          <div className="flex flex-col items-center">
            {/* Avatar — centered */}
            <div className="relative shrink-0">
              <div
                className={`bg-gradient-to-br ${
                  roleColors[currentUser?.role ?? 'staff'] || 'from-gray-400 to-gray-500'
                } flex items-center justify-center text-white font-bold ring-2 ring-white/[0.08] shadow-lg transition-all duration-[220ms] ${
                  sidebarCollapsed ? 'w-9 h-9 rounded-lg text-xs lg:w-9 lg:h-9 lg:rounded-lg w-12 h-12 rounded-full' : 'w-12 h-12 rounded-full text-sm'
                }`}
              >
                {(currentUser?.name ?? 'U').slice(0, 2).toUpperCase()}
              </div>
              {/* Online dot */}
              <span className={`absolute bg-emerald-400 rounded-full ring-2 ring-[#0e1525] transition-all duration-[220ms] ${
                sidebarCollapsed ? '-bottom-0.5 -right-0.5 w-2 h-2' : '-bottom-0.5 -right-0.5 w-3 h-3'
              }`} />
            </div>

            {/* Name + role below avatar — on mobile always show, on desktop hide when collapsed */}
            <div className={`mt-2.5 text-center ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <h2 className="font-semibold text-[14px] text-white/85 truncate leading-tight">
                {currentUser?.name ?? 'User'}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-amber-400/60">
                  {roleIcons[currentUser?.role ?? 'staff']}
                </span>
                <span className="text-[11px] text-white/35 capitalize">
                  {roleLabels[currentUser?.role ?? 'staff']}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute top-3 right-3 w-7 h-7 text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-lg"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Divider below profile */}
        <div className="shrink-0 border-t border-white/[0.04] mx-3" />

        {/* ===== Home — FIXED, tidak ikut scroll ===== */}
        <div className="relative shrink-0 py-1">
          <nav className={sidebarCollapsed ? 'px-1.5 lg:px-1.5 px-3' : 'px-3'}>
            {menuSections[0].items.map((item) => {
              const isActive = activePage === item.key
              return (
                <TooltipWrap key={item.key} label={item.label} collapsed={sidebarCollapsed}>
                  <button
                    onClick={() => {
                      setActivePage(item.key)
                      onClose()
                    }}
                    className={`group w-full flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ease-out relative ${
                      sidebarCollapsed
                        ? 'justify-center lg:justify-center justify-start px-3.5 py-2.5 gap-3'
                        : 'gap-3 px-3.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300'
                        : 'text-white/50 hover:bg-white/[0.04] hover:text-white/75'
                    }`}
                  >
                    {isActive && (
                      <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-amber-300 to-amber-500 rounded-r-full shadow-lg shadow-amber-400/40" />
                    )}
                    <span className={`transition-colors duration-200 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/30 group-hover:text-white/55'}`}>
                      {item.icon}
                    </span>
                    <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                      {item.label}
                      {isActive && (
                        <Circle className="ml-auto w-1.5 h-1.5 fill-amber-400/60 text-amber-400/60 sidebar-active-bar inline" />
                      )}
                    </span>
                  </button>
                </TooltipWrap>
              )
            })}
          </nav>
        </div>

        {/* Divider below Home */}
        <div className="shrink-0 border-t border-white/[0.04] mx-3 mb-1" />

        {/* ===== Category Menu Sections — ONLY THIS PART SCROLLS ===== */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch min-h-0">
          {/* COLLAPSED view — desktop only (hidden on mobile) */}
          {sidebarCollapsed ? (
            <nav className="hidden lg:block px-1.5 space-y-0.5 py-1">
              {menuSections.slice(1).map((section, origSi) => {
                const si = origSi + 1 // offset for actual index
                // Hide "Pengaturan" section for non-owners
                if (section.label === 'Pengaturan' && currentUser?.role !== 'owner') return null

                // Grouped — show ONE category icon per section
                const sectionActive = isSectionActive(section)
                return (
                  <TooltipWrap key={si} label={section.label!} collapsed={sidebarCollapsed}>
                    <button
                      onMouseEnter={(e) => handleCatEnter(si, e)}
                      onMouseLeave={handleCatLeave}
                      onClick={() => {
                        const firstActive = section.items.find((item) => !item.soon)
                        if (firstActive) {
                          setActivePage(firstActive.key)
                          onClose()
                        }
                      }}
                      className={`group w-full flex items-center justify-center rounded-xl transition-all duration-200 ease-out relative px-0 py-2.5 ${
                        sectionActive
                          ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/[0.08] to-transparent text-amber-300'
                          : 'text-white/40 hover:bg-white/[0.04] hover:text-white/65'
                      }`}
                    >
                      {sectionActive && (
                        <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-amber-300 to-amber-500 rounded-r-full shadow-lg shadow-amber-400/40" />
                      )}
                      <span className={`transition-colors duration-200 shrink-0 ${sectionActive ? 'text-amber-400' : 'text-white/25 group-hover:text-white/50'}`}>
                        {section.catIcon}
                      </span>
                    </button>
                  </TooltipWrap>
                )
              })}
            </nav>
          ) : null}
          {/* EXPANDED view — always visible on mobile, conditionally on desktop */}
          <nav className={`px-3 space-y-0.5 py-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              {menuSections.slice(1).map((section, origSi) => {
                const si = origSi + 1 // offset for actual index
                // Hide "Pengaturan" section for non-owners
                if (section.label === 'Pengaturan' && currentUser?.role !== 'owner') return null

                const isExpanded = expanded[si] ?? false
                const hasActive = section.items.some((item) => item.key === activePage && !item.soon)

                return (
                  <div key={si} className="mt-0.5">
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(String(si))}
                      className={`w-full flex items-center gap-2 px-3.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${
                        hasActive ? 'text-amber-400/55' : 'text-white/35'
                      } hover:text-white/50`}
                    >
                      <ChevronRight
                        className={`w-3 h-3 transition-transform duration-200 ease-out ${
                          isExpanded ? 'rotate-90' : 'rotate-0'
                        }`}
                      />
                      <span className="flex-1 text-left">{section.label}</span>
                      {hasActive && (
                        <span className="w-1 h-1 rounded-full bg-amber-400/50 sidebar-active-bar" />
                      )}
                    </button>

                    {/* Section items — this container scrolls if overflow */}
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      {section.items.map((item) => {
                        const isActive = activePage === item.key && !item.soon
                        return (
                          <TooltipWrap key={item.key} label={item.label} collapsed={sidebarCollapsed}>
                            <button
                              onClick={() => {
                                if (item.soon) return
                                setActivePage(item.key)
                                onClose()
                              }}
                              className={`group w-full flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ease-out relative gap-3 px-3.5 py-[7px] ${
                                item.soon
                                  ? 'text-white/20 cursor-not-allowed'
                                  : isActive
                                    ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300'
                                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/75'
                              }`}
                            >
                              {isActive && (
                                <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-amber-300 to-amber-500 rounded-r-full shadow-lg shadow-amber-400/40" />
                              )}
                              <span className={`transition-colors duration-200 shrink-0 ${
                                item.soon
                                  ? 'text-white/10'
                                  : isActive
                                    ? 'text-amber-400'
                                    : 'text-white/25 group-hover:text-white/50'
                              }`}>
                                {item.icon}
                              </span>
                              <>
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.soon && (
                                  <Lock className="w-3 h-3 text-white/[0.08]" />
                                )}
                                {isActive && !item.soon && (
                                  <Circle className="w-1.5 h-1.5 fill-amber-400/50 text-amber-400/50 sidebar-active-bar" />
                                )}
                              </>
                            </button>
                          </TooltipWrap>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </nav>
        </div>

        {/* ===== Footer — FIXED at bottom: Brand + Collapse ===== */}
        <div className="relative shrink-0 border-t border-white/[0.04]">
          {/* Brand / Inventra */}
          <div className={`transition-all duration-[220ms] ${sidebarCollapsed ? 'px-2 lg:px-2 px-5 py-2.5' : 'px-5 py-2.5'}`}>
            <div className="flex items-center gap-2.5">
              <div className="sidebar-brand-icon w-6 h-6 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-md flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <Package className="w-3 h-3 text-white" />
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <span className="font-bold text-[11px] text-white/50 tracking-tight">
                  Inventra
                </span>
                <span className="text-[8px] text-white/15 ml-1">
                  by Nauka
                </span>
              </div>
            </div>
          </div>

          {/* Collapse toggle — desktop only */}
          <div className="px-2 pb-2 hidden lg:block">
            <button
              onClick={toggleSidebarCollapsed}
              className="group w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-xl text-white/20 hover:bg-white/[0.04] hover:text-white/40 transition-all duration-200 ease-out"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-[14px] h-[14px]" />
              ) : (
                <>
                  <PanelLeftClose className="w-[14px] h-[14px]" />
                  <span className="text-[10px]">Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Floating panel for collapsed category hover ===== */}
      {sidebarCollapsed && hoveredCat !== null && menuSections[hoveredCat] && (
        <div
          className="fixed z-[90] bg-[#111827] border border-white/[0.06] rounded-xl shadow-2xl py-2 min-w-[190px]"
          style={{
            left: panelPos.x + 8,
            top: panelPos.y - 8,
            animation: 'fade-up 0.15s ease-out both',
          }}
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
        >
          {/* Section header */}
          <div className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/55">
            {menuSections[hoveredCat].label}
          </div>
          {/* Items */}
          {menuSections[hoveredCat].items.map((item) => {
            const isActive = activePage === item.key && !item.soon
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (item.soon) return
                  setActivePage(item.key)
                  setHoveredCat(null)
                  onClose()
                }}
                className={`group w-full flex items-center gap-3 px-3 py-[7px] text-[13px] font-medium transition-all duration-200 ease-out ${
                  item.soon
                    ? 'text-white/20 cursor-not-allowed'
                    : isActive
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/75'
                }`}
              >
                <span className={`transition-colors duration-200 shrink-0 ${
                  item.soon
                    ? 'text-white/10'
                    : isActive
                      ? 'text-amber-400'
                      : 'text-white/25 group-hover:text-white/50'
                }`}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.soon && <Lock className="w-3 h-3 text-white/[0.08]" />}
                {isActive && !item.soon && (
                  <Circle className="w-1.5 h-1.5 fill-amber-400/50 text-amber-400/50 sidebar-active-bar" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export default Sidebar
