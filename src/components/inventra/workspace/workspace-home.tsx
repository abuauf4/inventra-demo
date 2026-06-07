'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  RefreshCw, Sun, Moon, BarChart3, PenLine, Warehouse,
  ShoppingBag, ShoppingCart, PackageCheck, PackageX,
  AlertTriangle, ArrowRightLeft, Activity, ArrowRight,
  Inbox as InboxIcon, Bell, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { fmtRp, fmt, fmtDate, fmtDateTime, roleGreetings } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'
import type { DashboardData } from '@/components/inventra/shared/types'
import ProfileCard from '@/components/inventra/workspace/profile-card'
import DailyPriorities from '@/components/inventra/workspace/priorities'
import QuickActionCenter from '@/components/inventra/workspace/quick-actions'

export default function WorkspaceHome() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [inboxItems, setInboxItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { currentUser, setActivePage } = useAppStore()
  const role = currentUser?.role || 'staff'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, inboxRes] = await Promise.all([fetch('/api/dashboard'), fetch('/api/inbox?limit=6')])
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

  // Natural role-based greeting
  const roleGreeting = roleGreetings[role] || roleGreetings.staff
  const greetingLine = `Halo ${userName} 👋 ${roleGreeting.line1}`

  const hour = new Date().getHours()
  const greetingIcon = hour < 12 ? <Sun className="w-6 h-6 text-amber-400" /> : hour < 17 ? <Sun className="w-6 h-6 text-orange-400" /> : <Moon className="w-6 h-6 text-indigo-400" />

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Greeting */}
      <div className="flex items-start gap-4">
        <div className="mt-1">{greetingIcon}</div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{greetingLine}</h1>
          <p className="mt-1 text-stone-400 text-base">
            {lowStockCount > 0 ? <span className="text-amber-600 font-medium">{lowStockCount} varian perlu restock</span> : 'Semua berjalan lancar hari ini'}
            {data.pendingPurchaseCount > 0 && <span className="text-stone-400"> · {data.pendingPurchaseCount} PO menunggu</span>}
            {data.pendingSaleCount > 0 && <span className="text-stone-400"> · {data.pendingSaleCount} SO belum selesai</span>}
          </p>
        </div>
      </div>

      {/* Top Grid: Profile + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2"><ProfileCard user={currentUser!} quote={roleGreeting.line1} /></div>
        <div className="lg:col-span-3"><DailyPriorities data={data} /></div>
      </div>

      {/* Quick Actions */}
      <QuickActionCenter role={role} />

      {/* Role-Specific Focus Cards */}
      {role === 'owner' || role === 'admin' ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><BarChart3 className="w-4 h-4" />Ringkasan Bisnis</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Penjualan Hari Ini</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{fmtRp(data.salesToday || 0)}</p>
              <p className="mt-1 text-xs text-stone-400">{data.salesTodayCount || 0} transaksi</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Pembelian Hari Ini</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{fmtRp(data.purchasesToday || 0)}</p>
              <p className="mt-1 text-xs text-stone-400">{data.purchasesTodayCount || 0} transaksi</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total Penjualan</p>
              <p className="mt-2 text-2xl font-bold text-stone-800">{fmtRp(data.totalSales || 0)}</p>
              <p className="mt-1 text-xs text-stone-400">{fmt(data.totalCustomers || 0)} customer</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total Produk</p>
              <p className="mt-2 text-2xl font-bold text-stone-800">{fmt(data.totalProducts || 0)}</p>
              <p className="mt-1 text-xs text-stone-400">{fmt(data.totalWarehouses || 0)} gudang</p>
            </div>
          </div>
        </div>
      ) : role === 'staff' ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><PenLine className="w-4 h-4" />Fokus Anda</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => setActivePage('sales')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform"><ShoppingBag className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-emerald-600">{data.pendingSaleCount || 0}</p><p className="text-xs text-stone-400">Sales Order Pending</p></div></div>
            </button>
            <button onClick={() => setActivePage('purchases')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform"><ShoppingCart className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-blue-600">{data.pendingPurchaseCount || 0}</p><p className="text-xs text-stone-400">Purchase Order Pending</p></div></div>
            </button>
            <button onClick={() => setActivePage('customers')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform"><Users className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-violet-600">{data.newCustomersThisWeek || 0}</p><p className="text-xs text-stone-400">Customer Baru (7 Hari)</p></div></div>
            </button>
          </div>
        </div>
      ) : role === 'warehouse' ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><Warehouse className="w-4 h-4" />Fokus Gudang</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => setActivePage('purchases')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform"><PackageCheck className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-emerald-600">{data.stockInToday || 0}</p><p className="text-xs text-stone-400">Barang Masuk Hari Ini</p></div></div>
            </button>
            <button onClick={() => setActivePage('sales')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform"><PackageX className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-blue-600">{data.stockOutToday || 0}</p><p className="text-xs text-stone-400">Barang Keluar Hari Ini</p></div></div>
            </button>
            <button onClick={() => setActivePage('products')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform"><AlertTriangle className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-amber-600">{lowStockCount}</p><p className="text-xs text-stone-400">Stok Menipis</p></div></div>
            </button>
            <button onClick={() => setActivePage('warehouses')} className="bg-white rounded-xl border border-stone-200/80 p-5 hover:shadow-md transition-shadow text-left group">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 group-hover:scale-105 transition-transform"><ArrowRightLeft className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-stone-600">{fmt(data.totalWarehouses || 0)}</p><p className="text-xs text-stone-400">Gudang Aktif</p></div></div>
            </button>
          </div>
        </div>
      ) : null}

      {/* Low Stock Alert Cards */}
      {data.lowStockProducts?.length > 0 && (role === 'owner' || role === 'admin' || role === 'warehouse') && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Perlu Restock</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.lowStockProducts.slice(0, 6).map((p) => (
              <button key={p.variantId} onClick={() => setActivePage('products')} className={`flex items-center gap-3 p-4 rounded-xl bg-white border hover:shadow-md transition-shadow text-left ${p.stock <= 0 ? 'border-red-200 bg-red-50/30' : p.stock <= p.minStock / 2 ? 'border-amber-200 bg-amber-50/30' : 'border-stone-200/80'}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ${p.stock <= 0 ? 'bg-gradient-to-br from-red-400 to-red-500' : 'bg-gradient-to-br from-amber-400 to-amber-500'}`}>{p.stock}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{p.productName}</p>
                  <p className="text-xs text-stone-400">{p.variantName} · Min. {p.minStock}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Grid: Recent Transactions + Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4" />Transaksi Terbaru</h3>
            <button onClick={() => setActivePage('sales')} className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1">Lihat Semua <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100">
            {!data.recentTransactions?.length ? <div className="p-6 text-center text-sm text-stone-400">Belum ada transaksi</div> : data.recentTransactions.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/50 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {t.type === 'sale' ? <ShoppingBag className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium text-stone-800">{t.transNo}</p><StatusBadge status={t.status} map={t.type === 'sale' ? 'sale' : 'purchase'} /></div>
                  <p className="text-xs text-stone-400">{t.party || 'Umum'} · {fmtDate(t.date)}</p>
                </div>
                <p className="text-sm font-semibold text-stone-700">{fmtRp(t.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Inbox */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><InboxIcon className="w-4 h-4" />Inbox</h3>
            <button onClick={() => setActivePage('inbox')} className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1">Buka Inbox <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100">
            {inboxItems.length === 0 ? <div className="p-6 text-center text-sm text-stone-400">Tidak ada pesan baru</div> : inboxItems.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${item.priority === 'urgent' ? 'bg-red-100 text-red-500' : item.priority === 'warning' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'}`}>
                  {item.type === 'stock_low' ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{item.title}</p>
                  <p className="text-xs text-stone-400 truncate">{item.message}</p>
                </div>
                <span className="text-[10px] text-stone-300 shrink-0">{fmtDateTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
