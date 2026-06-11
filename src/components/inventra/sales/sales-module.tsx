'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useSales, useCustomers, useProducts } from '@/components/inventra/hooks/use-query-hooks'
import { Sale, SaleItem, Product, ProductVariant, Customer } from '@/components/inventra/shared/types'
import { fmtDate, fmtRp } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'

import {
  Card, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  Search, Plus, Eye, Trash2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

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

function SalesModule() {
  const { openSalesForm, setOpenSalesForm, activeModuleTab, setActiveModuleTab } = useAppStore()
  const queryClient = useQueryClient()

  // Tab state — consume deep-link tab from store (one-time)
  const [activeTab, setActiveTab] = useState<'input' | 'drafts' | 'history'>(() => {
    if (activeModuleTab === 'drafts' || activeModuleTab === 'history') {
      setActiveModuleTab(null) // consume once
      return activeModuleTab
    }
    return 'input'
  })

  // Filter state (for history tab)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_LIMIT = 50

  // Only fetch sales when on Drafts or History tab
  const shouldFetchSales = activeTab === 'drafts' || activeTab === 'history'

  // For Drafts tab: status=DRAFT only
  // For History tab: use search, filterStatus, page
  const salesParams = activeTab === 'drafts'
    ? { status: 'DRAFT', limit: 20, mode: 'list' as const, enabled: shouldFetchSales }
    : { search, status: filterStatus, page, limit: PAGE_LIMIT, mode: 'list' as const, enabled: shouldFetchSales }

  const { data: salesData, isLoading: salesLoading, isFetching: salesFetching } = useSales(salesParams)

  // Always fetch draft count for badge (lightweight, cached by React Query)
  const { data: draftCountData } = useSales({ status: 'DRAFT', limit: 1, mode: 'list' as const, enabled: true })
  const draftCount = draftCountData?.pagination?.total ?? (activeTab === 'drafts' ? (pagination?.total ?? 0) : 0)

  const { data: customersResult } = useCustomers({ limit: 200 })
  const customers = customersResult?.data ?? []
  const { data: productsResult } = useProducts({ limit: 200 })
  const products = productsResult?.data ?? []

  const sales = salesData?.data ?? []
  const pagination = salesData?.pagination

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Sale | null>(null)

  // Form state (used by Input tab)
  const [form, setForm] = useState({ customerId: '', date: today(), notes: '', status: 'DRAFT', items: [{ variantId: '', qty: '1', sellPrice: '0' }] })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; status: string } | null>(null)
  const [variantSearches, setVariantSearches] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const [customerSearch, setCustomerSearch] = useState('')

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, filterStatus])

  // Auto-switch to Input tab when openSalesForm is true
  useEffect(() => {
    if (openSalesForm) {
      resetForm()
      setActiveTab('input')
      setOpenSalesForm(false)
      setTimeout(() => customerInputRef.current?.focus(), 100)
    }
  }, [openSalesForm])

  const invalidateSales = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] })
  }

  const handleSave = async () => {
    const mappedItems = form.items.filter(i => i.variantId).map(i => {
      const v = allVariants.find(v => v.id === i.variantId)
      return { variantId: i.variantId, qty: parseInt(i.qty) || 0, sellPrice: parseFloat(i.sellPrice) || 0, stock: v?.productStock ?? 0, name: v ? `${v.productName} — ${v.name}` : '' }
    })
    if (!mappedItems.length) { toast.error('Tambahkan minimal 1 item'); return }

    if (form.status === 'COMPLETED') {
      for (const item of mappedItems) {
        if (item.qty > item.stock) {
          toast.error(`Stok tidak cukup: ${item.name}. Tersedia: ${item.stock}, Diminta: ${item.qty}`)
          return
        }
      }
    }
    if (form.status === 'PAID') {
      for (const item of mappedItems) {
        if (item.qty > item.stock) {
          toast.error(`Stok tidak cukup: ${item.name}. Tersedia: ${item.stock}, Diminta: ${item.qty}. Stok akan dicek saat penjualan diselesaikan.`)
          return
        }
      }
    }

    setSaving(true)
    try {
      const body = { customerId: form.customerId || undefined, date: form.date, notes: form.notes || undefined, status: form.status, items: mappedItems.map(({ stock, name, ...rest }) => rest) }
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Penjualan dicatat'); resetForm(); invalidateSales()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusSaving(true)
    try { const res = await fetch(`/api/sales/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Status diperbarui'); setDetailOpen(false); invalidateSales() } catch { toast.error('Gagal') } finally { setStatusSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); invalidateSales() } catch { toast.error('Gagal') }
  }

  const handleCancel = async () => {
    if (!cancelConfirm) return
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/sales/${cancelConfirm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Penjualan dibatalkan'); setCancelConfirm(null); setDetailOpen(false); invalidateSales()
    } catch { toast.error('Gagal') } finally { setStatusSaving(false) }
  }

  const resetForm = () => {
    setForm({ customerId: '', date: today(), notes: '', status: 'DRAFT', items: [{ variantId: '', qty: '1', sellPrice: '0' }] })
    setVariantSearches([''])
    setCustomerSearch('')
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { variantId: '', qty: '1', sellPrice: '0' }] })
    setVariantSearches([...variantSearches, ''])
  }
  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
    setVariantSearches(variantSearches.filter((_, i) => i !== idx))
  }
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }
    if (field === 'variantId') {
      const v = allVariants.find(v => v.id === value)
      if (v) items[idx].sellPrice = String(v.sellPrice)
    }
    setForm({ ...form, items })
  }

  const openDetail = async (id: string) => { try { const res = await fetch(`/api/sales/${id}`); setDetail((await res.json()).data); setDetailOpen(true) } catch {} }
  const total = form.items.reduce((s, i) => s + (parseInt(i.qty) || 0) * (parseFloat(i.sellPrice) || 0), 0)
  const allVariants = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.name, productSku: p.sku, productStock: v.stock })))

  const getFilteredVariants = (searchQuery: string) => {
    if (!searchQuery) return allVariants.slice(0, 8)
    const q = searchQuery.toLowerCase()
    return allVariants.filter(v => {
      if (v.sku.toLowerCase().includes(q)) return true
      if (v.productName.toLowerCase().includes(q)) return true
      if (v.name.toLowerCase().includes(q)) return true
      try { const attrs = JSON.parse(v.attributes); return Object.values(attrs ?? {}).some(val => String(val).toLowerCase().includes(q)) } catch { return false }
    }).slice(0, 10)
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return false
    const q = customerSearch.toLowerCase()
    return c.code?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  }).slice(0, 8)

  return (
    <>
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'input' | 'drafts' | 'history')} className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-full sm:w-auto">
          <TabsTrigger value="input" className="flex-1 sm:flex-none">Input</TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 sm:flex-none gap-1">
            Draft{draftCount > 0 ? <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold">{draftCount}</Badge> : ''}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">Riwayat</TabsTrigger>
        </TabsList>

        {/* ==================== INPUT TAB ==================== */}
        <TabsContent value="input" className="flex flex-col flex-1 min-h-0 mt-3 overflow-y-auto">
          <div className="space-y-3">
            {/* Row 1: Customer code/search + Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Customer / Cari</Label>
                <div className="relative">
                  <Input
                    ref={customerInputRef}
                    placeholder="Ketik kode / nama customer..."
                    value={form.customerId ? (selectedCustomer?.code || '') : customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); if (form.customerId) setForm({ ...form, customerId: '' }) }}
                    onFocus={() => {
                      if (form.customerId && selectedCustomer) {
                        setForm({ ...form, customerId: '' })
                        setCustomerSearch(selectedCustomer.code)
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Tab' && !form.customerId && filteredCustomers.length === 1) {
                        setForm({ ...form, customerId: filteredCustomers[0].id }); setCustomerSearch(''); e.preventDefault()
                      }
                    }}
                  />
                  {customerSearch && !form.customerId && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-auto">
                      {filteredCustomers.map(c => (
                        <button key={c.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-sm"
                          onMouseDown={() => { setForm({ ...form, customerId: c.id }); setCustomerSearch('') }}>
                          <Badge variant="outline" className="font-mono text-[10px]">{c.code}</Badge>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Tanggal</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            {/* Row 2: Customer Name readonly + Phone/Address readonly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nama Customer</Label>
                <Input readOnly className="bg-muted text-muted-foreground h-9" value={selectedCustomer?.name || ''} placeholder="—" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Telepon / Alamat</Label>
                <Input readOnly className="bg-muted text-muted-foreground h-9" value={selectedCustomer ? [selectedCustomer.phone, selectedCustomer.address].filter(Boolean).join(' — ') || '' : ''} placeholder="—" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-xs">Item</Label><Button variant="outline" size="sm" onClick={addItem} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" />Tambah</Button></div>
              {form.items.map((item, idx) => {
                const selectedVariant = allVariants.find(v => v.id === item.variantId)
                const filteredVariants = getFilteredVariants(variantSearches[idx] || '')
                return (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <Label className="text-xs mb-1 block">SKU / Cari Varian</Label>
                        <Input
                          placeholder="Ketik SKU / nama varian..."
                          value={item.variantId ? (selectedVariant?.sku || '') : (variantSearches[idx] || '')}
                          onChange={e => {
                            const newSearches = [...variantSearches]; newSearches[idx] = e.target.value; setVariantSearches(newSearches)
                            if (item.variantId) { const newItems = [...form.items]; newItems[idx] = { ...newItems[idx], variantId: '', sellPrice: '0' }; setForm({ ...form, items: newItems }) }
                          }}
                          onFocus={() => {
                            if (item.variantId && selectedVariant) {
                              const newItems = [...form.items]
                              newItems[idx] = { ...newItems[idx], variantId: '', sellPrice: '0' }
                              setForm({ ...form, items: newItems })
                              const newSearches = [...variantSearches]
                              newSearches[idx] = selectedVariant.sku
                              setVariantSearches(newSearches)
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Tab' && !item.variantId && filteredVariants.length === 1) {
                              updateItem(idx, 'variantId', filteredVariants[0].id)
                              const newSearches = [...variantSearches]; newSearches[idx] = ''; setVariantSearches(newSearches)
                              e.preventDefault()
                            }
                            if (e.key === 'Enter' && item.variantId) { handleSave(); e.preventDefault() }
                          }}
                          className="h-8 text-sm"
                        />
                        {(variantSearches[idx] || '') && !item.variantId && filteredVariants.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
                            {filteredVariants.map(v => (
                              <button key={v.id} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-sm"
                                onMouseDown={() => {
                                  updateItem(idx, 'variantId', v.id)
                                  const newSearches = [...variantSearches]; newSearches[idx] = ''; setVariantSearches(newSearches)
                                }}>
                                <Badge variant="outline" className="font-mono text-[10px]">{v.sku}</Badge>
                                <span className="truncate">{v.productName} — {v.name}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">Stok: {v.productStock}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block text-muted-foreground">Nama Produk</Label>
                        <Input readOnly className="bg-muted text-muted-foreground h-8 text-sm" value={selectedVariant?.productName || ''} placeholder="—" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs mb-1 block text-muted-foreground">Varian / Ukuran</Label>
                        <Input readOnly className="bg-muted text-muted-foreground h-8 text-sm" value={selectedVariant ? `${selectedVariant.name}${parseVariantAttrs(selectedVariant.attributes) ? ' — ' + parseVariantAttrs(selectedVariant.attributes) : ''}` : ''} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block text-muted-foreground">Harga Jual</Label>
                        <Input readOnly className="bg-muted text-muted-foreground h-8 text-sm" value={selectedVariant ? fmtRp(selectedVariant.sellPrice) : ''} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Qty {selectedVariant && <span className="text-muted-foreground font-normal">(Stok: {selectedVariant.productStock})</span>}</Label>
                        <Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="h-8 text-sm"
                          onKeyDown={e => { if (e.key === 'Enter' && item.variantId) { handleSave(); e.preventDefault() } }} />
                        {selectedVariant && parseInt(item.qty) > selectedVariant.productStock && (
                          <p className="text-[10px] text-red-500 mt-0.5">Melebihi stok ({selectedVariant.productStock})</p>
                        )}
                      </div>
                      <div className="flex items-end">
                        {form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500 h-7 w-7"><Trash2 className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-right text-lg font-bold">Total: {fmtRp(total)}</div>
              <div className="flex gap-2">
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PAID">Dibayar</SelectItem>
                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-primary text-primary-foreground text-white" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==================== DRAFTS TAB ==================== */}
        <TabsContent value="drafts" className="flex flex-col flex-1 min-h-0 mt-3">
          <div className="flex-1 min-h-0 overflow-y-auto">
          {salesLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
            <Card className="border-0"><CardContent className="p-2 sm:p-3"><div className="overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Customer</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>{!sales.length ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada draft</TableCell></TableRow> : sales.map(s => (
                <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{s.customer?.name || 'Umum'}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell className="text-right font-medium">{fmtRp(s.total)}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => handleStatusChange(s.id, 'PAID')} disabled={statusSaving}>Bayar</Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}</TableBody></Table></div></CardContent></Card>
          )}
          </div>
        </TabsContent>

        {/* ==================== HISTORY TAB ==================== */}
        <TabsContent value="history" className="flex flex-col flex-1 min-h-0 mt-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari no. transaksi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
            <div className="flex gap-2"><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-32 sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PAID">Dibayar</SelectItem><SelectItem value="COMPLETED">Selesai</SelectItem><SelectItem value="CANCELLED">Dibatalkan</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          {salesLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
            <Card className="border-0"><CardContent className="p-2 sm:p-3"><div className="overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Customer</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>{!sales.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : sales.map(s => (
                <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{s.customer?.name || 'Umum'}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell><StatusBadge status={s.status} map="sale" /></TableCell><TableCell className="text-right font-medium">{fmtRp(s.total)}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button>
                    {s.status === 'DRAFT' && <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => handleStatusChange(s.id, 'PAID')} disabled={statusSaving}>Bayar</Button>}
                    {s.status === 'PAID' && <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => handleStatusChange(s.id, 'COMPLETED')} disabled={statusSaving}>Selesai</Button>}
                    {['DRAFT', 'PAID', 'COMPLETED'].includes(s.status) && <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => setCancelConfirm({ id: s.id, status: s.status })} disabled={statusSaving}>Batalkan</Button>}
                    {s.status === 'DRAFT' && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>}
                  </div></TableCell></TableRow>
              ))}</TableBody></Table></div></CardContent></Card>
          )}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-3 px-1 border-t shrink-0">
              <span className="text-sm text-muted-foreground">
                {salesFetching && <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />}
                {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="flex items-center px-2 text-sm">Hal {pagination.page} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Penjualan</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div><div><span className="text-muted-foreground">Customer:</span> <span className="ml-2">{detail.customer?.name || 'Umum'}</span></div><div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div><div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={detail.status} map="sale" /></span></div><div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div></div><Separator />
          <div className="overflow-x-auto -mx-3 sm:mx-0"><Table><TableHeader><TableRow><TableHead>Produk/Varian</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
            <TableBody>{detail.items?.map((item: any) => <TableRow key={item.id}><TableCell>{item.variant?.name || item.product?.name || '-'}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">{fmtRp(item.sellPrice)}</TableCell><TableCell className="text-right">{fmtRp(item.qty * item.sellPrice)}</TableCell></TableRow>)}</TableBody></Table></div>
        </div>}
      </DialogContent></Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Batalkan Penjualan?</AlertDialogTitle><AlertDialogDescription>{cancelConfirm?.status === 'COMPLETED' ? 'Stok yang sudah dikurangi akan dikembalikan.' : cancelConfirm?.status === 'PAID' ? 'Penjualan yang sudah dibayar akan dibatalkan.' : 'Penjualan draft akan dibatalkan.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Kembali</AlertDialogCancel><AlertDialogAction onClick={handleCancel} className="bg-red-600" disabled={statusSaving}>Ya, Batalkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
    </>
  )
}

export default SalesModule
