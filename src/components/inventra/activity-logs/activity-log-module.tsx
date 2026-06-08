'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ActivityLog } from '@/components/inventra/shared/types'
import { fmtDateTime, purchaseStatusMap, saleStatusMap } from '@/components/inventra/shared/constants'
import { StatusBadge } from '@/components/inventra/shared/status-badge'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import {
  Plus, Edit, Trash2, ChevronRight, Check, Activity, RefreshCw,
} from 'lucide-react'

function ActivityLogModule() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterAction, setFilterAction] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterEntity !== 'all') params.set('entity', filterEntity)
      if (filterAction !== 'all') params.set('action', filterAction)
      const res = await fetch(`/api/activity-logs?${params}`)
      setLogs((await res.json()).data ?? [])
    } catch { toast.error('Gagal') }
    finally { setLoading(false) }
  }, [filterEntity, filterAction])
  useEffect(() => { load() }, [load])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus className="w-4 h-4 text-emerald-500" />
      case 'UPDATE': return <Edit className="w-4 h-4 text-blue-500" />
      case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />
      case 'STATUS_CHANGE': return <ChevronRight className="w-4 h-4 text-amber-500" />
      case 'LOGIN': return <Check className="w-4 h-4 text-emerald-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const renderDetails = (log: ActivityLog) => {
    if (log.action === 'STATUS_CHANGE' && log.previousData && log.newData) {
      try {
        const prev = JSON.parse(log.previousData)
        const next = JSON.parse(log.newData)
        if (prev.status && next.status) {
          const mapKey = log.entity === 'Purchase' ? 'purchase' : 'sale'
          return (
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={prev.status} map={mapKey} />
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <StatusBadge status={next.status} map={mapKey} />
            </div>
          )
        }
      } catch {}
    }
    return <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
  }

  const entityTypes = ['Customer', 'Supplier', 'Product', 'Purchase', 'Sale', 'User']
  const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN']

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterEntity} onValueChange={setFilterEntity}><SelectTrigger className="w-40"><SelectValue placeholder="Entity" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Entity</SelectItem>{entityTypes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Select value={filterAction} onValueChange={setFilterAction}><SelectTrigger className="w-40"><SelectValue placeholder="Aksi" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Aksi</SelectItem>{actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>
      <p className="text-sm text-muted-foreground">Menampilkan {logs.length} aktivitas</p>
      {loading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-rose-500" /></div> : (
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          {logs.length === 0 ? <p className="text-center py-8 text-muted-foreground">Belum ada aktivitas</p> : (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.user?.name || 'Unknown'}</span>
                      <Badge variant="outline" className="text-[10px]">{log.action === 'CREATE' ? 'membuat' : log.action === 'UPDATE' ? 'mengubah' : log.action === 'DELETE' ? 'menghapus' : log.action === 'STATUS_CHANGE' ? 'mengubah status' : log.action.toLowerCase()}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{log.entity}</Badge>
                      {log.entityCode && <Badge variant="outline" className="font-mono text-[10px]">{log.entityCode}</Badge>}
                    </div>
                    {renderDetails(log)}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  )
}

export default ActivityLogModule
