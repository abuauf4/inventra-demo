// ===================== FORMAT HELPERS =====================
export const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n)
export const fmtRp = (n: number) => `Rp ${fmt(n)}`
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateTime = (d: string) => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// ===================== STATUS BADGES =====================
export const purchaseStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}
export const saleStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  PAID: { label: 'Dibayar', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

// ===================== ROLE CONFIG =====================
export const roleLabels: Record<string, string> = { owner: 'Owner', admin: 'Admin', staff: 'Staff', warehouse: 'Warehouse' }
export const roleColors: Record<string, string> = { owner: 'from-amber-500 to-orange-600', admin: 'from-blue-500 to-cyan-500', staff: 'from-teal-500 to-emerald-500', warehouse: 'from-orange-500 to-amber-500' }

// ===================== ROLE-BASED GREETINGS =====================
export const roleGreetings: Record<string, { line1: string; line2: string }> = {
  owner: { line1: 'Ada beberapa hal yang perlu perhatian hari ini.', line2: '' },
  admin: { line1: 'Ada beberapa hal yang perlu perhatian hari ini.', line2: '' },
  staff: { line1: 'Yuk beresin kerjaan hari ini.', line2: '' },
  warehouse: { line1: 'Ada barang yang perlu diproses.', line2: '' },
}
