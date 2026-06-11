'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useStockMutations, useProducts, useWarehouses } from '@/components/inventra/hooks/use-query-hooks'
import type { StockMutation, Product, Warehouse } from '@/components/inventra/shared/types'
import { fmtDateTime } from '@/components/inventra/shared/constants'

import {
  Card, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

import {
  RefreshCw, ArrowDown, ArrowUp, Minus, Plus, ArrowLeftRight, Package,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// --- Type for flattened variant with product name ---
interface FlatVariant {
  id: string
  name: string
  sku: string
  productName: string
  productId: string
  stock: number
  buyPrice: number
  sellPrice: number
  attributes: string
}

/** Parse variant attributes JSON into a readable string */
const parseVariantAttrs = (attrs: string): string => {
  try {
    const parsed = JSON.parse(attrs)
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ')
    }
    return ''
  } catch {
    return ''
  }
}

function StockMutationsModule() {
  const { activeModuleTab, setActiveModuleTab } = useAppStore()
  const queryClient = useQueryClient()

  // Tab state — consume deep-link tab from store (one-time)
  const [activeMainTab, setActiveMainTab] = useState<'input' | 'history'>(() => {
    if (activeModuleTab === 'history') {
      setActiveModuleTab(null)
      return 'history'
    }
    return 'input'
  })

  // History filter state
  const [filterType, setFilterType] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_LIMIT = 20

  // Sub-tab for create form
  const [activeTab, setActiveTab] = useState('transfer')

  // React Query: master data for Input tab
  const { data: productsResult } = useProducts({ limit: 200 })
  const products = productsResult?.data ?? []
  const { data: warehouses = [] } = useWarehouses()

  // React Query: stock mutations for History tab (lazy)
  const shouldFetchMutations = activeMainTab === 'history'
  const { data: mutationsData, isLoading: mutationsLoading, isFetching: mutationsFetching } = useStockMutations({
    type: filterType !== 'all' ? filterType : undefined,
    page,
    limit: PAGE_LIMIT,
    enabled: shouldFetchMutations,
  })
  const mutations = mutationsData?.data ?? []
  const pagination = mutationsData?.pagination

  // Variant typeahead
  const [variantSearch, setVariantSearch] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const variantInputRef = useRef<HTMLInputElement>(null)

  // Warehouse stock display
  const [warehouseStock, setWarehouseStock] = useState<number | null>(null)
  const [warehouseStockLoading, setWarehouseStockLoading] = useState(false)

  // Form fields per tab
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [qty, setQty] = useState('')
  const [inOutType, setInOutType] = useState<'IN' | 'OUT'>('IN')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Derived: all variants flattened
  const allVariants: FlatVariant[] = products.flatMap(p =>
    (p.variants || []).map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      productName: p.name,
      productId: p.id,
      stock: v.stock,
      buyPrice: v.buyPrice,
      sellPrice: v.sellPrice,
      attributes: v.attributes,
    }))
  )

  const selectedVariant = allVariants.find(v => v.id === selectedVariantId)

  // Filtered variants for typeahead
  const getFilteredVariants = (searchQuery: string) => {
    if (!searchQuery) return allVariants.slice(0, 8)
    const q = searchQuery.toLowerCase()
    return allVariants.filter(v => {
      if (v.sku.toLowerCase().includes(q)) return true
      if (v.productName.toLowerCase().includes(q)) return true
      if (v.name.toLowerCase().includes(q)) return true
      try {
        const attrs = JSON.parse(v.attributes)
        return Object.values(attrs ?? {}).some(val => String(val).toLowerCase().includes(q))
      } catch { return false }
    }).slice(0, 10)
  }

  const filteredVariants = getFilteredVariants(variantSearch)

  // Fetch warehouse stock for selected variant + warehouse
  const fetchWarehouseStock = useCallback(async (vId: string, whId: string) => {
    if (!vId || !whId) { setWarehouseStock(null); return }
    setWarehouseStockLoading(true)
    try {
      const res = await fetch(`/api/warehouse-stock?variantId=${vId}&warehouseId=${whId}`)
      const data = await res.json()
      if (data.success) setWarehouseStock(data.data.stock)
    } catch { setWarehouseStock(null) }
    finally { setWarehouseStockLoading(false) }
  }, [])

  // Update warehouse stock when variant or warehouse changes
  useEffect(() => {
    if (activeTab === 'transfer' && selectedVariantId && fromWarehouseId) {
      fetchWarehouseStock(selectedVariantId, fromWarehouseId)
    } else if ((activeTab === 'adjustment' || activeTab === 'inout') && selectedVariantId && warehouseId) {
      fetchWarehouseStock(selectedVariantId, warehouseId)
    } else {
      setWarehouseStock(null)
    }
  }, [selectedVariantId, fromWarehouseId, warehouseId, activeTab, fetchWarehouseStock])

  // Reset form
  const resetForm = () => {
    setVariantSearch('')
    setSelectedVariantId('')
    setFromWarehouseId('')
    setToWarehouseId('')
    setWarehouseId('')
    setQty('')
    setInOutType('IN')
    setNote('')
    setWarehouseStock(null)
  }

  const invalidateMutations = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedVariantId) { toast.error('Varian produk wajib dipilih'); return }

    const qtyNum = parseInt(qty)
    if (!qty || isNaN(qtyNum) || qtyNum === 0) { toast.error('Qty tidak valid'); return }

    setSaving(true)
    try {
      let body: Record<string, unknown> = { variantId: selectedVariantId, qty: qtyNum, note: note || undefined }

      switch (activeTab) {
        case 'transfer': {
          if (!fromWarehouseId) { toast.error('Gudang asal wajib dipilih'); setSaving(false); return }
          if (!toWarehouseId) { toast.error('Gudang tujuan wajib dipilih'); setSaving(false); return }
          if (fromWarehouseId === toWarehouseId) { toast.error('Gudang asal dan tujuan tidak boleh sama'); setSaving(false); return }
          if (qtyNum <= 0) { toast.error('Qty transfer harus lebih dari 0'); setSaving(false); return }
          body = { ...body, type: 'TRANSFER', fromWarehouseId, toWarehouseId }
          break
        }
        case 'adjustment': {
          if (!warehouseId) { toast.error('Gudang wajib dipilih'); setSaving(false); return }
          body = { ...body, type: 'ADJUSTMENT', warehouseId }
          break
        }
        case 'inout': {
          if (!warehouseId) { toast.error('Gudang wajib dipilih'); setSaving(false); return }
          if (qtyNum <= 0) { toast.error('Qty harus lebih dari 0'); setSaving(false); return }
          body = { ...body, type: inOutType, warehouseId }
          break
        }
      }

      const res = await fetch('/api/stock-mutations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        toast.error(result.message || 'Gagal membuat mutasi stok')
        setSaving(false)
        return
      }

      const tabLabel = activeTab === 'transfer' ? 'Transfer' : activeTab === 'adjustment' ? 'Penyesuaian' : (inOutType === 'IN' ? 'Stok masuk' : 'Stok keluar')
      toast.success(`${tabLabel} stok berhasil dicatat`)
      resetForm()
      invalidateMutations()
      // Also invalidate products since stock changed
      queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch {
      toast.error('Gagal membuat mutasi stok')
    } finally {
      setSaving(false)
    }
  }

  // Badge for mutation type
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IN': return <Badge className="bg-emerald-100 text-emerald-700"><ArrowDown className="w-3 h-3 mr-1" />Masuk</Badge>
      case 'OUT': return <Badge className="bg-red-100 text-red-700"><ArrowUp className="w-3 h-3 mr-1" />Keluar</Badge>
      case 'ADJUSTMENT': return <Badge className="bg-amber-100 text-amber-700"><Minus className="w-3 h-3 mr-1" />Penyesuaian</Badge>
      case 'TRANSFER': return <Badge className="bg-purple-100 text-purple-700"><ArrowLeftRight className="w-3 h-3 mr-1" />Transfer</Badge>
      default: return <Badge variant="secondary">{type}</Badge>
    }
  }

  // Get variant display name (with product name)
  const getVariantDisplayName = (m: StockMutation) => {
    const variantName = m.variant?.name || ''
    const productName = m.variant?.product?.name || m.product?.name || ''
    if (variantName && productName) return `${productName} — ${variantName}`
    return variantName || productName || '-'
  }

  // Active warehouses for select
  const activeWarehouses = warehouses.filter(w => w.isActive)

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeMainTab} onValueChange={v => setActiveMainTab(v as 'input' | 'history')} className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-full sm:w-auto">
          <TabsTrigger value="input" className="flex-1 sm:flex-none">Input</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">Riwayat</TabsTrigger>
        </TabsList>

        {/* ==================== INPUT TAB ==================== */}
        <TabsContent value="input" className="flex flex-col flex-1 min-h-0 mt-3 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="transfer" className="flex-1 text-xs">
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />Transfer
              </TabsTrigger>
              <TabsTrigger value="adjustment" className="flex-1 text-xs">
                <Minus className="w-3.5 h-3.5 mr-1" />Penyesuaian
              </TabsTrigger>
              <TabsTrigger value="inout" className="flex-1 text-xs">
                <Package className="w-3.5 h-3.5 mr-1" />Masuk/Keluar
              </TabsTrigger>
            </TabsList>

            {/* ===== Variant typeahead (shared across tabs) ===== */}
            <div className="mt-4 space-y-2">
              <Label className="text-xs font-medium">Varian Produk *</Label>
              <div className="relative">
                <Input
                  ref={variantInputRef}
                  placeholder="Ketik SKU / nama varian... (Tab → pilih)"
                  value={selectedVariantId ? (selectedVariant?.sku || '') : variantSearch}
                  onChange={e => {
                    setVariantSearch(e.target.value)
                    if (selectedVariantId) setSelectedVariantId('')
                  }}
                  onFocus={() => {
                    if (selectedVariantId && selectedVariant) {
                      setSelectedVariantId('')
                      setVariantSearch(selectedVariant.sku)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Tab' && !selectedVariantId && filteredVariants.length === 1) {
                      setSelectedVariantId(filteredVariants[0].id)
                      setVariantSearch('')
                      e.preventDefault()
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!selectedVariantId && filteredVariants.length === 1) {
                        setSelectedVariantId(filteredVariants[0].id)
                        setVariantSearch('')
                      } else if (selectedVariantId) {
                        handleSubmit()
                      }
                    }
                  }}
                />
                {variantSearch && !selectedVariantId && filteredVariants.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredVariants.map(v => (
                      <button
                        key={v.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-sm"
                        onMouseDown={() => {
                          setSelectedVariantId(v.id)
                          setVariantSearch('')
                        }}
                      >
                        <Badge variant="outline" className="font-mono text-[10px]">{v.sku}</Badge>
                        <span className="truncate">{v.productName} — {v.name}</span>
                        <span className="ml-auto text-muted-foreground text-xs shrink-0">Stok: {v.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Readonly detail fields for selected variant */}
              {selectedVariant && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nama Produk</Label>
                    <Input readOnly className="bg-muted text-muted-foreground h-8 text-sm" value={selectedVariant.productName} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Varian / Ukuran</Label>
                    <Input readOnly className="bg-muted text-muted-foreground h-8 text-sm" value={`${selectedVariant.name}${parseVariantAttrs(selectedVariant.attributes) ? ' — ' + parseVariantAttrs(selectedVariant.attributes) : ''}`} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Stok</Label>
                    <Input readOnly className="bg-muted text-muted-foreground h-8 text-sm" value={String(selectedVariant.stock)} />
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-3" />

            {/* ===== TRANSFER Sub-Tab ===== */}
            <TabsContent value="transfer" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Gudang Asal *</Label>
                  <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                    <SelectTrigger><SelectValue placeholder="Pilih gudang..." /></SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Gudang Tujuan *</Label>
                  <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                    <SelectTrigger><SelectValue placeholder="Pilih gudang..." /></SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {fromWarehouseId && selectedVariantId && warehouseStock !== null && (
                <div className="text-xs text-muted-foreground bg-amber-50 rounded-md px-3 py-1.5">
                  Stok di gudang asal: <span className="font-semibold text-amber-700">{warehouseStock}</span>
                  {warehouseStockLoading && <RefreshCw className="w-3 h-3 animate-spin inline ml-1" />}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Qty Transfer *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Jumlah yang ditransfer"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Catatan</Label>
                <Textarea
                  placeholder="Catatan transfer (opsional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="min-h-[60px] resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                />
              </div>
            </TabsContent>

            {/* ===== ADJUSTMENT Sub-Tab ===== */}
            <TabsContent value="adjustment" className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gudang *</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang..." /></SelectTrigger>
                  <SelectContent>
                    {activeWarehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {warehouseId && selectedVariantId && warehouseStock !== null && (
                <div className="text-xs text-muted-foreground bg-amber-50 rounded-md px-3 py-1.5">
                  Stok saat ini di gudang: <span className="font-semibold text-amber-700">{warehouseStock}</span>
                  {warehouseStockLoading && <RefreshCw className="w-3 h-3 animate-spin inline ml-1" />}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Qty Penyesuaian * <span className="text-muted-foreground">(positif = tambah, negatif = kurang)</span></Label>
                <Input
                  type="number"
                  placeholder="Contoh: 5 atau -3"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Catatan</Label>
                <Textarea
                  placeholder="Alasan penyesuaian (opsional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="min-h-[60px] resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                />
              </div>
            </TabsContent>

            {/* ===== IN/OUT Sub-Tab ===== */}
            <TabsContent value="inout" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tipe *</Label>
                  <Select value={inOutType} onValueChange={(v) => setInOutType(v as 'IN' | 'OUT')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">
                        <span className="flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5 text-emerald-600" />Masuk</span>
                      </SelectItem>
                      <SelectItem value="OUT">
                        <span className="flex items-center gap-1.5"><ArrowUp className="w-3.5 h-3.5 text-red-600" />Keluar</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Gudang *</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger><SelectValue placeholder="Pilih gudang..." /></SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {warehouseId && selectedVariantId && warehouseStock !== null && (
                <div className="text-xs text-muted-foreground bg-amber-50 rounded-md px-3 py-1.5">
                  Stok saat ini di gudang: <span className="font-semibold text-amber-700">{warehouseStock}</span>
                  {warehouseStockLoading && <RefreshCw className="w-3 h-3 animate-spin inline ml-1" />}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Qty *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Jumlah stok"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Catatan</Label>
                <Textarea
                  placeholder="Catatan (opsional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="min-h-[60px] resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Save button */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={saving || !selectedVariantId}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Simpan
            </Button>
          </div>
        </TabsContent>

        {/* ==================== HISTORY TAB ==================== */}
        <TabsContent value="history" className="flex flex-col flex-1 min-h-0 mt-3">
          {/* Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between shrink-0">
            <div className="flex gap-3 items-center">
              <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="IN">Masuk</SelectItem>
                  <SelectItem value="OUT">Keluar</SelectItem>
                  <SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => invalidateMutations()} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          {mutationsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <Card className="border-0">
              <CardContent className="p-0">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Varian / Produk</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Gudang</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mutations.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada data mutasi stok
                        </TableCell>
                      </TableRow>
                    ) : mutations.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(m.createdAt)}</TableCell>
                        <TableCell className="font-medium">{getVariantDisplayName(m)}</TableCell>
                        <TableCell>{getTypeBadge(m.type)}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={m.type === 'OUT' ? 'text-red-600' : m.type === 'IN' ? 'text-emerald-600' : ''}>
                            {m.type === 'OUT' ? `-${m.qty}` : `+${m.qty}`}
                          </span>
                        </TableCell>
                        <TableCell>{m.warehouse?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{m.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-3 px-1 border-t shrink-0">
              <span className="text-sm text-muted-foreground">
                {mutationsFetching && <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />}
                Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  Selanjutnya<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StockMutationsModule
