import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/search?q=query - Universal search across all entities
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || ''
    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, data: [] })
    }

    const results: any[] = []

    // Search Customers
    const customers = await db.customer.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { name: { contains: q } },
          { phone: { contains: q } },
        ]
      },
      take: 5,
    })
    customers.forEach(c => results.push({
      type: 'Customer', id: c.id, code: c.code, label: c.name,
      sublabel: c.phone || '', page: 'customers' as const,
    }))

    // Search Suppliers
    const suppliers = await db.supplier.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { name: { contains: q } },
        ]
      },
      take: 5,
    })
    suppliers.forEach(s => results.push({
      type: 'Supplier', id: s.id, code: s.code, label: s.name,
      sublabel: s.pic || '', page: 'suppliers' as const,
    }))

    // Search Products
    const products = await db.product.findMany({
      where: {
        OR: [
          { sku: { contains: q } },
          { name: { contains: q } },
        ]
      },
      include: { category: true },
      take: 5,
    })
    products.forEach(p => results.push({
      type: 'Product', id: p.id, code: p.sku, label: p.name,
      sublabel: p.category?.name || '', page: 'products' as const,
    }))

    // Search Purchases
    const purchases = await db.purchase.findMany({
      where: { transNo: { contains: q } },
      include: { supplier: true },
      take: 5,
    })
    purchases.forEach(p => results.push({
      type: 'Purchase', id: p.id, code: p.transNo, label: p.transNo,
      sublabel: p.supplier?.name || '', page: 'purchases' as const,
    }))

    // Search Sales
    const sales = await db.sale.findMany({
      where: { transNo: { contains: q } },
      include: { customer: true },
      take: 5,
    })
    sales.forEach(s => results.push({
      type: 'Sale', id: s.id, code: s.transNo, label: s.transNo,
      sublabel: s.customer?.name || 'Umum', page: 'sales' as const,
    }))

    // Search Product Variants
    const variants = await db.productVariant.findMany({
      where: {
        OR: [
          { sku: { contains: q } },
          { name: { contains: q } },
        ]
      },
      include: { product: { include: { category: true } } },
      take: 5,
    })
    variants.forEach(v => results.push({
      type: 'Variant', id: v.id, code: v.sku, label: `${v.product.name} — ${v.name}`,
      sublabel: `Stok: ${v.stock}`, page: 'products' as const,
    }))

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ success: false, message: 'Gagal mencari' }, { status: 500 })
  }
}
