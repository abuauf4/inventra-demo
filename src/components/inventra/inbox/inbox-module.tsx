'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { fmtDateTime } from '@/components/inventra/shared/constants'

import { Button } from '@/components/ui/button'

import {
  AlertTriangle, ShoppingCart, ShoppingBag, Users, Bell,
  Inbox as InboxIcon, Check, RefreshCw,
} from 'lucide-react'

function InboxModule() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/inbox?limit=50'); const d = await res.json(); setItems(d.data?.items || []) } catch { toast.error('Gagal memuat inbox') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const markAllRead = async () => {
    try { await fetch('/api/inbox', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }); load(); toast.success('Semua ditandai dibaca') } catch { toast.error('Gagal') }
  }
  const markRead = async (id: string) => {
    try { await fetch('/api/inbox', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setItems(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i)) } catch {}
  }

  const filtered = filter === 'all' ? items : filter === 'unread' ? items.filter((i: any) => !i.isRead) : items.filter((i: any) => i.priority === filter)
  const unreadCount = items.filter((i: any) => !i.isRead).length

  const typeIcon = (type: string) => {
    if (type === 'stock_low') return <AlertTriangle className="w-4 h-4" />
    if (type === 'purchase_status') return <ShoppingCart className="w-4 h-4" />
    if (type === 'sale_status') return <ShoppingBag className="w-4 h-4" />
    if (type === 'customer_created') return <Users className="w-4 h-4" />
    return <Bell className="w-4 h-4" />
  }
  const priorityColor = (p: string) => {
    if (p === 'urgent') return 'bg-red-100 text-red-500'
    if (p === 'warning') return 'bg-amber-100 text-amber-500'
    return 'bg-blue-100 text-blue-500'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Inbox</h2>
          <p className="text-sm text-stone-400">{unreadCount > 0 ? `${unreadCount} pesan belum dibaca` : 'Semua pesan sudah dibaca'}</p>
        </div>
        {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs"><Check className="w-3 h-3 mr-1" />Tandai Semua Dibaca</Button>}
      </div>
      <div className="flex items-center gap-2">
        {['all', 'unread', 'urgent', 'warning', 'info'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
            {f === 'all' ? 'Semua' : f === 'unread' ? 'Belum Dibaca' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden">
          {filtered.length === 0 ? <div className="p-8 text-center"><InboxIcon className="w-12 h-12 text-stone-200 mx-auto mb-3" /><p className="text-stone-400">Tidak ada pesan</p></div> : filtered.map((item: any) => (
            <button key={item.id} onClick={() => !item.isRead && markRead(item.id)} className={`w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-stone-50/50 transition-colors ${!item.isRead ? 'bg-stone-50/80' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${priorityColor(item.priority)}`}>{typeIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!item.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                  <p className={`text-sm truncate ${!item.isRead ? 'font-semibold text-stone-800' : 'font-medium text-stone-600'}`}>{item.title}</p>
                </div>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  {item.entityCode && <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-400">{item.entityCode}</span>}
                  <span className="text-[10px] text-stone-300">{fmtDateTime(item.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default InboxModule
