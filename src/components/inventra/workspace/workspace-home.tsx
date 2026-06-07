'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  RefreshCw, Sun, Moon, ShoppingBag, ShoppingCart, Package, Search,
  AlertTriangle, ArrowRightLeft, Activity, ArrowRight,
  Inbox as InboxIcon, Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { fmtRp, fmt, fmtDate, fmtDateTime, roleGreetings, roleColors } from '@/components/inventra/shared/constants'
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
      const [dashRes, inboxRes] = await Promise.all([fetch('/api/dashboard'), fetch('/api/inbox?limit=4')])
      const dash = await dashRes.json()
      const inbox = await inboxRes.json()
      setData(dash.data)
      setInboxItems(inbox.data?.items || [])
    } catch { toast.error('Gagal memuat workspace') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div>

  const userName = currentUser?.name || 'User'
  const lowStockCount = data.lowStockProducts?.length || 0
  const roleGreeting = roleGreetings[role] || roleGreetings.staff
  const hour = new Date().getHours()
  const timeIcon = hour < 12 ? <Sun className="w-5 h-5 text-amber-400" /> : hour < 17 ? <Sun className="w-5 h-5 text-orange-400" /> : <Moon className="w-5 h-5 text-indigo-400" />

  // Quick actions — compact, just 3 for each role
  const quickActions = role === 'warehouse'
    ? [
        { label: 'Terima Barang', icon: <Package className="w-4 h-4" />, shortcut: null, color: 'from-emerald-500 to-teal-500', action: () => setActivePage('purchases') },
        { label: 'Mutasi Stok', icon: <ArrowRightLeft className="w-4 h-4" />, shortcut: null, color: 'from-blue-500 to-indigo-500', action: () => setActivePage('stock-mutations') },
        { label: 'Cari', icon: <Search className="w-4 h-4" />, shortcut: '⌘K', color: 'from-violet-500 to-purple-500', action: () => setSearchOpen(true) },
      ]
    : [
        { label: 'Jual', icon: <ShoppingBag className="w-4 h-4" />, shortcut: 'Alt+S', color: 'from-emerald-500 to-teal-500', action: () => setQuickActionOpen(true) },
        { label: 'Beli', icon: <ShoppingCart className="w-4 h-4" />, shortcut: null, color: 'from-blue-500 to-indigo-500', action: () => setActivePage('purchases') },
        { label: 'Cari', icon: <Search className="w-4 h-4" />, shortcut: '⌘K', color: 'from-violet-500 to-purple-500', action: () => setSearchOpen(true) },
      ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting — clean, one breath */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{timeIcon}</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Halo {userName} 👋
          </h1>
          <p className="mt-0.5 text-stone-500">{roleGreeting.line1}</p>
        </div>
      </div>

      {/* Priority line — inline, not a section */}
      <div className="flex flex-wrap items-center gap-2">
        {lowStockCount > 0 && (
          <button onClick={() => setActivePage('products')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors border border-amber-200/60">
            <AlertTriangle className="w-3.5 h-3.5" />{lowStockCount} varian perlu restock
          </button>
        )}
        {data.pendingPurchaseCount > 0 && (
          <button onClick={() => setActivePage('purchases')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200/60">
            {data.pendingPurchaseCount} PO menunggu
          </button>
        )}
        {data.pendingSaleCount > 0 && (
          <button onClick={() => setActivePage('sales')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors border border-violet-200/60">
            {data.pendingSaleCount} SO belum selesai
          </button>
        )}
        {lowStockCount === 0 && data.pendingPurchaseCount === 0 && data.pendingSaleCount === 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/60">
            ✅ Semua lancar hari ini
          </span>
        )}
      </div>

      {/* Quick Actions — compact row */}
      <div className="flex items-center gap-2">
        {quickActions.map((a, i) => (
          <button key={i} onClick={a.action} className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200/80 hover:border-stone-300 shadow-sm hover:shadow transition-all text-sm font-medium text-stone-700">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>{a.icon}</div>
            {a.label}
            {a.shortcut && <kbd className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-400 border border-stone-200 ml-1">{a.shortcut}</kbd>}
          </button>
        ))}
      </div>

      {/* Low Stock — compact list, only show top 4 */}
      {data.lowStockProducts?.length > 0 && (role === 'owner' || role === 'admin' || role === 'warehouse') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Perlu Restock</p>
            {lowStockCount > 4 && <button onClick={() => setActivePage('products')} className="text-[10px] text-rose-500 hover:text-rose-600 font-medium">+{lowStockCount - 4} lainnya</button>}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {data.lowStockProducts.slice(0, 4).map((p) => (
              <button key={p.variantId} onClick={() => setActivePage('products')} className={`flex items-center gap-2.5 p-3 rounded-lg bg-white border hover:shadow-sm transition-shadow text-left ${p.stock <= 0 ? 'border-red-200' : 'border-stone-200/80'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${p.stock <= 0 ? 'bg-red-400' : 'bg-amber-400'}`}>{p.stock}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-800 truncate">{p.productName}</p>
                  <p className="text-[10px] text-stone-400 truncate">{p.variantName}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: Recent + Inbox — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Transaksi Terakhir</p>
            <button onClick={() => setActivePage('sales')} className="text-[10px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-0.5">Semua <ArrowRight className="w-2.5 h-2.5" /></button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100">
            {!data.recentTransactions?.length ? (
              <div className="p-5 text-center text-xs text-stone-400">Belum ada transaksi</div>
            ) : data.recentTransactions.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-stone-50/50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {t.type === 'sale' ? <ShoppingBag className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-stone-800">{t.transNo}</p>
                    <StatusBadge status={t.status} map={t.type === 'sale' ? 'sale' : 'purchase'} />
                  </div>
                  <p className="text-[10px] text-stone-400">{t.party || 'Umum'} · {fmtDate(t.date)}</p>
                </div>
                <p className="text-xs font-semibold text-stone-700 shrink-0">{fmtRp(t.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Inbox */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Inbox</p>
            <button onClick={() => setActivePage('inbox')} className="text-[10px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-0.5">Buka <ArrowRight className="w-2.5 h-2.5" /></button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100">
            {inboxItems.length === 0 ? (
              <div className="p-5 text-center text-xs text-stone-400">Tidak ada pesan baru</div>
            ) : inboxItems.slice(0, 4).map((item: any) => (
              <div key={item.id} className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-stone-50/50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${item.priority === 'urgent' ? 'bg-red-100 text-red-500' : item.priority === 'warning' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'}`}>
                  {item.type === 'stock_low' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-800">{item.title}</p>
                  <p className="text-[10px] text-stone-400 truncate">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
