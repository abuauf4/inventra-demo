import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Product, Category, Supplier, Customer, Sale, Purchase } from '@/components/inventra/shared/types'

// ─── Generic fetcher ────────────────────────────────────────────
async function fetchJson<T>(url: string): Promise<{ success: boolean; data: T; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fetch failed')
  return res.json()
}

// ─── Products ───────────────────────────────────────────────────
export function useProducts(params?: { search?: string; categoryId?: string; lowStock?: boolean; mode?: 'list' | 'full'; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.categoryId && params.categoryId !== 'all') qs.set('categoryId', params.categoryId)
  if (params?.lowStock) qs.set('lowStock', 'true')
  if (params?.mode) qs.set('mode', params.mode)

  return useQuery({
    queryKey: ['products', params?.search || '', params?.categoryId || 'all', params?.lowStock || false, params?.mode || 'full'],
    queryFn: () => fetchJson<Product[]>(`/api/products?${qs}`).then(r => r.data),
    enabled: params?.enabled !== false,
  })
}

// ─── Categories ─────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchJson<Category[]>('/api/categories').then(r => r.data),
  })
}

// ─── Suppliers ──────────────────────────────────────────────────
export function useSuppliers(search?: string) {
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)

  return useQuery({
    queryKey: ['suppliers', search || ''],
    queryFn: () => fetchJson<Supplier[]>(`/api/suppliers?${qs}`).then(r => r.data),
  })
}

// ─── Customers ──────────────────────────────────────────────────
export function useCustomers(search?: string) {
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)

  return useQuery({
    queryKey: ['customers', search || ''],
    queryFn: () => fetchJson<Customer[]>(`/api/customers?${qs}`).then(r => r.data),
  })
}

// ─── Sales (with pagination) ────────────────────────────────────
export interface SalesPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useSales(params?: { search?: string; status?: string; page?: number; limit?: number; mode?: 'list' | 'full'; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status && params.status !== 'all') qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.mode) qs.set('mode', params.mode)

  return useQuery({
    queryKey: ['sales', params?.search || '', params?.status || 'all', params?.page || 1, params?.limit || 50, params?.mode || 'full'],
    queryFn: async () => {
      const res = await fetchJson<Sale[]>(`/api/sales?${qs}`)
      return { data: res.data, pagination: res.pagination }
    },
    enabled: params?.enabled !== false,
  })
}

// ─── Purchases (with pagination) ────────────────────────────────
export interface PurchasesPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function usePurchases(params?: { search?: string; status?: string; page?: number; limit?: number; mode?: 'list' | 'full'; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status && params.status !== 'all') qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.mode) qs.set('mode', params.mode)

  return useQuery({
    queryKey: ['purchases', params?.search || '', params?.status || 'all', params?.page || 1, params?.limit || 50, params?.mode || 'full'],
    queryFn: async () => {
      const res = await fetchJson<Purchase[]>(`/api/purchases?${qs}`)
      return { data: res.data, pagination: res.pagination }
    },
    enabled: params?.enabled !== false,
  })
}

// ─── Mutation helpers (invalidate cache after write) ────────────
export function useInvalidateOnSuccess(keys: string[]) {
  const qc = useQueryClient()
  return () => {
    for (const key of keys) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

// Generic mutation with cache invalidation and toast
export function useCrudMutation<TBody>({
  url,
  method,
  invalidateKeys,
  successMsg,
}: {
  url: string
  method: 'POST' | 'PUT' | 'DELETE'
  invalidateKeys: string[]
  successMsg: string
}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: TBody) => {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Gagal')
      return data
    },
    onSuccess: () => {
      toast.success(successMsg)
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal')
    },
  })
}
