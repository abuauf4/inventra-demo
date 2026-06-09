'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

import {
  RefreshCw, ArrowDown, ArrowUp, Minus, Plus, ArrowLeftRight, Package,
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
  const [mutations, setMutations] = useState<StockMutation[]>([])
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('transfer')

  // Master data
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

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

  // Load data
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      const [mRes, prRes, whRes] = await Promise.all([
        fetch(`/api/stock-mutations?${params}`),
        fetch('/api/products'),
        fetch('/api/warehouses'),
      ])
      setMutations((await mRes.json()).data ?? [])
      setProducts((await prRes.json()).data ?? [])
      setWarehouses((await whRes.json()).data ?? [])
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [filterType])

  useEffect(() => { load() }, [load])

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

  // Auto-focus on dialog open
  useEffect(() => {
    if (dialogOpen) setTimeout(() => variantInputRef.current?.focus(), 100)
  }, [dialogOpen])

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

  // Open dialog
  const openDialog = () => {
    resetForm()
    setDialogOpen(true)
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
      setDialogOpen(false)
      resetForm()
      load()
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
    <div className="space-y-4">
      {/* Header with filter + add button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <Select value={filterType} onValueChange={setFilterType}>
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
        <Button
          onClick={openDialog}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />Tambah Mutasi
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
      )}

      {/* Create Mutation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Mutasi Stok</DialogTitle>
          </DialogHeader>

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

            {/* ===== TRANSFER Tab ===== */}
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
              {/* Warehouse stock info */}
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

            {/* ===== ADJUSTMENT Tab ===== */}
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
              {/* Warehouse stock info */}
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

            {/* ===== IN/OUT Tab ===== */}
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
              {/* Warehouse stock info */}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !selectedVariantId}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StockMutationsModule
