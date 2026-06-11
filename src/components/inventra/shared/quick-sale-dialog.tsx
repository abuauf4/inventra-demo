'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { fmtRp } from './constants'
import type { Customer, Product, ProductVariant } from './types'

import { ShoppingBag } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Extended variant type with product info for quick sale
interface QuickSaleVariant extends ProductVariant {
  productName: string
  productSku: string
}

function QuickSaleDialog() {
  const { quickActionOpen, setQuickActionOpen } = useAppStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [variantId, setVariantId] = useState('')
  const [variantSearch, setVariantSearch] = useState('')
  const [qty, setQty] = useState('1')
  const [saving, setSaving] = useState(false)
  const customerRef = useState<HTMLInputElement | null>(null)[1]
  const variantRef = useState<HTMLInputElement | null>(null)[1]

  useEffect(() => {
    if (quickActionOpen) {
      Promise.all([fetch('/api/customers?limit=200').then(r => r.json()), fetch('/api/products?limit=200').then(r => r.json())])
        .then(([c, p]) => { setCustomers(c.data ?? []); setProducts(p.data ?? []) })
      setCustomerId(''); setVariantId(''); setQty('1'); setCustomerSearch(''); setVariantSearch('')
    }
  }, [quickActionOpen])

  const allVariants: QuickSaleVariant[] = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.name, productSku: p.sku })))

  const selectedVariant = allVariants.find(v => v.id === variantId)
  const selectedCustomer = customers.find(c => c.id === customerId)
  const total = selectedVariant ? parseInt(qty) * selectedVariant.sellPrice : 0

  const handleSave = async () => {
    if (!variantId) { toast.error('Pilih produk/varian'); return }
    const qtyNum = parseInt(qty) || 1
    // Client-side stock check
    if (selectedVariant && qtyNum > selectedVariant.stock) {
      toast.error(`Stok tidak cukup. Tersedia: ${selectedVariant.stock}, Diminta: ${qtyNum}`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          date: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
          items: [{ variantId, qty: qtyNum, sellPrice: selectedVariant?.sellPrice || 0 }]
        })
      })
      const data = await res.json()
      if (data.success) { toast.success(`Penjualan ${data.data.transNo} dicatat`); setQuickActionOpen(false) }
      else { toast.error(data.message || 'Gagal') }
    } catch { toast.error('Gagal') }
    finally { setSaving(false) }
  }

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.code?.toLowerCase().includes(customerSearch.toLowerCase()) || c.name.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 8)

  const filteredVariants = allVariants.filter(v => {
    if (!variantSearch) return true
    const q = variantSearch.toLowerCase()
    if (v.sku.toLowerCase().includes(q)) return true
    if (v.productName.toLowerCase().includes(q)) return true
    if (v.name.toLowerCase().includes(q)) return true
    try { const attrs = JSON.parse(v.attributes); return Object.values(attrs ?? {}).some(val => String(val).toLowerCase().includes(q)) } catch { return false }
  }).slice(0, 10)

  return (
    <Dialog open={quickActionOpen} onOpenChange={setQuickActionOpen}>
      <DialogContent className="max-w-md border-0 shadow-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-emerald-500" />Jual Cepat <Badge variant="outline" className="text-xs font-mono">Alt+S</Badge></DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <div className="relative">
              <Input placeholder="Ketik kode atau nama... (Tab → lanjut)" value={selectedCustomer ? `${selectedCustomer.code} ${selectedCustomer.name}` : customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); if (customerId) setCustomerId('') }}
                onKeyDown={e => { if (e.key === 'Tab' && !customerId && filteredCustomers.length === 1) { setCustomerId(filteredCustomers[0].id); e.preventDefault() } }}
                className="h-9 text-sm" ref={customerRef as any} />
              {customerSearch && !customerId && filteredCustomers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-auto">
                  {filteredCustomers.map(c => (
                    <button key={c.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-sm"
                      onMouseDown={() => { setCustomerId(c.id); setCustomerSearch('') }}>
                      <Badge variant="outline" className="font-mono text-[10px]">{c.code}</Badge>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Produk/Varian *</Label>
            <div className="relative">
              <Input placeholder="Ketik SKU atau nama... (CL000001, BLK XL)" value={selectedVariant ? `${selectedVariant.sku} ${selectedVariant.productName} — ${selectedVariant.name}` : variantSearch}
                onChange={e => { setVariantSearch(e.target.value); if (variantId) setVariantId('') }}
                onKeyDown={e => { if (e.key === 'Tab' && !variantId && filteredVariants.length === 1) { setVariantId(filteredVariants[0].id); e.preventDefault() } }}
                className="h-9 text-sm" ref={variantRef as any} />
              {variantSearch && !variantId && filteredVariants.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredVariants.map(v => (
                    <button key={v.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-sm"
                      onMouseDown={() => { setVariantId(v.id); setVariantSearch('') }}>
                      <Badge variant="outline" className="font-mono text-[10px]">{v.sku}</Badge>
                      <span className="truncate">{v.productName} — {v.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">Stok: {v.stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Qty {selectedVariant && <span className="text-muted-foreground font-normal">(Stok: {selectedVariant.stock})</span>}</Label><Input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" className="h-9" onKeyDown={e => e.key === 'Enter' && handleSave()} />{selectedVariant && parseInt(qty) > selectedVariant.stock && (<p className="text-[10px] text-red-500 mt-0.5">Melebihi stok ({selectedVariant.stock})</p>)}</div>
            <div className="space-y-1"><Label className="text-xs">Harga</Label><div className="h-9 flex items-center text-sm font-medium">{selectedVariant ? fmtRp(selectedVariant.sellPrice) : '-'}</div></div>
          </div>
          <div className="text-right text-lg font-bold border-t pt-3">Total: {fmtRp(total)}</div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setQuickActionOpen(false)}>Batal</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving || !variantId}>{saving ? 'Menyimpan...' : 'Simpan Draft'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QuickSaleDialog
