'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Sliders, Plus, Trash2, Send, CheckCircle2, XCircle, Loader2,
  ArrowUpDown, Package, Search, RefreshCw,
} from 'lucide-react'

interface Variant {
  id: string
  name: string
  sku: string
  stock: number
  buyPrice: number
  sellPrice: number
  minStock: number
  product: { id: string; name: string; sku: string }
  warehouseStocks: { warehouseId: string; stock: number; warehouse: { id: string; name: string } }[]
}

interface Warehouse {
  id: string
  name: string
  code: string
  isActive: boolean
}

interface AdjustmentRow {
  variantId: string
  variant: Variant
  stockChange: number
  newBuyPrice?: number
  newSellPrice?: number
  reason: string
}

export default function StockAdjustmentModule() {
  const { currentUser } = useAppStore()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Variant picker
  const [variants, setVariants] = useState<Variant[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/warehouses')
      const json = await res.json()
      if (json.success) {
        setWarehouses(json.data.filter((w: Warehouse) => w.isActive))
        if (json.data.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(json.data[0].id)
        }
      }
    } catch (e) {
      console.error('Fetch warehouses error:', e)
    }
  }, [])

  const fetchVariants = useCallback(async () => {
    try {
      const res = await fetch(`/api/products?limit=200${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`)
      const json = await res.json()
      if (json.success) {
        const allVariants: Variant[] = []
        const products = json.data || json
        for (const p of products) {
          if (p.variants) {
            for (const v of p.variants) {
              allVariants.push({ ...v, product: { id: p.id, name: p.name, sku: p.sku } })
            }
          }
        }
        setVariants(allVariants)
      }
    } catch (e) {
      console.error('Fetch variants error:', e)
    }
  }, [searchQuery])

  useEffect(() => { fetchWarehouses() }, [])
  useEffect(() => { if (showPicker) fetchVariants() }, [showPicker, fetchVariants])

  const addVariant = (variant: Variant) => {
    if (adjustments.some(a => a.variantId === variant.id)) return
    setAdjustments(prev => [...prev, {
      variantId: variant.id,
      variant,
      stockChange: 0,
      newBuyPrice: undefined,
      newSellPrice: undefined,
      reason: '',
    }])
    setShowPicker(false)
  }

  const removeVariant = (variantId: string) => {
    setAdjustments(prev => prev.filter(a => a.variantId !== variantId))
  }

  const updateAdjustment = (variantId: string, field: string, value: any) => {
    setAdjustments(prev => prev.map(a =>
      a.variantId === variantId ? { ...a, [field]: value } : a
    ))
  }

  const handleSubmit = async () => {
    if (!selectedWarehouse) {
      alert('Pilih gudang terlebih dahulu')
      return
    }
    if (adjustments.length === 0) {
      alert('Tambahkan minimal 1 item')
      return
    }

    const hasChanges = adjustments.some(a =>
      a.stockChange !== 0 || a.newBuyPrice !== undefined || a.newSellPrice !== undefined
    )
    if (!hasChanges) {
      alert('Tidak ada perubahan yang dilakukan')
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/batch-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouse,
          adjustments: adjustments.map(a => ({
            variantId: a.variantId,
            stockChange: a.stockChange,
            newBuyPrice: a.newBuyPrice,
            newSellPrice: a.newSellPrice,
            reason: a.reason || notes || 'Batch adjustment',
          })),
          notes,
        }),
      })

      const json = await res.json()
      setResult(json)

      if (json.success && json.summary?.failed === 0) {
        setAdjustments([])
        setNotes('')
      }
    } catch (e) {
      console.error('Batch adjustment submit error:', e)
      setResult({ success: false, message: 'Gagal mengirim batch adjustment' })
    } finally {
      setSubmitting(false)
    }
  }

  const getWarehouseStock = (variant: Variant) => {
    const ws = variant.warehouseStocks?.find(w => w.warehouseId === selectedWarehouse)
    return ws?.stock ?? 0
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Penyesuaian Stok Batch</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">Update stok & harga banyak varian sekaligus</p>
          </div>
        </div>
      </div>

      {/* Config */}
      <Card className="border-stone-200 dark:border-stone-800">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-500 dark:text-stone-400">Gudang</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih gudang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-stone-500 dark:text-stone-400">Catatan Umum</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Alasan penyesuaian (opsional)"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Table */}
      <Card className="border-stone-200 dark:border-stone-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-stone-400" />
              Item Penyesuaian
              {adjustments.length > 0 && (
                <Badge variant="secondary" className="ml-1">{adjustments.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={() => setShowPicker(true)} className="h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Tambah Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {adjustments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sliders className="w-10 h-10 text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-sm text-stone-400 dark:text-stone-500">Belum ada item. Klik &quot;Tambah Item&quot; untuk mulai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Varian</TableHead>
                    <TableHead className="text-center">Stok Gudang</TableHead>
                    <TableHead className="text-center">Perubahan Stok</TableHead>
                    <TableHead className="text-center">Stok Baru</TableHead>
                    <TableHead className="text-center">Harga Beli</TableHead>
                    <TableHead className="text-center">Harga Jual</TableHead>
                    <TableHead className="w-[150px]">Alasan</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => {
                    const currentWhStock = getWarehouseStock(adj.variant)
                    const newWhStock = currentWhStock + adj.stockChange
                    return (
                      <TableRow key={adj.variantId}>
                        <TableCell>
                          <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate max-w-[200px]">
                            {adj.variant.product.name}
                          </div>
                          <div className="text-xs text-stone-400 dark:text-stone-500">
                            {adj.variant.name} — {adj.variant.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {currentWhStock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={adj.stockChange || ''}
                            onChange={e => updateAdjustment(adj.variantId, 'stockChange', parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-center text-sm font-mono mx-auto"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`font-mono text-xs ${newWhStock < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                            {newWhStock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={adj.newBuyPrice ?? ''}
                            onChange={e => updateAdjustment(adj.variantId, 'newBuyPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-24 h-8 text-center text-sm font-mono mx-auto"
                            placeholder={String(adj.variant.buyPrice)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={adj.newSellPrice ?? ''}
                            onChange={e => updateAdjustment(adj.variantId, 'newSellPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-24 h-8 text-center text-sm font-mono mx-auto"
                            placeholder={String(adj.variant.sellPrice)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={adj.reason}
                            onChange={e => updateAdjustment(adj.variantId, 'reason', e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Alasan..."
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-red-500" onClick={() => removeVariant(adj.variantId)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      {adjustments.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {adjustments.length} item akan disesuaikan
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Memproses...' : 'Kirim Penyesuaian'}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card className={`border-2 ${result.success ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-semibold text-sm">
                {result.success ? 'Batch Adjustment Berhasil' : `Gagal: ${result.message}`}
              </span>
            </div>
            {result.summary && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                  <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{result.summary.total}</div>
                  <div className="text-xs text-stone-500">Total</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{result.summary.success}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Berhasil</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">{result.summary.failed}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Gagal</div>
                </div>
              </div>
            )}
            {result.data?.errors?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Error:</p>
                {result.data.errors.map((err: any, i: number) => (
                  <p key={i} className="text-xs text-red-500 dark:text-red-400">
                    Item {err.index + 1}: {err.message}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variant Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pilih Varian Produk</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari produk atau varian..."
              className="pl-9 h-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {variants
              .filter(v => !adjustments.some(a => a.variantId === v.id))
              .map(v => (
                <button
                  key={v.id}
                  onClick={() => addVariant(v)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {v.product.name}
                    </div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">
                      {v.name} — {v.sku}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono text-stone-600 dark:text-stone-400">Stok: {v.stock}</div>
                    <div className="text-[10px] text-stone-400">
                      Beli: {v.buyPrice.toLocaleString('id-ID')} | Jual: {v.sellPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </button>
              ))}
            {variants.filter(v => !adjustments.some(a => a.variantId === v.id)).length === 0 && (
              <p className="text-sm text-stone-400 text-center py-6">Tidak ada varian ditemukan</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPicker(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
