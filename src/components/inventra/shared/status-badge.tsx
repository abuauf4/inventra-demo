import { Badge } from '@/components/ui/badge'

const purchaseStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}
const saleStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  PAID: { label: 'Dibayar', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

export function StatusBadge({ status, map }: { status: string; map: 'purchase' | 'sale' }) {
  const statusMap = map === 'purchase' ? purchaseStatusMap : saleStatusMap
  const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  return <Badge className={s.color}>{s.label}</Badge>
}
