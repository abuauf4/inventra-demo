import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/seed - Seed premium fashion-themed data for Northline Apparel
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
      where: { username: 'Bagas' },
    })

    if (!existingOwner) {
      const owner = await db.user.create({
        data: {
          username: 'Bagas',
          password: '122333',
          name: 'Bagas',
          role: 'owner',
        },
      })
      results.owner = owner.id
    } else {
      results.owner = 'already_exists'
    }

    // Seed categories (fashion-forward)
    const categoryNames = ['T-Shirt', 'Hoodie', 'Pants', 'Outerwear', 'Accessories']
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

    // Seed warehouses with WH0001, WH0002 pattern
    const warehouseData = [
      { name: 'Gudang Utama', code: 'WH0001', address: 'Jl. Industri Raya No. 45, Cakung, Jakarta Timur' },
      { name: 'Gudang Toko', code: 'WH0002', address: 'Lot 23, Level 3, Grand Indonesia Mall, Jakarta Pusat' },
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

    // Seed suppliers with SUP000001, SUP000002, SUP000003 codes
    const supplierData = [
      { code: 'SUP000001', name: 'PT Garmen Nusantara', pic: 'Pak Hendra', phone: '021-5551234', email: 'hendra@garmen-nusantara.co.id', address: 'Jl. Textile Center No. 12, Bandung' },
      { code: 'SUP000002', name: 'CV Kain Prima', pic: 'Bu Sari', phone: '021-5555678', email: 'sari@kainprima.com', address: 'Jl. Rajutan Indah No. 8, Surabaya' },
      { code: 'SUP000003', name: 'UD Aksesoris Modis', pic: 'Mas Dedi', phone: '021-5559012', email: 'dedi@aksesorismodis.id', address: 'Jl. Craft Lane No. 3, Yogyakarta' },
    ]
    const supplierIds: Record<string, string> = {}
    for (const sup of supplierData) {
      const existing = await db.supplier.findUnique({
        where: { code: sup.code },
      })
      if (!existing) {
        const created = await db.supplier.create({
          data: { code: sup.code, name: sup.name, pic: sup.pic, phone: sup.phone, email: sup.email, address: sup.address },
        })
        supplierIds[sup.name] = created.id
        results.suppliers.push(created.id)
      } else {
        supplierIds[sup.name] = existing.id
        results.suppliers.push('already_exists')
      }
    }

    // Seed customers with CUS000001, CUS000002, etc. codes
    const customerData = [
      { code: 'CUS000001', name: 'Rina Fashion House', phone: '081234567890', email: 'rina@rinafashion.com', address: 'Jl. Kemang Raya No. 15, Jakarta Selatan' },
      { code: 'CUS000002', name: 'Toko Pakaian Jaya', phone: '081234567891', email: 'order@tokojaya.co.id', address: 'Jl. Pahlawan No. 78, Semarang' },
      { code: 'CUS000003', name: 'Budi Personal Shopper', phone: '081234567892', address: 'Jl. Sudirman No. 120, Jakarta' },
      { code: 'CUS000004', name: 'Warung Style Bandung', phone: '082112233445', email: 'hello@warungstylebdg.com', address: 'Jl. Dago No. 33, Bandung' },
    ]
    for (const cust of customerData) {
      const existing = await db.customer.findUnique({
        where: { code: cust.code },
      })
      if (!existing) {
        const created = await db.customer.create({
          data: { code: cust.code, name: cust.name, phone: cust.phone, email: cust.email || null, address: cust.address || null },
        })
        results.customers.push(created.id)
      } else {
        results.customers.push('already_exists')
      }
    }

    // ========================================
    // PREMIUM SEED: Northline Apparel Products
    // SKU pattern: CL000001, CL000002, etc.
    // Variant SKU pattern: CL000001-OBS-M, etc.
    // ========================================
    const productVariants = [
      {
        name: 'Essential Tee',
        sku: 'CL000001',
        category: 'T-Shirt',
        supplier: 'PT Garmen Nusantara',
        buyPrice: 75000,
        sellPrice: 165000,
        minStock: 5,
        description: 'Premium cotton essential tee, 30s combed cotton, oversized fit',
        variants: [
          { name: 'Obsidian M', sku: 'CL000001-OBS-M', attributes: '{"color":"Obsidian","size":"M"}', stock: 28, minStock: 5 },
          { name: 'Obsidian L', sku: 'CL000001-OBS-L', attributes: '{"color":"Obsidian","size":"L"}', stock: 32, minStock: 5 },
          { name: 'Obsidian XL', sku: 'CL000001-OBS-XL', attributes: '{"color":"Obsidian","size":"XL"}', stock: 3, minStock: 5 }, // LOW STOCK
          { name: 'Cream M', sku: 'CL000001-CRM-M', attributes: '{"color":"Cream","size":"M"}', stock: 22, minStock: 5 },
          { name: 'Cream L', sku: 'CL000001-CRM-L', attributes: '{"color":"Cream","size":"L"}', stock: 25, minStock: 5 },
          { name: 'Cream XL', sku: 'CL000001-CRM-XL', attributes: '{"color":"Cream","size":"XL"}', stock: 18, minStock: 5 },
          { name: 'Sage M', sku: 'CL000001-SAG-M', attributes: '{"color":"Sage","size":"M"}', stock: 15, minStock: 5 },
          { name: 'Sage L', sku: 'CL000001-SAG-L', attributes: '{"color":"Sage","size":"L"}', stock: 15, minStock: 5 },
        ],
      },
      {
        name: 'Urban Hoodie',
        sku: 'CL000002',
        category: 'Hoodie',
        supplier: 'PT Garmen Nusantara',
        buyPrice: 155000,
        sellPrice: 345000,
        minStock: 3,
        description: 'Heavyweight fleece hoodie, 420gsm, drop shoulder, kangaroo pocket',
        variants: [
          { name: 'Charcoal M', sku: 'CL000002-CHR-M', attributes: '{"color":"Charcoal","size":"M"}', stock: 10, minStock: 3 },
          { name: 'Charcoal L', sku: 'CL000002-CHR-L', attributes: '{"color":"Charcoal","size":"L"}', stock: 12, minStock: 3 },
          { name: 'Charcoal XL', sku: 'CL000002-CHR-XL', attributes: '{"color":"Charcoal","size":"XL"}', stock: 2, minStock: 3 }, // LOW STOCK
          { name: 'Oatmeal M', sku: 'CL000002-OAT-M', attributes: '{"color":"Oatmeal","size":"M"}', stock: 8, minStock: 3 },
          { name: 'Oatmeal L', sku: 'CL000002-OAT-L', attributes: '{"color":"Oatmeal","size":"L"}', stock: 8, minStock: 3 },
          { name: 'Oatmeal XL', sku: 'CL000002-OAT-XL', attributes: '{"color":"Oatmeal","size":"XL"}', stock: 6, minStock: 3 },
        ],
      },
      {
        name: 'Cargo Pants',
        sku: 'CL000003',
        category: 'Pants',
        supplier: 'CV Kain Prima',
        buyPrice: 120000,
        sellPrice: 275000,
        minStock: 3,
        description: 'Tactical cargo pants, ripstop fabric, adjustable waist, 6 pockets',
        variants: [
          { name: 'Khaki M', sku: 'CL000003-KHK-M', attributes: '{"color":"Khaki","size":"M"}', stock: 14, minStock: 3 },
          { name: 'Khaki L', sku: 'CL000003-KHK-L', attributes: '{"color":"Khaki","size":"L"}', stock: 14, minStock: 3 },
          { name: 'Obsidian M', sku: 'CL000003-OBS-M', attributes: '{"color":"Obsidian","size":"M"}', stock: 11, minStock: 3 },
          { name: 'Obsidian L', sku: 'CL000003-OBS-L', attributes: '{"color":"Obsidian","size":"L"}', stock: 1, minStock: 3 }, // LOW STOCK
        ],
      },
      {
        name: 'Canvas Tote Bag',
        sku: 'CL000004',
        category: 'Accessories',
        supplier: 'UD Aksesoris Modis',
        buyPrice: 45000,
        sellPrice: 95000,
        minStock: 5,
        description: 'Waxed canvas tote, genuine leather handle, inner zip pocket',
        variants: [
          { name: 'Natural One Size', sku: 'CL000004-NAT-OS', attributes: '{"color":"Natural","size":"One Size"}', stock: 20, minStock: 5 },
          { name: 'Obsidian One Size', sku: 'CL000004-OBS-OS', attributes: '{"color":"Obsidian","size":"One Size"}', stock: 18, minStock: 5 },
        ],
      },
      {
        name: 'Signature Cap',
        sku: 'CL000005',
        category: 'Accessories',
        supplier: 'UD Aksesoris Modis',
        buyPrice: 35000,
        sellPrice: 85000,
        minStock: 5,
        description: 'Unstructured dad cap, washed cotton, embroidered logo, adjustable strap',
        variants: [
          { name: 'Obsidian', sku: 'CL000005-OBS', attributes: '{"color":"Obsidian"}', stock: 25, minStock: 5 },
          { name: 'Cream', sku: 'CL000005-CRM', attributes: '{"color":"Cream"}', stock: 22, minStock: 5 },
          { name: 'Olive', sku: 'CL000005-OLV', attributes: '{"color":"Olive"}', stock: 4, minStock: 5 }, // LOW STOCK
        ],
      },
      {
        name: 'Runner Sneakers',
        sku: 'CL000006',
        category: 'Accessories',
        supplier: 'UD Aksesoris Modis',
        buyPrice: 180000,
        sellPrice: 395000,
        minStock: 2,
        description: 'Knit upper runner, EVA midsole, rubber outsole, lightweight comfort',
        variants: [
          { name: 'Cloud White 40', sku: 'CL000006-WHT-40', attributes: '{"color":"Cloud White","size":"40"}', stock: 6, minStock: 2 },
          { name: 'Cloud White 41', sku: 'CL000006-WHT-41', attributes: '{"color":"Cloud White","size":"41"}', stock: 5, minStock: 2 },
          { name: 'Cloud White 42', sku: 'CL000006-WHT-42', attributes: '{"color":"Cloud White","size":"42"}', stock: 4, minStock: 2 },
          { name: 'Cloud White 43', sku: 'CL000006-WHT-43', attributes: '{"color":"Cloud White","size":"43"}', stock: 3, minStock: 2 },
          { name: 'All Black 40', sku: 'CL000006-BLK-40', attributes: '{"color":"All Black","size":"40"}', stock: 5, minStock: 2 },
          { name: 'All Black 41', sku: 'CL000006-BLK-41', attributes: '{"color":"All Black","size":"41"}', stock: 4, minStock: 2 },
          { name: 'All Black 42', sku: 'CL000006-BLK-42', attributes: '{"color":"All Black","size":"42"}', stock: 2, minStock: 2 },
          { name: 'All Black 43', sku: 'CL000006-BLK-43', attributes: '{"color":"All Black","size":"43"}', stock: 1, minStock: 2 }, // LOW STOCK
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
        const gudangUtamaId = warehouseIds['WH0001']
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
      message: 'Seed data Northline Apparel berhasil dibuat',
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
