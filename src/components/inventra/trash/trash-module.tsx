'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { fmtDateTime, fmtRp } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import {
  Trash2, RotateCcw, RefreshCw, Package, ShoppingCart, ShoppingBag,
  Users, Truck, ClipboardCheck, AlertTriangle, Search, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

// ===================== TYPES =====================
type EntityType = 'Sale' | 'Purchase' | 'Product' | 'Supplier' | 'Customer' | 'StockOpname'

interface TrashedRecord {
  id: string
  transNo?: string
  code?: string
  sku?: string
  name?: string
  status?: string
  total?: number
  date?: string
  deletedAt: string
  notes?: string
  // Relations
  customer?: { id: string; name: string; code: string }
  supplier?: { id: string; name: string; code: string }
  category?: { id: string; name: string }
  variants?: Array<{ id: string; name: string; sku: string }>
  warehouse?: { id: string; name: string; code: string }
  items?: Array<{ id: string; variantId?: string; productId?: string; qty: number; sellPrice?: number; buyPrice?: number; variant?: { name: string; sku: string }; product?: { name: string; sku: string } }>
  _count?: { purchases: number; products: number; sales: number }
}

// ===================== ENTITY CONFIG =====================
const entityConfig: Record<EntityType, {
  label: string
  icon: React.ReactNode
  color: string
  getId: (r: TrashedRecord) => string
  getTitle: (r: TrashedRecord) => string
  getSubtitle: (r: TrashedRecord) => string
}> = {
  Sale: {
    label: 'Penjualan',
    icon: <ShoppingBag className="w-4 h-4" />,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    getId: (r) => r.transNo || r.id,
    getTitle: (r) => r.transNo || r.id.slice(0, 8),
    getSubtitle: (r) => r.customer?.name || (r.notes ? r.notes.slice(0, 40) : 'Tanpa customer'),
  },
  Purchase: {
    label: 'Pembelian',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
    getId: (r) => r.transNo || r.id,
    getTitle: (r) => r.transNo || r.id.slice(0, 8),
    getSubtitle: (r) => r.supplier?.name || 'Supplier',
  },
  Product: {
    label: 'Produk',
    icon: <Package className="w-4 h-4" />,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
    getId: (r) => r.sku || r.id,
    getTitle: (r) => r.name || 'Produk',
    getSubtitle: (r) => {
      const variantCount = r.variants?.length || 0
      return `SKU: ${r.sku || '-'} • ${variantCount} variant`
    },
  },
  Supplier: {
    label: 'Supplier',
    icon: <Truck className="w-4 h-4" />,
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400',
    getId: (r) => r.code || r.id,
    getTitle: (r) => r.name || 'Supplier',
    getSubtitle: (r) => r.code || '-',
  },
  Customer: {
    label: 'Customer',
    icon: <Users className="w-4 h-4" />,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
    getId: (r) => r.code || r.id,
    getTitle: (r) => r.name || 'Customer',
    getSubtitle: (r) => r.code || '-',
  },
  StockOpname: {
    label: 'Stock Opname',
    icon: <ClipboardCheck className="w-4 h-4" />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    getId: (r) => r.transNo || r.id,
    getTitle: (r) => r.transNo || r.id.slice(0, 8),
    getSubtitle: (r) => r.warehouse?.name || '-',
  },
}

const entityTypes: EntityType[] = ['Sale', 'Purchase', 'Product', 'Supplier', 'Customer', 'StockOpname']

