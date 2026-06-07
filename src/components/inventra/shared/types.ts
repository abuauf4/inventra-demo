// ===================== INVENTRA SHARED TYPES =====================

export interface Category {
  id: string; name: string; description?: string; _count?: { products: number }; createdAt: string
}
export interface Supplier {
  id: string; code: string; name: string; pic?: string; phone?: string; email?: string; address?: string; notes?: string; _count?: { purchases: number }; createdAt: string
}
export interface Customer {
  id: string; code: string; name: string; phone?: string; email?: string; address?: string; notes?: string; _count?: { sales: number }; createdAt: string
}
export interface ProductVariant {
  id: string; productId: string; name: string; sku: string; attributes: string; buyPrice: number; sellPrice: number; stock: number; minStock: number; isActive: boolean; barcode?: string; createdAt: string
}
export interface Product {
  id: string; name: string; sku: string; categoryId: string; supplierId?: string; description?: string; image?: string; buyPrice: number; sellPrice: number; minStock: number; isActive: boolean; category?: Category; supplier?: Supplier; variants?: ProductVariant[]; createdAt: string
}
export interface Warehouse {
  id: string; name: string; code: string; address?: string; isActive: boolean; _count?: { stocks: number }; createdAt: string
}
export interface PurchaseItem {
  id?: string; purchaseId?: string; variantId?: string; productId?: string; qty: number; buyPrice: number; variant?: ProductVariant; product?: Product
}
export interface SaleItem {
  id?: string; saleId?: string; variantId?: string; productId?: string; qty: number; sellPrice: number; variant?: ProductVariant; product?: Product
}
export interface Purchase {
  id: string; transNo: string; supplierId: string; date: string; total: number; status: string; notes?: string; supplier?: Supplier; items: PurchaseItem[]; createdAt: string
}
export interface Sale {
  id: string; transNo: string; customerId?: string; date: string; total: number; status: string; notes?: string; customer?: Customer; items: SaleItem[]; createdAt: string
}
export interface StockMutation {
  id: string; variantId?: string; productId?: string; warehouseId?: string; type: string; qty: number; note?: string; variant?: ProductVariant; product?: Product; warehouse?: Warehouse; createdAt: string
}
export interface ActivityLog {
  id: string; userId: string; action: string; entity: string; entityId?: string; entityCode?: string; details: string; previousData?: string; newData?: string; user?: { id: string; name: string; username: string; role: string }; createdAt: string
}
export interface User {
  id: string; name: string; username: string; email?: string; role: string; isActive: boolean; createdAt: string
}
export interface DashboardData {
  totalProducts: number
  totalCustomers: number
  totalSuppliers: number
  totalWarehouses: number
  salesToday: number
  salesTodayCount: number
  purchasesToday: number
  purchasesTodayCount: number
  totalSales: number
  totalPurchases: number
  lowStockProducts: Array<{
    variantId: string; variantName: string; variantSku: string; stock: number; minStock: number
    productId: string; productName: string; productSku: string; category: string | null
  }>
  lowStockCount: number
  pendingPurchaseCount: number
  pendingSaleCount: number
  stockInToday: number
  stockOutToday: number
  newCustomersThisWeek: number
  recentTransactions: Array<{
    type: 'purchase' | 'sale'; id: string; transNo: string; date: string; total: number; status: string; party?: string
  }>
  recentActivityLogs: ActivityLog[]
}
