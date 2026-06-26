import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await prisma.productType.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: 'asc' },
    include: {
      productSizes: {
        orderBy: { sortOrder: 'asc' },
        include: {
          sizeCostTemplates: {
            where: { organizationId: ctx.organizationId },
            include: { customValues: true },
          },
        },
      },
    },
  })

  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const product = await prisma.productType.create({
    data: {
      name,
      description: description || null,
      organizationId: ctx.organizationId,
    },
    include: { productSizes: true },
  })

  return NextResponse.json(product, { status: 201 })
}