// ===================== COMPONENT =====================
function TrashModule() {
  const [trashData, setTrashData] = useState<Record<EntityType, TrashedRecord[]>>({} as any)
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<{ entity: EntityType; id: string; title: string } | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<{ entity: EntityType; id: string; title: string } | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [purging, setPurging] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const entityParam = filterEntity !== 'all' ? `?entity=${filterEntity}` : ''
      const res = await fetch(`/api/trash${entityParam}`)
      const json = await res.json()
      if (json.success) {
        setTrashData(json.data || {})
      }
    } catch {
      toast.error('Gagal mengambil data sampah')
    } finally {
      setLoading(false)
    }
  }, [filterEntity])

  useEffect(() => { load() }, [load])

  const handleRestore = async () => {
    if (!restoreTarget) return
    setRestoring(restoreTarget.id)
    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: restoreTarget.entity, id: restoreTarget.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${entityConfig[restoreTarget.entity].label} "${restoreTarget.title}" berhasil dipulihkan`)
        load()
      } else {
        toast.error(json.message || 'Gagal memulihkan')
      }
    } catch {
      toast.error('Gagal memulihkan')
    } finally {
      setRestoring(null)
      setRestoreTarget(null)
    }
  }

  const handlePurge = async () => {
    if (!purgeTarget) return
    setPurging(purgeTarget.id)
    try {
      const res = await fetch('/api/trash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: purgeTarget.entity, id: purgeTarget.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${entityConfig[purgeTarget.entity].label} "${purgeTarget.title}" dihapus permanen`)
        load()
      } else {
        toast.error(json.message || 'Gagal menghapus permanen')
      }
    } catch {
      toast.error('Gagal menghapus permanen')
    } finally {
      setPurging(null)
      setPurgeTarget(null)
    }
  }

  // Flatten and filter all trashed items for search
  const allItems: Array<{ entity: EntityType; record: TrashedRecord }> = []
  for (const ent of entityTypes) {
    if (filterEntity !== 'all' && filterEntity !== ent) continue
    const records = trashData[ent] || []
    for (const record of records) {
      const config = entityConfig[ent]
      const title = config.getTitle(record)
      const subtitle = config.getSubtitle(record)
      const id = config.getId(record)
      if (search) {
        const q = search.toLowerCase()
        if (
          !title.toLowerCase().includes(q) &&
          !subtitle.toLowerCase().includes(q) &&
          !id.toLowerCase().includes(q)
        ) continue
      }
      allItems.push({ entity: ent, record })
    }
  }

  // Count totals
  const totalTrashed = allItems.length
  const entityCounts: Partial<Record<EntityType, number>> = {}
  for (const ent of entityTypes) {
    entityCounts[ent] = (trashData[ent] || []).length
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tempat Sampah</h2>
            <p className="text-xs text-muted-foreground">{totalTrashed} item terhapus</p>
          </div>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {entityTypes.map((ent) => (
              <SelectItem key={ent} value={ent}>
                {entityConfig[ent].label} ({entityCounts[ent] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari item terhapus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
          </div>
        ) : allItems.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-stone-300 dark:text-stone-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">
                Tempat sampah kosong
              </h3>
              <p className="text-sm text-stone-400 max-w-sm">
                Item yang dihapus akan muncul di sini. Anda bisa memulihkan atau menghapus permanen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allItems.map(({ entity, record }) => {
              const config = entityConfig[entity]
              const title = config.getTitle(record)
              const subtitle = config.getSubtitle(record)
              const isRestoring = restoring === record.id
              const isPurging = purging === record.id

              return (
                <Card key={`${entity}-${record.id}`} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Entity icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{title}</span>
                          <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
                          {record.status && (
                            <StatusBadge
                              status={record.status}
                              map={entity === 'Purchase' ? 'purchase' : entity === 'Sale' ? 'sale' : entity === 'StockOpname' ? 'purchase' : 'sale'}
                            />
                          )}
                          {record.total !== undefined && record.total > 0 && (
                            <span className="text-xs text-muted-foreground">{fmtRp(record.total)}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                        {record.date && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Tanggal: {fmtDateTime(record.date)}
                          </p>
                        )}
                        {/* Show items count for transactions */}
                        {record.items && record.items.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {record.items.length} item
                          </p>
                        )}
                        {/* Show variant count for products */}
                        {record.variants && record.variants.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {record.variants.map(v => v.name).join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Deleted timestamp + actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-red-400">
                          Dihapus: {fmtDateTime(record.deletedAt)}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                            disabled={isRestoring || isPurging}
                            onClick={() => setRestoreTarget({ entity, id: record.id, title })}
                          >
                            {isRestoring ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Pulihkan
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                            disabled={isRestoring || isPurging}
                            onClick={() => setPurgeTarget({ entity, id: record.id, title })}
                          >
                            {isPurging ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            Hapus Permanen
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Restore confirmation dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan {restoreTarget ? entityConfig[restoreTarget.entity].label : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{restoreTarget?.title}</strong> akan dikembalikan ke daftar aktif.
              Data yang dipulihkan bisa langsung diakses kembali seperti semula.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Pulihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge confirmation dialog */}
      <AlertDialog open={!!purgeTarget} onOpenChange={(open) => !open && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Hapus Permanen {purgeTarget ? entityConfig[purgeTarget.entity].label : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{purgeTarget?.title}</strong> akan dihapus secara permanen dan <strong>TIDAK BISA</strong> dikembalikan lagi.
              Semua data terkait juga akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TrashModule
