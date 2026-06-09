'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  RefreshCw, ShoppingBag, ShoppingCart, Package, Search,
  AlertTriangle, ArrowRightLeft, ArrowRight, Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { fmtRp, fmtDate, roleColors } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'
import type { DashboardData } from '@/components/inventra/shared/types'

export default function WorkspaceHome() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [inboxItems, setInboxItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { currentUser, setActivePage, setSearchOpen, setQuickActionOpen } = useAppStore()
  const role = currentUser?.role || 'staff'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, inboxRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/inbox?limit=4'),
      ])
      const dash = await dashRes.json()
      const inbox = await inboxRes.json()
      setData(dash.data)
      setInboxItems(inbox.data?.items || [])
    } catch {
      toast.error('Gagal memuat workspace')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-stone-300" />
      </div>
    )
  }

  const userName = currentUser?.name || 'User'
  const lowStockCount = data?.lowStockProducts?.length ?? 0
  const hour = new Date().getHours()
  const timeGreeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  // Quick actions
  const quickActions =
    role === 'warehouse'
      ? [
          { label: 'Terima Barang', icon: <Package className="w-4 h-4" />, shortcut: null, color: 'bg-stone-900', action: () => setActivePage('purchases') },
          { label: 'Mutasi Stok', icon: <ArrowRightLeft className="w-4 h-4" />, shortcut: null, color: 'bg-stone-700', action: () => setActivePage('stock-mutations') },
          { label: 'Cari', icon: <Search className="w-4 h-4" />, shortcut: 'Ctrl+K', color: 'bg-stone-600', action: () => setSearchOpen(true) },
        ]
      : [
          { label: 'Jual', icon: <ShoppingBag className="w-4 h-4" />, shortcut: 'Alt+S', color: 'bg-amber-500', action: () => setQuickActionOpen(true) },
          { label: 'Beli', icon: <ShoppingCart className="w-4 h-4" />, shortcut: null, color: 'bg-stone-700', action: () => setActivePage('purchases') },
          { label: 'Cari', icon: <Search className="w-4 h-4" />, shortcut: 'Ctrl+K', color: 'bg-stone-600', action: () => setSearchOpen(true) },
        ]

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ===== Greeting ===== */}
      <div className="space-y-1.5">
        <p className="text-sm text-stone-400">
          {timeGreeting}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Halo, {userName}
        </h1>
        <p className="text-sm text-stone-400">
          {lowStockCount > 0 ? `${lowStockCount} varian perlu restock.` : 'Semua lancar hari ini.'}
        </p>
      </div>

      {/* ===== Priority alerts ===== */}
      {(lowStockCount > 0 || (data.pendingPurchaseCount ?? 0) > 0 || (data.pendingSaleCount ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {lowStockCount > 0 && (
            <button
              onClick={() => setActivePage('products')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200/60 dark:border-amber-800/30"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockCount} varian perlu restock
            </button>
          )}
          {(data.pendingPurchaseCount ?? 0) > 0 && (
            <button
              onClick={() => setActivePage('purchases')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200/60 dark:border-blue-800/30"
            >
              {data.pendingPurchaseCount} PO menunggu
            </button>
          )}
          {(data.pendingSaleCount ?? 0) > 0 && (
            <button
              onClick={() => setActivePage('sales')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs font-medium hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors border border-teal-200/60 dark:border-teal-800/30"
            >
              {data.pendingSaleCount} SO belum selesai
            </button>
          )}
        </div>
      )}

      {/* ===== Quick Actions ===== */}
      <div className="flex items-center gap-2">
        {quickActions.map((a, i) => (
          <button
            key={i}
            onClick={a.action}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-[#1a1f2e]/70 backdrop-blur-sm border border-stone-200/50 dark:border-white/[0.05] hover:border-stone-300/70 dark:hover:border-white/[0.08] shadow-sm hover:shadow-md transition-all duration-200 ease-out text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <div
              className={`w-7 h-7 rounded-lg ${a.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200 ease-out shadow-sm`}
            >
              {a.icon}
            </div>
            {a.label}
            {a.shortcut && (
              <kbd className="text-[10px] bg-stone-100/80 px-1.5 py-0.5 rounded-md font-mono text-stone-400 border border-stone-200/50 ml-1 dark:bg-white/[0.04] dark:border-white/[0.04] dark:text-stone-600">
                {a.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>

      {/* ===== Low Stock ===== */}
      {(data.lowStockProducts ?? []).length > 0 && (role === 'owner' || role === 'admin' || role === 'warehouse') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Perlu Restock
            </p>
            {lowStockCount > 4 && (
              <button
                onClick={() => setActivePage('products')}
                className="text-[11px] text-stone-400 hover:text-stone-600 font-medium"
              >
                +{lowStockCount - 4} lainnya
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {(data.lowStockProducts ?? []).slice(0, 4).map((p) => (
              <button
                key={p.variantId}
                onClick={() => setActivePage('products')}
                className={`flex items-center gap-2.5 p-3 rounded-xl bg-white/70 border hover:shadow-md transition-all duration-200 ease-out text-left dark:bg-[#1a1f2e]/70 backdrop-blur-sm ${
                  p.stock <= 0
                    ? 'border-red-200/60 dark:border-red-800/30'
                    : 'border-stone-200/60 dark:border-white/[0.05]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                    p.stock <= 0 ? 'bg-red-400' : 'bg-amber-500'
                  }`}
                >
                  {p.stock}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                    {p.productName}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                    {p.variantName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== Bottom: Recent + Inbox ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Transaksi Terakhir
            </p>
            <button
              onClick={() => setActivePage('sales')}
              className="text-[11px] text-stone-400 hover:text-stone-600 font-medium flex items-center gap-0.5"
            >
              Semua <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="bg-white/70 dark:bg-[#1a1f2e]/70 rounded-xl border border-stone-200/50 dark:border-white/[0.05] divide-y divide-stone-100/60 dark:divide-white/[0.03] backdrop-blur-sm">
            {!(data.recentTransactions ?? []).length ? (
              <div className="p-5 text-center text-xs text-stone-400">
                Belum ada transaksi
              </div>
            ) : (
              (data.recentTransactions ?? []).slice(0, 4).map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-stone-50/60 transition-colors duration-200 ease-out dark:hover:bg-white/[0.02]"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === 'sale'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}
                  >
                    {t.type === 'sale' ? (
                      <ShoppingBag className="w-3.5 h-3.5" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                        {t.transNo}
                      </p>
                      <StatusBadge status={t.status} map={t.type === 'sale' ? 'sale' : 'purchase'} />
                    </div>
                    <p className="text-[10px] text-stone-400">
                      {t.party || 'Umum'} · {fmtDate(t.date)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0">
                    {fmtRp(t.total)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inbox */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Inbox
            </p>
            <button
              onClick={() => setActivePage('inbox')}
              className="text-[11px] text-stone-400 hover:text-stone-600 font-medium flex items-center gap-0.5"
            >
              Buka <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="bg-white/70 dark:bg-[#1a1f2e]/70 rounded-xl border border-stone-200/50 dark:border-white/[0.05] divide-y divide-stone-100/60 dark:divide-white/[0.03] backdrop-blur-sm">
            {inboxItems.length === 0 ? (
              <div className="p-5 text-center text-xs text-stone-400">
                Tidak ada pesan baru
              </div>
            ) : (
              inboxItems.slice(0, 4).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-stone-50/60 transition-colors duration-200 ease-out dark:hover:bg-white/[0.02]"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${
                      item.priority === 'urgent'
                        ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                        : item.priority === 'warning'
                        ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}
                  >
                    {item.type === 'stock_low' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
