'use client'

import React, { useState, useMemo } from 'react'
import {
  AlertTriangle, Package, Warehouse, ArrowUpDown,
  AlertCircle, AlertOctagon, ChevronLeft, Filter,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────
interface WarehouseBreakdown {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  stock: number
}

interface StockAlertItem {
  variantId: string
  variantName: string
  variantSku: string
  stock: number
  minStock: number
  productId: string
  productName: string
  productSku: string
  category: string | null
  severity: 'critical' | 'low' | 'warning'
  warehouseBreakdown: WarehouseBreakdown[]
}

interface StockAlertSummary {
  total: number
  critical: number
  low: number
  warning: number
}

type SeverityFilter = 'all' | 'critical' | 'low' | 'warning'
type SortOption = 'stock-asc' | 'stock-desc' | 'name-asc'

// ─── Severity Config ──────────────────────────────────────────────
const severityConfig = {
  critical: {
    label: 'Habis',
    icon: AlertOctagon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/15',
    borderColor: 'border-red-200/60 dark:border-red-800/25',
    badgeVariant: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/30',
    progressColor: 'bg-red-500',
  },
  low: {
    label: 'Rendah',
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/15',
    borderColor: 'border-amber-200/60 dark:border-amber-800/25',
    badgeVariant: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/30',
    progressColor: 'bg-amber-500',
  },
  warning: {
    label: 'Perhatian',
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/15',
    borderColor: 'border-yellow-200/60 dark:border-yellow-800/25',
    badgeVariant: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200/50 dark:border-yellow-800/30',
    progressColor: 'bg-yellow-500',
  },
} as const

// ─── Stock Alert Card ─────────────────────────────────────────────
function StockAlertCard({ item }: { item: StockAlertItem }) {
  const config = severityConfig[item.severity]
  const stockPercent = item.minStock > 0 ? Math.min((item.stock / item.minStock) * 100, 100) : 0

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4 transition-all duration-200 hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        {/* Severity Icon */}
        <div className={`w-10 h-10 rounded-lg ${config.bgColor} border ${config.borderColor} flex items-center justify-center shrink-0`}>
          <config.icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
              {item.productName}
            </h3>
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md border ${config.badgeVariant}`}>
              {config.label}
            </span>
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
            {item.variantName} · SKU: {item.variantSku}
            {item.category && ` · ${item.category}`}
          </p>

          {/* Stock Progress */}
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">
                Stok: <span className={`font-bold ${config.color}`}>{item.stock}</span> / {item.minStock}
              </span>
              <span className="text-stone-400 text-[10px]">
                {Math.round(stockPercent)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-200/60 dark:bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${config.progressColor}`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
          </div>

          {/* Warehouse Breakdown */}
          {item.warehouseBreakdown.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Warehouse className="w-3 h-3" />
                Distribusi Gudang
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.warehouseBreakdown.map((ws) => (
                  <span
                    key={ws.warehouseId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/60 dark:bg-white/[0.04] border border-stone-200/40 dark:border-white/[0.06] text-[10px] text-stone-600 dark:text-stone-400"
                  >
                    {ws.warehouseName}: <span className="font-semibold">{ws.stock}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Stock Alerts Module ─────────────────────────────────────
export default function StockAlertsModule() {
  const { setActivePage } = useAppStore()
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('stock-asc')

  // Fetch stock alerts
  const { data, isLoading } = useQuery({
    queryKey: ['stock-alerts', severityFilter, sortBy],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (severityFilter !== 'all') qs.set('severity', severityFilter)
      if (sortBy !== 'stock-asc') qs.set('sort', sortBy)
      const res = await fetch(`/api/stock-alerts?${qs}`)
      if (!res.ok) throw new Error('Gagal mengambil data')
      const json = await res.json()
      return {
        data: json.data as StockAlertItem[],
        summary: json.summary as StockAlertSummary,
      }
    },
    staleTime: 30 * 1000,
  })

  const summary = data?.summary ?? { total: 0, critical: 0, low: 0, warning: 0 }
  const items = data?.data ?? []

  const filterButtons: Array<{ key: SeverityFilter; label: string; count: number }> = [
    { key: 'all', label: 'Semua', count: summary.total },
    { key: 'critical', label: 'Habis', count: summary.critical },
    { key: 'low', label: 'Rendah', count: summary.low },
    { key: 'warning', label: 'Perhatian', count: summary.warning },
  ]

  return (
    <div className="flex flex-col h-full page-enter">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setActivePage('dashboard')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.04] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h1 className="text-lg font-bold text-stone-900 dark:text-white">
              Peringatan Stok Rendah
            </h1>
          </div>
          {summary.total > 0 && (
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30">
              {summary.total} varian
            </Badge>
          )}
        </div>
        <p className="text-xs text-stone-400 ml-10">
          Produk yang stoknya di bawah atau sama dengan batas minimum
        </p>
      </div>

      {/* Summary Cards */}
      <div className="shrink-0 grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className={`rounded-xl border p-3 ${
          summary.critical > 0
            ? 'border-red-200/60 dark:border-red-800/25 bg-red-50/40 dark:bg-red-900/10'
            : 'border-stone-200/40 dark:border-white/[0.04] bg-white/60 dark:bg-[#1a1f2e]/60'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertOctagon className={`w-3.5 h-3.5 ${summary.critical > 0 ? 'text-red-500' : 'text-stone-300 dark:text-stone-600'}`} />
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Habis</span>
          </div>
          <p className={`text-lg font-bold ${summary.critical > 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-400'}`}>
            {summary.critical}
          </p>
        </div>
        <div className={`rounded-xl border p-3 ${
          summary.low > 0
            ? 'border-amber-200/60 dark:border-amber-800/25 bg-amber-50/40 dark:bg-amber-900/10'
            : 'border-stone-200/40 dark:border-white/[0.04] bg-white/60 dark:bg-[#1a1f2e]/60'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className={`w-3.5 h-3.5 ${summary.low > 0 ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'}`} />
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Rendah</span>
          </div>
          <p className={`text-lg font-bold ${summary.low > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`}>
            {summary.low}
          </p>
        </div>
        <div className={`rounded-xl border p-3 ${
          summary.warning > 0
            ? 'border-yellow-200/60 dark:border-yellow-800/25 bg-yellow-50/40 dark:bg-yellow-900/10'
            : 'border-stone-200/40 dark:border-white/[0.04] bg-white/60 dark:bg-[#1a1f2e]/60'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${summary.warning > 0 ? 'text-yellow-500' : 'text-stone-300 dark:text-stone-600'}`} />
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Perhatian</span>
          </div>
          <p className={`text-lg font-bold ${summary.warning > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-stone-400'}`}>
            {summary.warning}
          </p>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
        {/* Severity Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          {filterButtons.map(fb => (
            <button
              key={fb.key}
              onClick={() => setSeverityFilter(fb.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                severityFilter === fb.key
                  ? 'bg-stone-800 dark:bg-white text-white dark:text-stone-900'
                  : 'bg-white/60 dark:bg-white/[0.04] border border-stone-200/40 dark:border-white/[0.06] text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              {fb.label} ({fb.count})
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs bg-white/60 dark:bg-white/[0.04] border border-stone-200/40 dark:border-white/[0.06] rounded-lg px-2 py-1 text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-stone-600"
          >
            <option value="stock-asc">Stok Terendah</option>
            <option value="stock-desc">Stok Tertinggi</option>
            <option value="name-asc">Nama A-Z</option>
          </select>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Package className="w-5 h-5 text-stone-300 animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-stone-300 dark:text-stone-600" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">
              Semua Stok Aman
            </h3>
            <p className="text-xs text-stone-400 max-w-sm">
              Tidak ada varian yang stoknya di bawah batas minimum saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {items.map(item => (
              <StockAlertCard key={item.variantId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
