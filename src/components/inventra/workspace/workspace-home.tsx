'use client'

import React, { useState, useEffect } from 'react'
import {
  RefreshCw, ShoppingBag, ShoppingCart, Package, Search,
  AlertTriangle, ArrowRightLeft, ArrowRight, TrendingUp,
  Trophy, Users, Truck, X, ClipboardList, Clock,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { fmtRp, fmtDate, fmt, roleColors } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'
import { useDashboard } from '@/components/inventra/hooks/use-query-hooks'
import type { DashboardData } from '@/components/inventra/shared/types'

// ─── Low Stock Detail Modal ───────────────────────────────────────
function LowStockModal({ items, open, onClose }: {
  items: DashboardData['lowStockProducts']
  open: boolean
  onClose: () => void
}) {
  const { setActivePage } = useAppStore()

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] lg:hidden flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full bg-white dark:bg-[#0f1117] rounded-t-2xl max-h-[75vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-white">
            Varian Perlu Restock
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.04]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 space-y-2">
          {items.map((p) => (
            <div
              key={p.variantId}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                p.stock <= 0
                  ? 'border-red-200/60 dark:border-red-800/25 bg-red-50/30 dark:bg-red-900/10'
                  : 'border-stone-200/40 dark:border-white/[0.04] bg-stone-50/30 dark:bg-white/[0.02]'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                p.stock <= 0 ? 'bg-red-500' : 'bg-amber-500'
              }`}>
                {p.stock}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                  {p.productName}
                </p>
                <p className="text-[11px] text-stone-400 truncate">
                  {p.variantName} · min {p.minStock}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Owner Home: Business Insight ─────────────────────────────────
function OwnerHome({ data }: { data: DashboardData }) {
  const { setActivePage, navigateToModule, setSearchOpen, setOpenSalesForm } = useAppStore()
  const [lowStockOpen, setLowStockOpen] = useState(false)

  const lowStockCount = data.lowStockProducts?.length ?? 0
  const userName = useAppStore().currentUser?.name || 'Owner'
  const hour = new Date().getHours()
  const timeGreeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  // Use dashboard data directly — no extra report API call
  const omzet = data.totalSales
  const modal = data.totalPurchases
  const profit = omzet - modal

  return (
    <div className="flex flex-col h-full page-enter">
      {/* Greeting */}
      <div className="shrink-0 space-y-1 mb-4">
        <p className="text-sm text-stone-400">{timeGreeting}</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Halo, {userName}
        </h1>
        <p className="text-sm text-stone-400">
          {lowStockCount > 0 ? `${lowStockCount} varian perlu restock.` : 'Semua lancar hari ini.'}
        </p>
      </div>

      {/* Alert badges */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 mb-5">
        {lowStockCount > 0 && (
          <button
            onClick={() => setActivePage('stock-alerts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200/40 dark:border-amber-800/20 hover:shadow-md hover:shadow-amber-200/20 transition-all duration-300"
          >
            <AlertTriangle className="w-3.5 h-3.5 badge-breathe" />
            {lowStockCount} varian perlu restock
          </button>
        )}
        {(data.pendingSaleCount ?? 0) > 0 && (
          <button
            onClick={() => navigateToModule('sales', 'drafts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50/80 dark:bg-teal-900/15 text-teal-700 dark:text-teal-300 text-xs font-medium border border-teal-200/40 dark:border-teal-800/20 transition-all duration-300"
          >
            {data.pendingSaleCount} SO belum selesai
          </button>
        )}
        {(data.pendingPurchaseCount ?? 0) > 0 && (
          <button
            onClick={() => navigateToModule('purchases', 'drafts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-900/15 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200/40 dark:border-blue-800/20 transition-all duration-300"
          >
            {data.pendingPurchaseCount} PO menunggu
          </button>
        )}
      </div>

      {/* Summary Cards: Omzet, Modal, Profit */}
      <div className="shrink-0 grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] sm:text-xs text-stone-400 font-medium">Omzet</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtRp(omzet)}</p>
          <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">Bulan ini</p>
        </div>
        <div className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-[10px] sm:text-xs text-stone-400 font-medium">Modal</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-rose-700 dark:text-rose-400">{fmtRp(modal)}</p>
          <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">Diterima</p>
        </div>
        <div className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-[10px] sm:text-xs text-stone-400 font-medium">Profit</span>
          </div>
          <p className={`text-sm sm:text-lg font-bold ${profit >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-700 dark:text-red-400'}`}>
            {fmtRp(profit)}
          </p>
          <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">Estimasi</p>
        </div>
      </div>

      {/* Bottom: Low Stock Widget + Top Products + Recent Transactions */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Low Stock Widget */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between shrink-0 mb-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className={`w-3 h-3 ${lowStockCount > 0 ? 'text-amber-500 badge-breathe' : 'text-stone-300'}`} />
              Stok Rendah
            </p>
            {lowStockCount > 0 && (
              <button
                onClick={() => setActivePage('stock-alerts')}
                className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
              >
                Lihat Semua <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="bg-white/60 dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] overflow-hidden flex-1 min-h-0 overflow-y-auto">
            {lowStockCount === 0 ? (
              <div className="p-4 text-center">
                <Package className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs text-stone-400">Semua stok aman</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100/50 dark:divide-white/[0.03]">
                {(data.lowStockProducts ?? []).slice(0, 5).map((p) => (
                  <button
                    key={p.variantId}
                    onClick={() => setActivePage('stock-alerts')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50/40 dark:hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                      p.stock <= 0 ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                      {p.stock}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{p.productName}</p>
                      <p className="text-[10px] text-stone-400 truncate">{p.variantName} · min {p.minStock}</p>
                    </div>
                    <div className="shrink-0">
                      <div className={`h-1.5 w-12 rounded-full overflow-hidden ${p.stock <= 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        <div
                          className={`h-full rounded-full ${p.stock <= 0 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min((p.stock / p.minStock) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
                {lowStockCount > 5 && (
                  <button
                    onClick={() => setActivePage('stock-alerts')}
                    className="w-full px-3 py-2 text-[10px] text-stone-400 hover:text-stone-600 hover:bg-stone-50/40 dark:hover:bg-white/[0.02] transition-colors text-center"
                  >
                    + {lowStockCount - 5} varian lainnya
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top Products — link to Reports */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between shrink-0 mb-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-amber-500" />
              Produk Terlaris
            </p>
            <button
              onClick={() => setActivePage('report-sales')}
              className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
            >
              Lihat di Laporan <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="bg-white/60 dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] flex-1 min-h-0 flex items-center justify-center">
            <div className="text-center py-8">
              <Trophy className="w-6 h-6 text-stone-200 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Lihat di Laporan Penjualan</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between shrink-0 mb-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Transaksi Terbaru
            </p>
            <button
              onClick={() => navigateToModule('sales', 'history')}
              className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
            >
              Semua <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="bg-white/60 dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] overflow-hidden flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100/50 dark:divide-white/[0.03]">
            {!(data.recentTransactions ?? []).length ? (
              <div className="p-4 text-center text-xs text-stone-400">Belum ada transaksi</div>
            ) : (
              (data.recentTransactions ?? []).slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50/40 dark:hover:bg-white/[0.02] transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    t.type === 'sale'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/15 dark:text-emerald-400'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/15 dark:text-blue-400'
                  }`}>
                    {t.type === 'sale' ? <ShoppingBag className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-stone-800 dark:text-stone-200">{t.transNo}</p>
                      <StatusBadge status={t.status} map={t.type === 'sale' ? 'sale' : 'purchase'} />
                    </div>
                    <p className="text-[10px] text-stone-400">{t.party || 'Umum'} · {fmtDate(t.date)}</p>
                  </div>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0">{fmtRp(t.total)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Modal */}
      <LowStockModal items={data.lowStockProducts ?? []} open={lowStockOpen} onClose={() => setLowStockOpen(false)} />
    </div>
  )
}

// ─── Admin Home: Workflow Focus ───────────────────────────────────
function AdminHome({ data }: { data: DashboardData }) {
  const { setActivePage, navigateToModule, setSearchOpen, setOpenSalesForm } = useAppStore()
  const [lowStockOpen, setLowStockOpen] = useState(false)
  const lowStockCount = data.lowStockProducts?.length ?? 0
  const userName = useAppStore().currentUser?.name || 'Admin'
  const hour = new Date().getHours()
  const timeGreeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  return (
    <div className="flex flex-col h-full page-enter">
      {/* Greeting */}
      <div className="shrink-0 space-y-1 mb-4">
        <p className="text-sm text-stone-400">{timeGreeting}</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Halo, {userName}
        </h1>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => { navigateToModule('sales', 'input'); setOpenSalesForm(true) }}
          className="card-living flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium "
        >
          <ShoppingBag className="w-4 h-4" /> Jual
        </button>
        <button
          onClick={() => navigateToModule('purchases', 'input')}
          className="card-living flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-[#1a1f2e]/60 border border-stone-200/40 dark:border-white/[0.04] text-stone-700 dark:text-stone-300 text-sm font-medium"
        >
          <ShoppingCart className="w-4 h-4" /> Beli
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="card-living flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-[#1a1f2e]/60 border border-stone-200/40 dark:border-white/[0.04] text-stone-700 dark:text-stone-300 text-sm font-medium"
        >
          <Search className="w-4 h-4" /> Cari
        </button>
      </div>

      {/* Workflow Cards: What needs attention — deep link to correct tabs */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <button
          onClick={() => navigateToModule('sales', 'drafts')}
          className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] p-3 text-left transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-white">{data.pendingSaleCount ?? 0}</p>
          <p className="text-[10px] text-stone-400">Draft Penjualan</p>
        </button>
        <button
          onClick={() => navigateToModule('sales', 'history')}
          className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] p-3 text-left transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-white">{data.pendingSaleCount ?? 0}</p>
          <p className="text-[10px] text-stone-400">Menunggu Bayar</p>
        </button>
        <button
          onClick={() => navigateToModule('purchases', 'drafts')}
          className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] p-3 text-left transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-white">{data.pendingPurchaseCount ?? 0}</p>
          <p className="text-[10px] text-stone-400">PO Menunggu</p>
        </button>
        {lowStockCount > 0 && (
          <button
            onClick={() => setActivePage('stock-alerts')}
            className="bg-white dark:bg-[#1a1f2e]/60 rounded-xl border border-amber-200/40 dark:border-amber-800/20 p-3 text-left transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 badge-breathe" />
              </div>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{lowStockCount}</p>
            <p className="text-[10px] text-stone-400">Perlu Restock</p>
          </button>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between shrink-0 mb-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Transaksi Terbaru
          </p>
          <button
            onClick={() => navigateToModule('sales', 'history')}
            className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
          >
            Semua <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="bg-white/60 dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] overflow-hidden flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100/50 dark:divide-white/[0.03]">
          {!(data.recentTransactions ?? []).length ? (
            <div className="p-5 text-center text-xs text-stone-400">Belum ada transaksi</div>
          ) : (
            (data.recentTransactions ?? []).slice(0, 8).map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50/40 dark:hover:bg-white/[0.02] transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  t.type === 'sale'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/15 dark:text-emerald-400'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/15 dark:text-blue-400'
                }`}>
                  {t.type === 'sale' ? <ShoppingBag className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-stone-800 dark:text-stone-200">{t.transNo}</p>
                    <StatusBadge status={t.status} map={t.type === 'sale' ? 'sale' : 'purchase'} />
                  </div>
                  <p className="text-[10px] text-stone-400">{t.party || 'Umum'} · {fmtDate(t.date)}</p>
                </div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0">{fmtRp(t.total)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Low Stock Modal */}
      <LowStockModal items={data.lowStockProducts ?? []} open={lowStockOpen} onClose={() => setLowStockOpen(false)} />
    </div>
  )
}

// ─── Staff/Warehouse Home ─────────────────────────────────────────
function StaffWarehouseHome({ data }: { data: DashboardData }) {
  const { setActivePage, navigateToModule, setSearchOpen, setOpenSalesForm, currentUser } = useAppStore()
  const [lowStockOpen, setLowStockOpen] = useState(false)
  const role = currentUser?.role || 'staff'
  const lowStockCount = data.lowStockProducts?.length ?? 0
  const userName = currentUser?.name || 'User'
  const hour = new Date().getHours()
  const timeGreeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  const quickActions = role === 'warehouse'
    ? [
        { label: 'Terima Barang', icon: <Package className="w-4 h-4" />, color: 'bg-stone-800', action: () => navigateToModule('purchases', 'drafts') },
        { label: 'Mutasi Stok', icon: <ArrowRightLeft className="w-4 h-4" />, color: 'bg-stone-700', action: () => navigateToModule('stock-mutations', 'input') },
        { label: 'Cari', icon: <Search className="w-4 h-4" />, color: 'bg-stone-600', action: () => setSearchOpen(true) },
      ]
    : [
        { label: 'Jual', icon: <ShoppingBag className="w-4 h-4" />, color: 'bg-amber-500', action: () => { setOpenSalesForm(true); navigateToModule('sales', 'input') } },
        { label: 'Beli', icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-stone-700', action: () => navigateToModule('purchases', 'input') },
        { label: 'Cari', icon: <Search className="w-4 h-4" />, color: 'bg-stone-600', action: () => setSearchOpen(true) },
      ]

  return (
    <div className="flex flex-col h-full page-enter">
      {/* Greeting */}
      <div className="shrink-0 space-y-1 mb-4">
        <p className="text-sm text-stone-400">{timeGreeting}</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Halo, {userName}
        </h1>
        <p className="text-sm text-stone-400">
          {lowStockCount > 0 ? `${lowStockCount} varian perlu restock.` : 'Semua lancar hari ini.'}
        </p>
      </div>

      {/* Alert badges */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 mb-5">
        {lowStockCount > 0 && (
          <button
            onClick={() => setActivePage('stock-alerts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200/40 dark:border-amber-800/20 transition-all duration-300"
          >
            <AlertTriangle className="w-3.5 h-3.5 badge-breathe" />
            {lowStockCount} varian perlu restock
          </button>
        )}
        {(data.pendingSaleCount ?? 0) > 0 && (
          <button
            onClick={() => navigateToModule('sales', 'drafts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50/80 dark:bg-teal-900/15 text-teal-700 dark:text-teal-300 text-xs font-medium border border-teal-200/40 dark:border-teal-800/20 transition-all duration-300"
          >
            {data.pendingSaleCount} SO belum selesai
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
        {quickActions.map((a, i) => (
          <button
            key={i}
            onClick={a.action}
            className="card-living group flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white/60 dark:bg-[#1a1f2e]/60 border border-stone-200/40 dark:border-white/[0.04] text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <div className={`w-7 h-7 rounded-lg ${a.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
              {a.icon}
            </div>
            {a.label}
          </button>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between shrink-0 mb-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Transaksi Terakhir
          </p>
          <button
            onClick={() => navigateToModule('sales', 'history')}
            className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
          >
            Semua <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="bg-white/60 dark:bg-[#1a1f2e]/60 rounded-xl border border-stone-200/40 dark:border-white/[0.04] overflow-hidden flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100/50 dark:divide-white/[0.03]">
          {!(data.recentTransactions ?? []).length ? (
            <div className="p-5 text-center text-xs text-stone-400">Belum ada transaksi</div>
          ) : (
            (data.recentTransactions ?? []).slice(0, 6).map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50/40 dark:hover:bg-white/[0.02] transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  t.type === 'sale'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/15 dark:text-emerald-400'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/15 dark:text-blue-400'
                }`}>
                  {t.type === 'sale' ? <ShoppingBag className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-stone-800 dark:text-stone-200">{t.transNo}</p>
                    <StatusBadge status={t.status} map={t.type === 'sale' ? 'sale' : 'purchase'} />
                  </div>
                  <p className="text-[10px] text-stone-400">{t.party || 'Umum'} · {fmtDate(t.date)}</p>
                </div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0">{fmtRp(t.total)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Low Stock Modal */}
      <LowStockModal items={data.lowStockProducts ?? []} open={lowStockOpen} onClose={() => setLowStockOpen(false)} />
    </div>
  )
}

// ─── Main Workspace Home Router (React Query) ─────────────────────
export default function WorkspaceHome() {
  const { data, isLoading, error } = useDashboard()
  const { currentUser } = useAppStore()
  const role = currentUser?.role || 'staff'

  // Only show spinner on first load (no data yet)
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-stone-300" />
      </div>
    )
  }

  // Route to role-specific home
  switch (role) {
    case 'owner':
      return <OwnerHome data={data} />
    case 'admin':
      return <AdminHome data={data} />
    default:
      return <StaffWarehouseHome data={data} />
  }
}
