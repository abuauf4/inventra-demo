'use client'

import React from 'react'
import { Target } from 'lucide-react'

interface PrioritiesProps {
  data: any
}

export default function DailyPriorities({ data }: PrioritiesProps) {
  const priorities: { emoji: string; text: string; type: string; count: number }[] = []
  const lowStock = data?.lowStockProducts?.length || 0
  const pendingPO = data?.pendingPurchaseCount || 0
  const pendingSO = data?.pendingSaleCount || 0
  if (lowStock > 0) priorities.push({ emoji: '\u26A0\uFE0F', text: `${lowStock} varian perlu restock`, type: 'urgent', count: lowStock })
  if (pendingPO > 0) priorities.push({ emoji: '\uD83D\uDFE1', text: `${pendingPO} purchase order menunggu`, type: 'warning', count: pendingPO })
  if (pendingSO > 0) priorities.push({ emoji: '\uD83D\uDD35', text: `${pendingSO} sales order belum selesai`, type: 'info', count: pendingSO })
  if (priorities.length === 0) priorities.push({ emoji: '\u2705', text: 'Semua berjalan lancar hari ini', type: 'ok', count: 0 })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2"><Target className="w-4 h-4" />Prioritas Hari Ini</h3>
      <div className="space-y-1.5">
        {priorities.map((p, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${p.type === 'urgent' ? 'bg-red-50/80 hover:bg-red-100/80' : p.type === 'warning' ? 'bg-amber-50/80 hover:bg-amber-100/80' : p.type === 'info' ? 'bg-blue-50/80 hover:bg-blue-100/80' : 'bg-emerald-50/80 hover:bg-emerald-100/80'}`}>
            <span className="text-lg">{p.emoji}</span>
            <span className="text-sm font-medium text-stone-700 flex-1">{p.text}</span>
            {p.count > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.type === 'urgent' ? 'bg-red-200/60 text-red-800' : p.type === 'warning' ? 'bg-amber-200/60 text-amber-800' : 'bg-blue-200/60 text-blue-800'}`}>{p.count}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
