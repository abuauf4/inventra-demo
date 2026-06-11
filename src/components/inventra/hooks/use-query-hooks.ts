import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Product, Category, Supplier, Customer, Sale, Purchase, StockMutation, Warehouse } from '@/components/inventra/shared/types'

// ─── Generic fetcher ────────────────────────────────────────────
async function fetchJson<T>(url: string): Promise<{ success: boolean; data: T; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fetch failed')
  return res.json()
}

// ─── Products (with pagination) ──────────────────────────────────
export function useProducts(params?: { search?: string; categoryId?: string; supplierId?: string; lowStock?: boolean; mode?: 'list' | 'full'; page?: number; limit?: number; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.categoryId && params.categoryId !== 'all') qs.set('categoryId', params.categoryId)
  if (params?.supplierId) qs.set('supplierId', params.supplierId)
  if (params?.lowStock) qs.set('lowStock', 'true')
  if (params?.mode) qs.set('mode', params.mode)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))

  return useQuery({
    queryKey: ['products', params?.search || '', params?.categoryId || 'all', params?.supplierId || '', params?.lowStock || false, params?.mode || 'full', params?.page || 1, params?.limit || 20],
    queryFn: async () => {
      const res = await fetchJson<Product[]>(`/api/products?${qs}`)
      return { data: res.data, pagination: res.pagination }
    },
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

// ─── Suppliers (with pagination) ────────────────────────────────
export function useSuppliers(params?: { search?: string; page?: number; limit?: number; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))

  return useQuery({
    queryKey: ['suppliers', params?.search || '', params?.page || 1, params?.limit || 20],
    queryFn: async () => {
      const res = await fetchJson<Supplier[]>(`/api/suppliers?${qs}`)
      return { data: res.data, pagination: res.pagination }
    },
    enabled: params?.enabled !== false,
  })
}

// ─── Customers (with pagination) ────────────────────────────────
export function useCustomers(params?: { search?: string; page?: number; limit?: number; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))

  return useQuery({
    queryKey: ['customers', params?.search || '', params?.page || 1, params?.limit || 20],
    queryFn: async () => {
      const res = await fetchJson<Customer[]>(`/api/customers?${qs}`)
      return { data: res.data, pagination: res.pagination }
    },
    enabled: params?.enabled !== false,
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

// ─── Stock Mutations (with pagination) ──────────────────────────
export function useStockMutations(params?: { search?: string; type?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number; enabled?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.type && params.type !== 'all') qs.set('type', params.type)
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))

  return useQuery({
    queryKey: ['stock-mutations', params?.search || '', params?.type || 'all', params?.dateFrom || '', params?.dateTo || '', params?.page || 1, params?.limit || 20],
    queryFn: async () => {
      const res = await fetchJson<StockMutation[]>(`/api/stock-mutations?${qs}`)
      return { data: res.data, pagination: res.pagination }
    },
    enabled: params?.enabled !== false,
  })
}

// ─── Warehouses ────────────────────────────────────────────────
export function useWarehouses(enabled?: boolean) {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchJson<Warehouse[]>('/api/warehouses').then(r => r.data),
    enabled: enabled !== false,
  })
}

// ─── Dashboard ─────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetchJson<import('@/components/inventra/shared/types').DashboardData>('/api/dashboard').then(r => r.data),
    staleTime: 30 * 1000, // 30s — dashboard data can be slightly stale
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
