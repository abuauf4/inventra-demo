import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/seed - Seed initial fashion-themed data
export async function GET() {
  try {
    const results = {
      owner: null as string | null,
      categories: [] as string[],
      warehouses: [] as string[],
      suppliers: [] as string[],
      customers: [] as string[],
      products: [] as string[],
    }

    // Seed owner user
    const existingOwner = await db.user.findUnique({
      where: { email: 'owner@inventra.id' },
    })

    if (!existingOwner) {
      const owner = await db.user.create({
        data: {
          email: 'owner@inventra.id',
          password: 'owner123',
          name: 'Owner',
          role: 'owner',
        },
      })
      results.owner = owner.id
    } else {
      results.owner = 'already_exists'
    }

    // Seed categories (fashion-themed)
    const categoryNames = ['T-Shirt', 'Kemeja', 'Celana', 'Jaket', 'Aksesoris']
    const categoryIds: Record<string, string> = {}
    for (const catName of categoryNames) {
      const existing = await db.category.findFirst({
        where: { name: catName },
      })
      if (!existing) {
        const cat = await db.category.create({
          data: { name: catName },
        })
        categoryIds[catName] = cat.id
        results.categories.push(cat.id)
      } else {
        categoryIds[catName] = existing.id
        results.categories.push('already_exists')
      }
    }

    // Seed warehouses
    const warehouseData = [
      { name: 'Gudang Utama', code: 'GDG-01', address: 'Jl. Industri No. 1, Jakarta' },
      { name: 'Gudang Toko', code: 'TOKO-01', address: 'Jl. Fashion Mall No. 5, Jakarta' },
    ]
    const warehouseIds: Record<string, string> = {}
    for (const wh of warehouseData) {
      const existing = await db.warehouse.findUnique({
        where: { code: wh.code },
      })
      if (!existing) {
        const created = await db.warehouse.create({
          data: { name: wh.name, code: wh.code, address: wh.address },
        })
        warehouseIds[wh.code] = created.id
        results.warehouses.push(created.id)
      } else {
        warehouseIds[wh.code] = existing.id
        results.warehouses.push('already_exists')
      }
    }

    // Seed suppliers
    const supplierData = [
      { name: 'PT Garmen Nusantara', pic: 'Pak Hendra', phone: '021-5551234' },
      { name: 'CV Kain Prima', pic: 'Bu Sari', phone: '021-5555678' },
      { name: 'UD Aksesoris Modis', pic: 'Mas Dedi', phone: '021-5559012' },
    ]
    const supplierIds: Record<string, string> = {}
    for (const sup of supplierData) {
      const existing = await db.supplier.findFirst({
        where: { name: sup.name },
      })
      if (!existing) {
        const created = await db.supplier.create({
          data: { name: sup.name, pic: sup.pic, phone: sup.phone },
        })
        supplierIds[sup.name] = created.id
        results.suppliers.push(created.id)
      } else {
        supplierIds[sup.name] = existing.id
        results.suppliers.push('already_exists')
      }
    }

    // Seed customers
    const customerData = [
      { name: 'Rina Fashion', phone: '081234567890' },
      { name: 'Toko Pakaian Jaya', phone: '081234567891' },
      { name: 'Budi Personal', phone: '081234567892' },
    ]
    for (const cust of customerData) {
      const existing = await db.customer.findFirst({
        where: { name: cust.name },
      })
      if (!existing) {
        const created = await db.customer.create({
          data: { name: cust.name, phone: cust.phone },
        })
        results.customers.push(created.id)
      } else {
        results.customers.push('already_exists')
      }
    }

    // Seed products WITH VARIANTS
    const productVariants = [
      {
        name: 'Oversize Tee',
        sku: 'OVT',
        category: 'T-Shirt',
        supplier: 'PT Garmen Nusantara',
        buyPrice: 75000,
        sellPrice: 150000,
        minStock: 5,
        variants: [
          { name: 'Black M', sku: 'OVT-BLK-M', attributes: '{"color":"Black","size":"M"}', stock: 25, minStock: 5 },
          { name: 'Black L', sku: 'OVT-BLK-L', attributes: '{"color":"Black","size":"L"}', stock: 25, minStock: 5 },
          { name: 'Black XL', sku: 'OVT-BLK-XL', attributes: '{"color":"Black","size":"XL"}', stock: 2, minStock: 5 }, // LOW STOCK
          { name: 'White M', sku: 'OVT-WHT-M', attributes: '{"color":"White","size":"M"}', stock: 25, minStock: 5 },
          { name: 'White L', sku: 'OVT-WHT-L', attributes: '{"color":"White","size":"L"}', stock: 25, minStock: 5 },
          { name: 'White XL', sku: 'OVT-WHT-XL', attributes: '{"color":"White","size":"XL"}', stock: 25, minStock: 5 },
        ],
      },
      {
        name: 'Kemeja Linen',
        sku: 'KLN',
        category: 'Kemeja',
        supplier: 'CV Kain Prima',
        buyPrice: 150000,
        sellPrice: 295000,
        minStock: 3,
        variants: [
          { name: 'Navy M', sku: 'KLN-NAV-M', attributes: '{"color":"Navy","size":"M"}', stock: 15, minStock: 3 },
          { name: 'Navy L', sku: 'KLN-NAV-L', attributes: '{"color":"Navy","size":"L"}', stock: 15, minStock: 3 },
          { name: 'Beige M', sku: 'KLN-BGE-M', attributes: '{"color":"Beige","size":"M"}', stock: 15, minStock: 3 },
          { name: 'Beige L', sku: 'KLN-BGE-L', attributes: '{"color":"Beige","size":"L"}', stock: 2, minStock: 3 }, // LOW STOCK
        ],
      },
      {
        name: 'Cargo Pants',
        sku: 'CRG',
        category: 'Celana',
        supplier: 'PT Garmen Nusantara',
        buyPrice: 120000,
        sellPrice: 250000,
        minStock: 3,
        variants: [
          { name: 'Khaki M', sku: 'CRG-KHK-M', attributes: '{"color":"Khaki","size":"M"}', stock: 12, minStock: 3 },
          { name: 'Khaki L', sku: 'CRG-KHK-L', attributes: '{"color":"Khaki","size":"L"}', stock: 12, minStock: 3 },
          { name: 'Black M', sku: 'CRG-BLK-M', attributes: '{"color":"Black","size":"M"}', stock: 12, minStock: 3 },
          { name: 'Black L', sku: 'CRG-BLK-L', attributes: '{"color":"Black","size":"L"}', stock: 1, minStock: 3 }, // LOW STOCK
        ],
      },
      {
        name: 'Denim Jacket',
        sku: 'DNJ',
        category: 'Jaket',
        supplier: 'CV Kain Prima',
        buyPrice: 200000,
        sellPrice: 450000,
        minStock: 2,
        variants: [
          { name: 'Blue M', sku: 'DNJ-BLU-M', attributes: '{"color":"Blue","size":"M"}', stock: 8, minStock: 2 },
          { name: 'Blue L', sku: 'DNJ-BLU-L', attributes: '{"color":"Blue","size":"L"}', stock: 8, minStock: 2 },
          { name: 'Black M', sku: 'DNJ-BLK-M', attributes: '{"color":"Black","size":"M"}', stock: 8, minStock: 2 },
          { name: 'Black L', sku: 'DNJ-BLK-L', attributes: '{"color":"Black","size":"L"}', stock: 1, minStock: 2 }, // LOW STOCK
        ],
      },
    ]

    for (const pData of productVariants) {
      const existingProduct = await db.product.findUnique({
        where: { sku: pData.sku },
      })

      if (!existingProduct) {
        const product = await db.product.create({
          data: {
            name: pData.name,
            sku: pData.sku,
            categoryId: categoryIds[pData.category],
            supplierId: supplierIds[pData.supplier] || null,
            buyPrice: pData.buyPrice,
            sellPrice: pData.sellPrice,
            minStock: pData.minStock,
            isActive: true,
            variants: {
              create: pData.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                attributes: v.attributes,
                buyPrice: pData.buyPrice,
                sellPrice: pData.sellPrice,
                stock: v.stock,
                minStock: v.minStock,
                isActive: true,
              })),
            },
          },
          include: { variants: true },
        })

        // Create WarehouseStock entries for Gudang Utama
        const gudangUtamaId = warehouseIds['GDG-01']
        if (gudangUtamaId) {
          for (const variant of product.variants) {
            const variantData = pData.variants.find((v) => v.sku === variant.sku)
            if (variantData) {
              await db.warehouseStock.create({
                data: {
                  warehouseId: gudangUtamaId,
                  productVariantId: variant.id,
                  stock: variantData.stock,
                },
              })
            }
          }
        }

        results.products.push(product.id)
      } else {
        results.products.push('already_exists')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seed data fashion berhasil dibuat',
      data: results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal membuat seed data' },
      { status: 500 }
    )
  }
}
