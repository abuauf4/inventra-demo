import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/seed - Seed initial data
export async function GET() {
  try {
    const results = {
      owner: null as string | null,
      categories: [] as string[],
      suppliers: [] as string[],
      customers: [] as string[],
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

    // Seed categories
    const categoryNames = ['Laptop', 'Desktop', 'Aksesoris', 'Sparepart', 'Komponen']
    for (const catName of categoryNames) {
      const existing = await db.category.findFirst({
        where: { name: catName },
      })
      if (!existing) {
        const cat = await db.category.create({
          data: { name: catName },
        })
        results.categories.push(cat.id)
      } else {
        results.categories.push('already_exists')
      }
    }

    // Seed suppliers
    const supplierData = [
      { name: 'PT Teknologi Indonesia' },
      { name: 'CV Komputer Jaya' },
      { name: 'UD Sparepart Mantap' },
    ]
    for (const sup of supplierData) {
      const existing = await db.supplier.findFirst({
        where: { name: sup.name },
      })
      if (!existing) {
        const created = await db.supplier.create({
          data: { name: sup.name },
        })
        results.suppliers.push(created.id)
      } else {
        results.suppliers.push('already_exists')
      }
    }

    // Seed customers
    const customerNames = ['Budi Santoso', 'Siti Rahayu', 'Ahmad Wijaya']
    for (const custName of customerNames) {
      const existing = await db.customer.findFirst({
        where: { name: custName },
      })
      if (!existing) {
        const created = await db.customer.create({
          data: { name: custName },
        })
        results.customers.push(created.id)
      } else {
        results.customers.push('already_exists')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seed data berhasil dibuat',
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
