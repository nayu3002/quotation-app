import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productTypeId = searchParams.get('productTypeId')

  const fields = await prisma.customCostField.findMany({
    where: { 
      organizationId: ctx.organizationId, 
      isActive: true,
      ...(productTypeId ? {
        OR: [
          { productTypeId: null },
          { productTypeId }
        ]
      } : {})
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(fields)
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type, isMultiplier, defaultValue, sortOrder, productTypeId } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const field = await prisma.customCostField.create({
    data: {
      name,
      type: type ?? 'numeric',
      isMultiplier: isMultiplier ?? false,
      defaultValue: defaultValue ?? 0,
      sortOrder: sortOrder ?? 0,
      organizationId: ctx.organizationId,
      productTypeId: productTypeId ?? null,
    },
  })

  return NextResponse.json(field, { status: 201 })
}
