'use client'

import React from 'react'
import { ShoppingBag, ShoppingCart, Search, BarChart3, Users, Package, PackageCheck, ArrowRightLeft, Zap } from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface QuickActionCenterProps {
  role: string
}

export default function QuickActionCenter({ role }: QuickActionCenterProps) {
  const { setActivePage, setSearchOpen, setQuickActionOpen } = useAppStore()
  const ownerActions = [
    { label: 'Penjualan Baru', desc: 'Buat transaksi penjualan', icon: <ShoppingBag className="w-5 h-5" />, shortcut: 'Alt+S', color: 'from-emerald-500 to-teal-500', action: () => setQuickActionOpen(true) },
    { label: 'Pembelian Baru', desc: 'Buat purchase order', icon: <ShoppingCart className="w-5 h-5" />, shortcut: 'Alt+P', color: 'from-blue-500 to-indigo-500', action: () => setActivePage('purchases') },
    { label: 'Cari Data', desc: 'Cari apapun secara instan', icon: <Search className="w-5 h-5" />, shortcut: '\u2318K', color: 'from-violet-500 to-purple-500', action: () => setSearchOpen(true) },
    { label: 'Laporan', desc: 'Lihat ringkasan bisnis', icon: <BarChart3 className="w-5 h-5" />, shortcut: null, color: 'from-amber-500 to-orange-500', action: () => setActivePage('report-sales') },
  ]
  const staffActions = [
    { label: 'Buat Penjualan', desc: 'Catat penjualan baru', icon: <ShoppingBag className="w-5 h-5" />, shortcut: 'Alt+S', color: 'from-emerald-500 to-teal-500', action: () => setQuickActionOpen(true) },
    { label: 'Buat Pembelian', desc: 'Catat pembelian baru', icon: <ShoppingCart className="w-5 h-5" />, shortcut: null, color: 'from-blue-500 to-indigo-500', action: () => setActivePage('purchases') },
    { label: 'Cari Customer', desc: 'Temukan data customer', icon: <Users className="w-5 h-5" />, shortcut: '\u2318K', color: 'from-violet-500 to-purple-500', action: () => setSearchOpen(true) },
    { label: 'Cari Produk', desc: 'Cek stok & harga', icon: <Package className="w-5 h-5" />, shortcut: null, color: 'from-amber-500 to-orange-500', action: () => setActivePage('products') },
  ]
  const warehouseActions = [
    { label: 'Terima Barang', desc: 'Proses barang masuk', icon: <PackageCheck className="w-5 h-5" />, shortcut: null, color: 'from-emerald-500 to-teal-500', action: () => setActivePage('purchases') },
    { label: 'Mutasi Stok', desc: 'Catat pergerakan stok', icon: <ArrowRightLeft className="w-5 h-5" />, shortcut: null, color: 'from-blue-500 to-indigo-500', action: () => setActivePage('stock-mutations') },
    { label: 'Cari Produk', desc: 'Cek stok & lokasi', icon: <Search className="w-5 h-5" />, shortcut: '\u2318K', color: 'from-violet-500 to-purple-500', action: () => setSearchOpen(true) },
  ]
  const actions = role === 'warehouse' ? warehouseActions : role === 'staff' ? staffActions : ownerActions

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><Zap className="w-4 h-4" />Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <button key={i} onClick={a.action} className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl bg-white border border-stone-200/80 hover:border-stone-300 shadow-sm hover:shadow-md transition-all text-left">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>{a.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800">{a.label}</p>
              <p className="text-xs text-stone-400">{a.desc}</p>
            </div>
            {a.shortcut && <kbd className="text-[10px] bg-stone-100 px-2 py-1 rounded-md font-mono text-stone-500 border border-stone-200">{a.shortcut}</kbd>}
          </button>
        ))}
      </div>
    </div>
  )
}
