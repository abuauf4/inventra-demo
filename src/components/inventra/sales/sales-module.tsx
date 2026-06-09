'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
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

import {
  Search, Plus, Eye, Trash2, RefreshCw,
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
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Sale | null>(null)
  const [form, setForm] = useState({ customerId: '', date: today(), notes: '', status: 'DRAFT', items: [{ variantId: '', qty: '1', sellPrice: '0' }] })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; status: string } | null>(null)
  // Search state for each item row
  const [variantSearches, setVariantSearches] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const [sRes, cRes, pRes] = await Promise.all([fetch(`/api/sales?${params}`), fetch('/api/customers'), fetch('/api/products')])
      setSales((await sRes.json()).data ?? []); setCustomers((await cRes.json()).data ?? []); setProducts((await pRes.json()).data ?? [])
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [search, filterStatus])
  useEffect(() => { load() }, [load])

  // Auto-focus customer input when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => customerInputRef.current?.focus(), 100)
    }
  }, [dialogOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = { customerId: form.customerId || undefined, date: form.date, notes: form.notes || undefined, status: form.status, items: form.items.filter(i => i.variantId).map(i => ({ variantId: i.variantId, qty: parseInt(i.qty) || 0, sellPrice: parseFloat(i.sellPrice) || 0 })) }
      if (!body.items.length) { toast.error('Tambahkan minimal 1 item'); return }
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Penjualan dicatat'); setDialogOpen(false); resetForm(); load()
    } catch { toast.error('Gagal') } finally { setSaving(false) }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusSaving(true)
    try { const res = await fetch(`/api/sales/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Status diperbarui'); setDetailOpen(false); load() } catch { toast.error('Gagal') } finally { setStatusSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message); return } toast.success('Dihapus'); setDeleteConfirm(null); load() } catch { toast.error('Gagal') }
  }

  const handleCancel = async () => {
    if (!cancelConfirm) return
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/sales/${cancelConfirm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || d.message || 'Gagal'); return }
      toast.success('Penjualan dibatalkan'); setCancelConfirm(null); setDetailOpen(false); load()
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
  const [customerSearch, setCustomerSearch] = useState('')

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return false
    const q = customerSearch.toLowerCase()
    return c.code?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  }).slice(0, 8)

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cari no. transaksi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <div className="flex gap-2"><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-32 sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PAID">Dibayar</SelectItem><SelectItem value="COMPLETED">Selesai</SelectItem><SelectItem value="CANCELLED">Dibatalkan</SelectItem></SelectContent></Select>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Tambah</span></Button></div>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Customer</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{!sales.length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow> : sales.map(s => (
            <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.transNo}</TableCell><TableCell>{s.customer?.name || 'Umum'}</TableCell><TableCell>{fmtDate(s.date)}</TableCell><TableCell><StatusBadge status={s.status} map="sale" /></TableCell><TableCell className="text-right font-medium">{fmtRp(s.total)}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openDetail(s.id)}><Eye className="w-4 h-4" /></Button>
                {s.status === 'DRAFT' && <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => handleStatusChange(s.id, 'PAID')} disabled={statusSaving}>Bayar</Button>}
                {s.status === 'PAID' && <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => handleStatusChange(s.id, 'COMPLETED')} disabled={statusSaving}>Selesai</Button>}
                {['DRAFT', 'PAID', 'COMPLETED'].includes(s.status) && <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => setCancelConfirm({ id: s.id, status: s.status })} disabled={statusSaving}>Batalkan</Button>}
                {s.status === 'DRAFT' && <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>}
              </div></TableCell></TableRow>
          ))}</TableBody></Table></CardContent></Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detail Penjualan</DialogTitle></DialogHeader>
        {detail && <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">No. Transaksi:</span> <span className="font-mono font-medium ml-2">{detail.transNo}</span></div><div><span className="text-muted-foreground">Customer:</span> <span className="ml-2">{detail.customer?.name || 'Umum'}</span></div><div><span className="text-muted-foreground">Tanggal:</span> <span className="ml-2">{fmtDate(detail.date)}</span></div><div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={detail.status} map="sale" /></span></div><div><span className="text-muted-foreground">Total:</span> <span className="font-bold ml-2">{fmtRp(detail.total)}</span></div></div><Separator />
          <Table><TableHeader><TableRow><TableHead>Produk/Varian</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
            <TableBody>{detail.items?.map((item: any) => <TableRow key={item.id}><TableCell>{item.variant?.name || item.product?.name || '-'}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">{fmtRp(item.sellPrice)}</TableCell><TableCell className="text-right">{fmtRp(item.qty * item.sellPrice)}</TableCell></TableRow>)}</TableBody></Table>
        </div>}
      </DialogContent></Dialog>

      {/* New Sale Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Tambah Penjualan</DialogTitle></DialogHeader>
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
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                    {filteredCustomers.map(c => (
                      <button key={c.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm"
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
                  {/* Row 1: SKU search + Product Name readonly */}
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
                          // Tab to auto-select if only 1 result
                          if (e.key === 'Tab' && !item.variantId && filteredVariants.length === 1) {
                            updateItem(idx, 'variantId', filteredVariants[0].id)
                            const newSearches = [...variantSearches]; newSearches[idx] = ''; setVariantSearches(newSearches)
                            e.preventDefault()
                          }
                          // Enter to save
                          if (e.key === 'Enter' && item.variantId) { handleSave(); e.preventDefault() }
                        }}
                        className="h-8 text-sm"
                      />
                      {(variantSearches[idx] || '') && !item.variantId && filteredVariants.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                          {filteredVariants.map(v => (
                            <button key={v.id} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-sm"
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
                  {/* Row 2: Variant/Size readonly + Price readonly + Qty editable + Delete */}
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
                      <Label className="text-xs mb-1 block">Qty</Label>
                      <Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="h-8 text-sm"
                        onKeyDown={e => { if (e.key === 'Enter' && item.variantId) { handleSave(); e.preventDefault() } }} />
                    </div>
                    <div className="flex items-end">
                      {form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500 h-7 w-7"><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-right text-lg font-bold">Total: {fmtRp(total)}</div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button ref={saveButtonRef} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
      </DialogContent></Dialog></div>
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Batalkan Penjualan?</AlertDialogTitle><AlertDialogDescription>{cancelConfirm?.status === 'COMPLETED' ? 'Stok yang sudah dikurangi akan dikembalikan.' : cancelConfirm?.status === 'PAID' ? 'Penjualan yang sudah dibayar akan dibatalkan.' : 'Penjualan draft akan dibatalkan.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Kembali</AlertDialogCancel><AlertDialogAction onClick={handleCancel} className="bg-red-600" disabled={statusSaving}>Ya, Batalkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}

export default SalesModule
