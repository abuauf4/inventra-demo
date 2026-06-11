'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProducts, useWarehouses, useStockMutations } from '@/components/inventra/hooks/use-query-hooks'
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
  RefreshCw, ArrowRightLeft, Plus, ArrowUp, ArrowDown, Package,
  Warehouse as WarehouseIcon, Search, CheckCircle2,
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

// --- Transfer pair type for grouped history ---
interface TransferPair {
  id: string // use OUT mutation id as key
  date: string
  variantName: string
  productName: string
  qty: number
  fromWarehouse: string
  toWarehouse: string
  note: string
  outMutation: StockMutation
  inMutation: StockMutation | null
}

function StockTransferModule() {
  const queryClient = useQueryClient()

  // Tab state
  const [activeMainTab, setActiveMainTab] = useState<'input' | 'history'>('input')

  // React Query: master data
  const { data: productsResult } = useProducts({ limit: 200 })
  const products = productsResult?.data ?? []
  const { data: warehouses = [] } = useWarehouses()

  // React Query: transfer history (fetch OUT and IN, then pair them)
  const { data: outMutationsResult, isLoading: outLoading, isFetching: outFetching } = useStockMutations({
    type: 'OUT',
    limit: 200,
    enabled: activeMainTab === 'history',
  })
  const outMutations = outMutationsResult?.data ?? []
  const { data: inMutationsResult, isLoading: inLoading, isFetching: inFetching } = useStockMutations({
    type: 'IN',
    limit: 200,
    enabled: activeMainTab === 'history',
  })
  const inMutations = inMutationsResult?.data ?? []

  // Variant typeahead
  const [variantSearch, setVariantSearch] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const variantInputRef = useRef<HTMLInputElement>(null)

  // Warehouse stock display
  const [warehouseStock, setWarehouseStock] = useState<number | null>(null)
  const [warehouseStockLoading, setWarehouseStockLoading] = useState(false)

  // Destination warehouse stock
  const [destWarehouseStock, setDestWarehouseStock] = useState<number | null>(null)

  // Form fields
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [qty, setQty] = useState('')
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

  const fetchDestWarehouseStock = useCallback(async (vId: string, whId: string) => {
    if (!vId || !whId) { setDestWarehouseStock(null); return }
    try {
      const res = await fetch(`/api/warehouse-stock?variantId=${vId}&warehouseId=${whId}`)
      const data = await res.json()
      if (data.success) setDestWarehouseStock(data.data.stock)
    } catch { setDestWarehouseStock(null) }
  }, [])

  // Update warehouse stock when variant or warehouse changes
  useEffect(() => {
    if (selectedVariantId && fromWarehouseId) {
      fetchWarehouseStock(selectedVariantId, fromWarehouseId)
    } else {
      setWarehouseStock(null)
    }
  }, [selectedVariantId, fromWarehouseId, fetchWarehouseStock])

  useEffect(() => {
    if (selectedVariantId && toWarehouseId) {
      fetchDestWarehouseStock(selectedVariantId, toWarehouseId)
    } else {
      setDestWarehouseStock(null)
    }
  }, [selectedVariantId, toWarehouseId, fetchDestWarehouseStock])

  // Reset form
  const resetForm = () => {
    setVariantSearch('')
    setSelectedVariantId('')
    setFromWarehouseId('')
    setToWarehouseId('')
    setQty('')
    setNote('')
    setWarehouseStock(null)
    setDestWarehouseStock(null)
  }

  const invalidateMutations = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedVariantId) { toast.error('Varian produk wajib dipilih'); return }
    if (!fromWarehouseId) { toast.error('Gudang asal wajib dipilih'); return }
    if (!toWarehouseId) { toast.error('Gudang tujuan wajib dipilih'); return }
    if (fromWarehouseId === toWarehouseId) { toast.error('Gudang asal dan tujuan tidak boleh sama'); return }

    const qtyNum = parseInt(qty)
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) { toast.error('Qty transfer harus lebih dari 0'); return }

    if (warehouseStock !== null && qtyNum > warehouseStock) {
      toast.error(`Stok di gudang asal tidak mencukupi (tersedia: ${warehouseStock})`)
      return
    }

    setSaving(true)
    try {
      const body = {
        type: 'TRANSFER',
        variantId: selectedVariantId,
        fromWarehouseId,
        toWarehouseId,
        qty: qtyNum,
        note: note || undefined,
      }

      const res = await fetch('/api/stock-mutations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        toast.error(result.message || 'Gagal membuat transfer stok')
        setSaving(false)
        return
      }

      toast.success('Transfer stok berhasil dicatat')
      resetForm()
      invalidateMutations()
    } catch {
      toast.error('Gagal membuat transfer stok')
    } finally {
      setSaving(false)
    }
  }

  // Build transfer pairs from OUT+IN mutations
  // Transfer OUT mutations have note like "Transfer ke {warehouseName}"
  // Transfer IN mutations have note like "Transfer dari {warehouseName}"
  const buildTransferPairs = (): TransferPair[] => {
    // Filter only transfer-related mutations by checking note pattern
    const transferOuts = outMutations.filter(m =>
      m.note && m.note.startsWith('Transfer ke ')
    )
    const transferIns = inMutations.filter(m =>
      m.note && m.note.startsWith('Transfer dari ')
    )

    // Pair OUT with IN: same variantId, same qty, within 2 seconds of each other
    const pairs: TransferPair[] = []
    const usedInIds = new Set<string>()

    for (const outM of transferOuts) {
      const toWhName = outM.note!.replace('Transfer ke ', '')

      // Find matching IN mutation
      let bestMatch: StockMutation | null = null
      let bestTimeDiff = Infinity

      for (const inM of transferIns) {
        if (usedInIds.has(inM.id)) continue
        if (inM.variantId !== outM.variantId) continue
        if (inM.qty !== outM.qty) continue

        const outTime = new Date(outM.createdAt).getTime()
        const inTime = new Date(inM.createdAt).getTime()
        const diff = Math.abs(outTime - inTime)

        if (diff < bestTimeDiff && diff < 5000) { // within 5 seconds
          bestTimeDiff = diff
          bestMatch = inM
        }
      }

      if (bestMatch) {
        usedInIds.add(bestMatch.id)
        const fromWhName = outM.warehouse?.name || '-'

        pairs.push({
          id: outM.id,
          date: outM.createdAt,
          variantName: outM.variant?.name || '-',
          productName: outM.variant?.product?.name || outM.product?.name || '-',
          qty: outM.qty,
          fromWarehouse: fromWhName,
          toWarehouse: toWhName,
          note: outM.note || '',
          outMutation: outM,
          inMutation: bestMatch,
        })
      } else {
        // Unpaired OUT — still show it
        const toWhName = outM.note!.replace('Transfer ke ', '')
        pairs.push({
          id: outM.id,
          date: outM.createdAt,
          variantName: outM.variant?.name || '-',
          productName: outM.variant?.product?.name || outM.product?.name || '-',
          qty: outM.qty,
          fromWarehouse: outM.warehouse?.name || '-',
          toWarehouse: toWhName,
          note: outM.note || '',
          outMutation: outM,
          inMutation: null,
        })
      }
    }

    return pairs
  }

  const transferPairs = activeMainTab === 'history' ? buildTransferPairs() : []
  const historyLoading = outLoading || inLoading
  const historyFetching = outFetching || inFetching

  // Active warehouses for select
  const activeWarehouses = warehouses.filter(w => w.isActive)

  // Source warehouse name lookup
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || ''

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeMainTab} onValueChange={v => setActiveMainTab(v as 'input' | 'history')} className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-full sm:w-auto">
          <TabsTrigger value="input" className="flex-1 sm:flex-none">
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
            Transfer Baru
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">
            Riwayat Transfer
          </TabsTrigger>
        </TabsList>

        {/* ==================== INPUT TAB ==================== */}
        <TabsContent value="input" className="flex flex-col flex-1 min-h-0 mt-3 overflow-y-auto">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Transfer Stok Antar Gudang</h2>
                  <p className="text-xs text-muted-foreground">Pindahkan stok dari satu gudang ke gudang lain</p>
                </div>
              </div>

              <Separator />

              {/* ===== Variant typeahead ===== */}
              <div className="space-y-2">
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

              <Separator />

              {/* ===== Warehouse Selection ===== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source Warehouse */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ArrowUp className="w-3 h-3 text-red-500" />
                    Gudang Asal *
                  </Label>
                  <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih gudang asal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="flex items-center gap-2">
                            <WarehouseIcon className="w-3 h-3 text-muted-foreground" />
                            {w.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Show source warehouse stock */}
                  {fromWarehouseId && selectedVariantId && warehouseStock !== null && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md px-3 py-2 flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      <span>Stok di gudang asal: <span className="font-bold">{warehouseStock}</span></span>
                      {warehouseStockLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    </div>
                  )}
                  {fromWarehouseId && selectedVariantId && warehouseStock !== null && warehouseStock === 0 && (
                    <div className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md px-3 py-2">
                      Stok di gudang asal kosong. Tidak bisa melakukan transfer.
                    </div>
                  )}
                </div>

                {/* Destination Warehouse */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ArrowDown className="w-3 h-3 text-emerald-500" />
                    Gudang Tujuan *
                  </Label>
                  <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih gudang tujuan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>
                          <span className="flex items-center gap-2">
                            <WarehouseIcon className="w-3 h-3 text-muted-foreground" />
                            {w.name}
                            {w.id === fromWarehouseId && <span className="text-xs text-muted-foreground">(gudang asal)</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Show destination warehouse stock */}
                  {toWarehouseId && selectedVariantId && destWarehouseStock !== null && (
                    <div className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md px-3 py-2 flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      <span>Stok di gudang tujuan: <span className="font-bold">{destWarehouseStock}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer direction visual */}
              {fromWarehouseId && toWarehouseId && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <Badge variant="outline" className="text-xs border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    {getWarehouseName(fromWarehouseId)}
                  </Badge>
                  <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                  <Badge variant="outline" className="text-xs border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                    <ArrowDown className="w-3 h-3 mr-1" />
                    {getWarehouseName(toWarehouseId)}
                  </Badge>
                </div>
              )}

              <Separator />

              {/* ===== Qty and Note ===== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Qty Transfer *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={warehouseStock ?? undefined}
                    placeholder="Jumlah yang ditransfer"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                  />
                  {warehouseStock !== null && qty && parseInt(qty) > warehouseStock && (
                    <p className="text-xs text-red-500">Melebihi stok yang tersedia ({warehouseStock})</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Catatan <span className="text-muted-foreground">(opsional)</span></Label>
                  <Textarea
                    placeholder="Catatan transfer..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="min-h-[38px] resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && selectedVariantId) { handleSubmit(); e.preventDefault() } }}
                  />
                </div>
              </div>

              {/* Summary before submit */}
              {selectedVariantId && fromWarehouseId && toWarehouseId && qty && parseInt(qty) > 0 && fromWarehouseId !== toWarehouseId && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Ringkasan Transfer:</span>
                  </div>
                  <div className="mt-1.5 text-xs text-purple-600 dark:text-purple-400 space-y-0.5">
                    <p>{selectedVariant?.productName} — {selectedVariant?.name}</p>
                    <p className="font-semibold">{qty} unit dari <span className="text-red-600 dark:text-red-400">{getWarehouseName(fromWarehouseId)}</span> ke <span className="text-emerald-600 dark:text-emerald-400">{getWarehouseName(toWarehouseId)}</span></p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t shrink-0">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !selectedVariantId || !fromWarehouseId || !toWarehouseId || !qty || fromWarehouseId === toWarehouseId}
              className="bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:from-purple-600 hover:to-violet-600"
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              Transfer Stok
            </Button>
          </div>
        </TabsContent>

        {/* ==================== HISTORY TAB ==================== */}
        <TabsContent value="history" className="flex flex-col flex-1 min-h-0 mt-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Riwayat Transfer Gudang</h3>
              <Badge variant="secondary" className="text-[10px]">{transferPairs.length} transaksi</Badge>
            </div>
            <Button onClick={() => invalidateMutations()} variant="outline" size="sm">
              {(historyFetching) ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-3">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : !transferPairs.length ? (
              <Card className="border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                    <ArrowRightLeft className="w-6 h-6 text-stone-300 dark:text-stone-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Belum ada riwayat transfer stok</p>
                  <p className="text-xs text-muted-foreground mt-1">Transfer stok antar gudang akan tercatat di sini</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0">
                <CardContent className="p-0">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Varian / Produk</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Dari</TableHead>
                          <TableHead>Ke</TableHead>
                          <TableHead>Catatan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transferPairs.map(pair => (
                          <TableRow key={pair.id}>
                            <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(pair.date)}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{pair.productName}</div>
                              <div className="text-xs text-muted-foreground">{pair.variantName}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-semibold">
                                {pair.qty}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <ArrowUp className="w-3 h-3 text-red-500" />
                                {pair.fromWarehouse}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <ArrowDown className="w-3 h-3 text-emerald-500" />
                                {pair.toWarehouse}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                              {pair.note || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StockTransferModule
