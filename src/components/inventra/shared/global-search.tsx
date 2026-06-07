'use client'

import { useState, useEffect } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'

import {
  Search, RefreshCw, Package, ShoppingCart, ShoppingBag,
  Truck, Users, Warehouse as WarehouseIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

// ===================== SEARCH RESULT TYPE =====================
export interface SearchResult {
  type: string
  id: string
  code: string
  label: string
  sublabel: string
  status?: string
  page: AppPage
}

// ===================== SEARCH STATUS BADGES =====================
export const searchStatusBadge: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-600' },
  RECEIVED: { label: 'Received', color: 'bg-emerald-100 text-emerald-600' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-600' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
  low_stock: { label: 'Low Stock', color: 'bg-amber-100 text-amber-600' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-600' },
  inactive: { label: 'Inactive', color: 'bg-slate-100 text-slate-500' },
}

function GlobalSearch() {
  const { searchOpen, setSearchOpen, setActivePage } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.data || [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const typeIcons: Record<string, React.ReactNode> = {
    Customer: <Users className="w-4 h-4 text-blue-500" />,
    Supplier: <Truck className="w-4 h-4 text-purple-500" />,
    Product: <Package className="w-4 h-4 text-rose-500" />,
    Variant: <Package className="w-4 h-4 text-amber-500" />,
    Purchase: <ShoppingCart className="w-4 h-4 text-blue-500" />,
    Sale: <ShoppingBag className="w-4 h-4 text-emerald-500" />,
    Warehouse: <WarehouseIcon className="w-4 h-4 text-stone-500" />,
  }

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-xl border-0 shadow-2xl rounded-2xl">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-4">
            <Search className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
            <CommandInput placeholder="Cari apapun... (kode, nama, transaksi)" value={query} onValueChange={setQuery} className="border-0 focus:ring-0" />
            <kbd className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-400 border border-stone-200 shrink-0">ESC</kbd>
          </div>
          <CommandList>
            {loading && <div className="py-8 text-center text-sm text-stone-400"><RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />Mencari...</div>}
            {!loading && query && results.length === 0 && <CommandEmpty>Tidak ditemukan</CommandEmpty>}
            {!loading && Object.entries(grouped).map(([type, items]) => (
              <CommandGroup key={type} heading={<span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{type}</span>}>
                {items.map(item => (
                  <CommandItem key={`${item.type}-${item.id}`} onSelect={() => { setActivePage(item.page); setSearchOpen(false); setQuery('') }}
                    className="flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-lg mx-1 hover:bg-stone-50">
                    {typeIcons[item.type] || <Search className="w-4 h-4" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{item.code}</span>
                        <span className="text-sm font-medium text-stone-800 truncate">{item.label}</span>
                      </div>
                      {item.sublabel && <p className="text-xs text-stone-400 truncate mt-0.5">{item.sublabel}</p>}
                    </div>
                    {item.status && searchStatusBadge[item.status] && <Badge className={`${searchStatusBadge[item.status].color} text-[10px]`}>{searchStatusBadge[item.status].label}</Badge>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {!query && (
              <div className="py-8 text-center text-sm text-stone-400">
                <Search className="w-8 h-8 mx-auto mb-3 text-stone-200" />
                <p className="font-medium text-stone-500">Cari apapun secara instan</p>
                <p className="text-xs mt-1 text-stone-300">Cari kode (CUS000001), nama, atau transaksi (PO-, SO-)</p>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-stone-300">
                  <span className="flex items-center gap-1"><kbd className="bg-stone-100 px-1.5 py-0.5 rounded font-mono border border-stone-200">Ctrl+K</kbd> Buka</span>
                  <span className="flex items-center gap-1"><kbd className="bg-stone-100 px-1.5 py-0.5 rounded font-mono border border-stone-200">ESC</kbd> Tutup</span>
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export default GlobalSearch
