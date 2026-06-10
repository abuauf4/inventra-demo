'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProducts, useCategories, useSuppliers } from '@/components/inventra/hooks/use-query-hooks'
import type { Product, ProductVariant, Category, Supplier } from '@/components/inventra/shared/types'
import { fmtRp, fmtDate, purchaseStatusMap, saleStatusMap } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'

import {
  Card, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Search, Plus, Edit, Trash2, RefreshCw, ChevronRight, AlertTriangle, Package, X,
} from 'lucide-react'

// Common attribute keys for fashion/apparel
const ATTRIBUTE_PRESETS = ['Warna', 'Ukuran', 'Bahan', 'Motif', 'Berat', 'Panjang']

interface AttributePair {
  key: string
  value: string
}

// Convert JSON string → attribute pairs array
function jsonToPairs(json: string): AttributePair[] {
  try {
    const obj = JSON.parse(json)
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }))
    }
  } catch {}
  return []
}

// Convert attribute pairs → JSON string
function pairsToJson(pairs: AttributePair[]): string {
  const filtered = pairs.filter(p => p.key.trim() && p.value.trim())
  if (!filtered.length) return '{}'
  return JSON.stringify(Object.fromEntries(filtered.map(p => [p.key.trim(), p.value.trim()])))
}

function ProductsModule() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterLowStock, setFilterLowStock] = useState(false)

  // React Query — cached across navigation! Use mode=list for main list view
  const { data: products = [], isLoading: loading } = useProducts({ search, categoryId: filterCategory, lowStock: filterLowStock, mode: 'list' })
  const { data: categories = [] } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', categoryId: '', supplierId: '', description: '', buyPrice: '', sellPrice: '', minStock: '0', isActive: true })
  const [variantForm, setVariantForm] = useState({ name: '', sku: '', attributes: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0', isActive: true })
  const [attrPairs, setAttrPairs] = useState<AttributePair[]>([{ key: '', value: '' }])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [variantNameRef, setVariantNameRef] = useState<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.categoryId) { toast.error('Nama, SKU, dan Kategori wajib'); return }
    setSaving(true)
    try {
      const body = { name: form.name, sku: form.sku, categoryId: form.categoryId, supplierId: form.supplierId || undefined, description: form.description || undefined, buyPrice: parseFloat(form.buyPrice) || 0, sellPrice: parseFloat(form.sellPrice) || 0, minStock: parseInt(form.minStock) || 0, isActive: form.isActive }
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success(editing ? 'Diperbarui' : 'Ditambahkan'); setDialogOpen(false); setEditing(null); setForm({ name: '', sku: '', categoryId: '', supplierId: '', description: '', buyPrice: '', sellPrice: '', minStock: '0', isActive: true }); invalidateProducts()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }
  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/products/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); invalidateProducts() } catch { toast.error('Gagal') }
  }

  const handleAddVariant = async () => {
    if (!selectedProduct || !variantForm.name || !variantForm.sku) { toast.error('Nama dan SKU varian wajib'); return }
    setSaving(true)
    try {
      const body = { productId: selectedProduct.id, name: variantForm.name, sku: variantForm.sku, attributes: pairsToJson(attrPairs), buyPrice: parseFloat(variantForm.buyPrice) || selectedProduct.buyPrice, sellPrice: parseFloat(variantForm.sellPrice) || selectedProduct.sellPrice, stock: parseInt(variantForm.stock) || 0, minStock: parseInt(variantForm.minStock) || 0 }
      const res = await fetch('/api/product-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Varian ditambahkan'); setVariantDialogOpen(false); setEditingVariant(null); setVariantForm({ name: '', sku: '', attributes: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0', isActive: true }); setAttrPairs([{ key: '', value: '' }]); invalidateProducts()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setVariantForm({
      name: variant.name,
      sku: variant.sku,
      attributes: variant.attributes,
      buyPrice: String(variant.buyPrice),
      sellPrice: String(variant.sellPrice),
      stock: String(variant.stock),
      minStock: String(variant.minStock),
      isActive: variant.isActive,
    })
    setAttrPairs(jsonToPairs(variant.attributes).length > 0 ? jsonToPairs(variant.attributes) : [{ key: '', value: '' }])
    setVariantDialogOpen(true)
  }

  const handleSaveVariant = async () => {
    if (!editingVariant || !variantForm.name || !variantForm.sku) { toast.error('Nama dan SKU varian wajib'); return }
    setSaving(true)
    try {
      const body = { name: variantForm.name, sku: variantForm.sku, attributes: pairsToJson(attrPairs), buyPrice: parseFloat(variantForm.buyPrice) || 0, sellPrice: parseFloat(variantForm.sellPrice) || 0, minStock: parseInt(variantForm.minStock) || 0, isActive: variantForm.isActive }
      const res = await fetch(`/api/product-variants/${editingVariant.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Varian diperbarui'); setVariantDialogOpen(false); setEditingVariant(null); setVariantForm({ name: '', sku: '', attributes: '', buyPrice: '', sellPrice: '', stock: '0', minStock: '0', isActive: true }); setAttrPairs([{ key: '', value: '' }]); invalidateProducts()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }

  const handleDeleteVariant = async (id: string) => {
    try { const res = await fetch(`/api/product-variants/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Varian dihapus'); invalidateProducts() } catch { toast.error('Gagal') }
  }

  const toggleExpand = (id: string) => {
    setExpandedProducts(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const getTotalStock = (p: Product) => p.variants?.reduce((s, v) => s + v.stock, 0) || 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-44"><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Button variant={filterLowStock ? 'default' : 'outline'} onClick={() => setFilterLowStock(!filterLowStock)} className={filterLowStock ? 'bg-amber-500 hover:bg-amber-600' : ''}><AlertTriangle className="w-4 h-4 mr-2" />Stok Menipis</Button>
        <Button onClick={() => { setEditing(null); setForm({ name: '', sku: '', categoryId: '', supplierId: '', description: '', buyPrice: '', sellPrice: '', minStock: '0', isActive: true }); setDialogOpen(true) }} className="bg-primary text-primary-foreground text-white"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-5">
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <div className="space-y-4">
          {products.length === 0 ? <Card className="border-0"><CardContent className="text-center py-8 text-muted-foreground">Belum ada produk</CardContent></Card> : products.map(p => (
            <Card key={p.id} className="border-0">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center text-rose-600 shrink-0"><Package className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2"><h3 className="font-semibold text-sm sm:text-base">{p.name}</h3><Badge variant="outline" className="font-mono text-xs">{p.sku}</Badge><Badge className="bg-rose-100 text-rose-700 text-[10px] sm:text-xs">{p.category?.name}</Badge><Badge variant={p.isActive ? 'default' : 'secondary'} className={p.isActive ? 'bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs' : 'text-[10px] sm:text-xs'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge></div>
                    <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-0.5 mt-1 text-xs sm:text-sm text-muted-foreground">
                      <span>Beli: {fmtRp(p.buyPrice)}</span><span>Jual: {fmtRp(p.sellPrice)}</span>
                      <span className={getTotalStock(p) <= p.minStock ? 'text-amber-600 font-medium' : ''}>Stok: {getTotalStock(p)}</span>
                      <span>{p.variants?.length || 0} varian</span>
                      {p.supplier && <span className="text-purple-600">Supplier: {p.supplier.code} — {p.supplier.name}</span>}
                    </div>
                    {/* Mobile action row */}
                    <div className="flex gap-1 mt-2 sm:hidden">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setSelectedProduct(p); setEditingVariant(null); setVariantForm({ name: '', sku: '', attributes: '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: '0', minStock: '0', isActive: true }); setAttrPairs([{ key: '', value: '' }]); setVariantDialogOpen(true) }}><Plus className="w-3 h-3 mr-1" />Varian</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(p.id)}><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedProducts.has(p.id) ? 'rotate-90' : ''}`} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p); setForm({ name: p.name, sku: p.sku, categoryId: p.categoryId, supplierId: p.supplierId || '', description: p.description || '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), minStock: String(p.minStock), isActive: p.isActive }); setDialogOpen(true) }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteConfirm(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {/* Desktop action row */}
                  <div className="hidden sm:flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(p); setEditingVariant(null); setVariantForm({ name: '', sku: '', attributes: '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: '0', minStock: '0', isActive: true }); setAttrPairs([{ key: '', value: '' }]); setVariantDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" />Varian</Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleExpand(p.id)}><ChevronRight className={`w-4 h-4 transition-transform ${expandedProducts.has(p.id) ? 'rotate-90' : ''}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setForm({ name: p.name, sku: p.sku, categoryId: p.categoryId, supplierId: p.supplierId || '', description: p.description || '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), minStock: String(p.minStock), isActive: p.isActive }); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                {expandedProducts.has(p.id) && (p.variants ?? []).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>Varian</TableHead><TableHead>SKU</TableHead><TableHead>Atribut</TableHead><TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-center">Stok</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                      <TableBody>{(p.variants ?? []).map(v => {
                        const attrs = (() => { try { return JSON.parse(v.attributes) } catch { return {} } })()
                        return <TableRow key={v.id}><TableCell className="font-medium">{v.name}</TableCell><TableCell className="font-mono text-xs">{v.sku}</TableCell><TableCell><div className="flex gap-1 flex-wrap">{Object.entries(attrs ?? {}).map(([k, val]) => <Badge key={k} variant="outline" className="text-xs">{k}: {String(val)}</Badge>)}</div></TableCell>
                          <TableCell className="text-right">{fmtRp(v.buyPrice)}</TableCell><TableCell className="text-right">{fmtRp(v.sellPrice)}</TableCell>
                          <TableCell className="text-center"><Badge variant={v.stock <= v.minStock ? (v.stock <= 0 ? 'destructive' : 'secondary') : 'default'} className={v.stock > v.minStock ? 'bg-emerald-100 text-emerald-700' : v.stock <= 0 ? '' : 'bg-amber-100 text-amber-700'}>{v.stock}</Badge></TableCell>
                          <TableCell><Badge variant={v.isActive ? 'default' : 'secondary'} className={v.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>{v.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                          <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => handleEditVariant(v)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteVariant(v.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell>
                        </TableRow>
                      })}</TableBody></Table></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Produk</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto: CL000001 jika kosong" /></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Kategori *</Label><Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Supplier</Label><Select value={form.supplierId || 'none'} onValueChange={v => setForm({ ...form, supplierId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa Supplier</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Harga Beli</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div><div className="space-y-2"><Label>Harga Jual</Label><Input type="number" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} /></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Min. Stok</Label><Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button className="bg-primary text-primary-foreground text-white" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={variantDialogOpen} onOpenChange={(open) => { setVariantDialogOpen(open); if (!open) setEditingVariant(null) }}><DialogContent><DialogHeader><DialogTitle>{editingVariant ? 'Edit' : 'Tambah'} Varian — {selectedProduct?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (editingVariant) { handleSaveVariant() } else { handleAddVariant() } } }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Nama Varian *</Label><Input ref={setVariantNameRef} placeholder='cth: Black M' value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} autoFocus /></div><div className="space-y-2"><Label>SKU Varian *</Label><Input placeholder='cth: OVT-BLK-M' value={variantForm.sku} onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} /></div></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Atribut</Label><Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAttrPairs([...attrPairs, { key: '', value: '' }])}><Plus className="w-3 h-3 mr-1" />Tambah Atribut</Button></div>
            {attrPairs.map((pair, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select value={pair.key} onValueChange={v => { const updated = [...attrPairs]; updated[idx] = { ...updated[idx], key: v }; setAttrPairs(updated) }}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Nama" /></SelectTrigger>
                  <SelectContent>
                    {ATTRIBUTE_PRESETS.map(preset => <SelectItem key={preset} value={preset}>{preset}</SelectItem>)}
                    {pair.key && !ATTRIBUTE_PRESETS.includes(pair.key) && <SelectItem value={pair.key}>{pair.key}</SelectItem>}
                  </SelectContent>
                </Select>
                <Input placeholder="Nilai" value={pair.value} onChange={e => { const updated = [...attrPairs]; updated[idx] = { ...updated[idx], value: e.target.value }; setAttrPairs(updated) }} className="flex-1" />
                {attrPairs.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-400" onClick={() => setAttrPairs(attrPairs.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Pilih nama atribut atau ketik custom. Cth: Warna → Hitam, Ukuran → M</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Harga Beli</Label><Input type="number" value={variantForm.buyPrice} onChange={e => setVariantForm({ ...variantForm, buyPrice: e.target.value })} /></div><div className="space-y-2"><Label>Harga Jual</Label><Input type="number" value={variantForm.sellPrice} onChange={e => setVariantForm({ ...variantForm, sellPrice: e.target.value })} /></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Stok</Label><Input type="number" value={variantForm.stock} onChange={e => setVariantForm({ ...variantForm, stock: e.target.value })} disabled={!!editingVariant} />{editingVariant && <p className="text-xs text-muted-foreground">Stok diubah melalui transaksi</p>}</div><div className="space-y-2"><Label>Min. Stok</Label><Input type="number" value={variantForm.minStock} onChange={e => setVariantForm({ ...variantForm, minStock: e.target.value })} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => { setVariantDialogOpen(false); setEditingVariant(null) }} disabled={saving}>Batal</Button><Button className="bg-primary text-primary-foreground text-white" onClick={editingVariant ? handleSaveVariant : handleAddVariant} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Varian'}</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

export default ProductsModule
