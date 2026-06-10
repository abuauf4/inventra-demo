import { Badge } from '@/components/ui/badge'

const purchaseStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  APPROVED: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  RECEIVED: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}
const saleStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  PAID: { label: 'Dibayar', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  COMPLETED: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

export function StatusBadge({ status, map }: { status: string; map: 'purchase' | 'sale' }) {
  const statusMap = map === 'purchase' ? purchaseStatusMap : saleStatusMap
  const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
  return <Badge className={s.color}>{s.label}</Badge>
}
