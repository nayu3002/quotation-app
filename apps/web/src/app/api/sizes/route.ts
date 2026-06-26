import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productTypeId = searchParams.get('productTypeId')

  const sizes = await prisma.productSize.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(productTypeId ? { productTypeId } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      productType: true,
      sizeCostTemplates: {
        include: { customValues: { include: { customCostField: true } } },
      },
    },
  })

  return NextResponse.json(sizes)
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productTypeId, sizeLabel, sortOrder } = await req.json()
  if (!productTypeId || !sizeLabel) {
    return NextResponse.json({ error: 'productTypeId and sizeLabel are required' }, { status: 400 })
  }

  // Verify product type belongs to org
  const product = await prisma.productType.findFirst({
    where: { id: productTypeId, organizationId: ctx.organizationId },
  })
  if (!product) return NextResponse.json({ error: 'Product type not found' }, { status: 404 })

  const size = await prisma.productSize.create({
    data: {
      productTypeId,
      sizeLabel,
      sortOrder: sortOrder ?? 0,
      organizationId: ctx.organizationId,
    },
    include: { productType: true },
  })

  return NextResponse.json(size, { status: 201 })
}
