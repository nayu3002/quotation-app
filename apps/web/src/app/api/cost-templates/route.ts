import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

// GET: Fetch cost templates for a product size
// POST: Upsert cost template for a size (create or update)
export async function GET(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productTypeId = searchParams.get('productTypeId')

  const templates = await prisma.sizeCostTemplate.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(productTypeId ? { productSize: { productTypeId } } : {}),
    },
    include: {
      productSize: { include: { productType: true } },
      customValues: { include: { customCostField: true } },
    },
    orderBy: { productSize: { sortOrder: 'asc' } },
  })

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    productSizeId,
    fabricAvg,
    fabricRate,
    stitchingCost,
    matchingCost,
    labelCost,
    extraCost,
    profitMultiplier,
    roundOff,
    customValues = [], // [{ customCostFieldId, value }]
  } = body

  if (!productSizeId) {
    return NextResponse.json({ error: 'productSizeId is required' }, { status: 400 })
  }

  // Verify size belongs to org
  const size = await prisma.productSize.findFirst({
    where: { id: productSizeId, organizationId: ctx.organizationId },
  })
  if (!size) return NextResponse.json({ error: 'Size not found' }, { status: 404 })

  // Upsert the template
  const template = await prisma.sizeCostTemplate.upsert({
    where: { productSizeId_organizationId: { productSizeId, organizationId: ctx.organizationId } },
    create: {
      productSizeId,
      fabricAvg: fabricAvg ?? 0,
      fabricRate: fabricRate ?? 0,
      stitchingCost: stitchingCost ?? 0,
      matchingCost: matchingCost ?? 0,
      labelCost: labelCost ?? 0,
      extraCost: extraCost ?? 0,
      profitMultiplier: profitMultiplier ?? 1.2,
      roundOff: roundOff ?? true,
      organizationId: ctx.organizationId,
    },
    update: {
      fabricAvg: fabricAvg ?? 0,
      fabricRate: fabricRate ?? 0,
      stitchingCost: stitchingCost ?? 0,
      matchingCost: matchingCost ?? 0,
      labelCost: labelCost ?? 0,
      extraCost: extraCost ?? 0,
      profitMultiplier: profitMultiplier ?? 1.2,
      roundOff: roundOff ?? true,
    },
  })

  // Upsert custom values
  if (customValues.length > 0) {
    await Promise.all(
      customValues.map(({ customCostFieldId, value, textValue }: { customCostFieldId: string; value: number; textValue?: string | null }) =>
        prisma.sizeCostTemplateCustomValue.upsert({
          where: { sizeCostTemplateId_customCostFieldId: { sizeCostTemplateId: template.id, customCostFieldId } },
          create: { 
            sizeCostTemplateId: template.id, 
            customCostFieldId, 
            value,
            textValue: textValue ?? null
          },
          update: { 
            value,
            textValue: textValue ?? null
          },
        })
      )
    )
  }

  const result = await prisma.sizeCostTemplate.findUnique({
    where: { id: template.id },
    include: { customValues: { include: { customCostField: true } } },
  })

  return NextResponse.json(result, { status: 201 })
}
