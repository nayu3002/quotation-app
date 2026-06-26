import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

interface SizeRow {
  sizeLabel: string
  sortOrder?: number
  fabricAvg?: number
  fabricRate?: number
  stitchingCost?: number
  matchingCost?: number
  labelCost?: number
  extraCost?: number
  profitMultiplier?: number
  roundOff?: boolean
  customValues?: any[]
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: productTypeId } = await params
  const { sizes } = await req.json() as { sizes: SizeRow[] }

  if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
    return NextResponse.json({ error: 'sizes array is required' }, { status: 400 })
  }

  // Verify product belongs to org
  const product = await prisma.productType.findFirst({
    where: { id: productTypeId, organizationId: ctx.organizationId },
  })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const results = await prisma.$transaction(async (tx) => {
    const created = []
    for (const row of sizes) {
      if (!row.sizeLabel?.trim()) continue

      // Upsert the size
      const size = await tx.productSize.upsert({
        where: {
          productTypeId_sizeLabel: {
            productTypeId,
            sizeLabel: row.sizeLabel.trim(),
          },
        },
        create: {
          productTypeId,
          organizationId: ctx.organizationId,
          sizeLabel: row.sizeLabel.trim(),
          sortOrder: row.sortOrder ?? 0,
        },
        update: {
          sortOrder: row.sortOrder ?? 0,
        },
      })

      // Upsert the cost template
      const hasRates =
        (row.fabricAvg ?? 0) > 0 ||
        (row.fabricRate ?? 0) > 0 ||
        (row.stitchingCost ?? 0) > 0 ||
        (row.matchingCost ?? 0) > 0 ||
        (row.labelCost ?? 0) > 0 ||
        (row.extraCost ?? 0) > 0 ||
        (row.customValues && row.customValues.length > 0)

      if (hasRates || row.profitMultiplier !== undefined) {
        const template = await tx.sizeCostTemplate.upsert({
          where: {
            productSizeId_organizationId: {
              productSizeId: size.id,
              organizationId: ctx.organizationId,
            },
          },
          create: {
            productSizeId: size.id,
            organizationId: ctx.organizationId,
            fabricAvg: row.fabricAvg ?? 0,
            fabricRate: row.fabricRate ?? 0,
            stitchingCost: row.stitchingCost ?? 0,
            matchingCost: row.matchingCost ?? 0,
            labelCost: row.labelCost ?? 0,
            extraCost: row.extraCost ?? 0,
            profitMultiplier: row.profitMultiplier ?? 1.2,
            roundOff: row.roundOff ?? true,
          },
          update: {
            fabricAvg: row.fabricAvg ?? 0,
            fabricRate: row.fabricRate ?? 0,
            stitchingCost: row.stitchingCost ?? 0,
            matchingCost: row.matchingCost ?? 0,
            labelCost: row.labelCost ?? 0,
            extraCost: row.extraCost ?? 0,
            profitMultiplier: row.profitMultiplier ?? 1.2,
            roundOff: row.roundOff ?? true,
          },
        })

        if (row.customValues && row.customValues.length > 0) {
          for (const cv of row.customValues) {
            await tx.sizeCostTemplateCustomValue.upsert({
              where: {
                sizeCostTemplateId_customCostFieldId: {
                  sizeCostTemplateId: template.id,
                  customCostFieldId: cv.customCostFieldId,
                },
              },
              create: {
                sizeCostTemplateId: template.id,
                customCostFieldId: cv.customCostFieldId,
                value: cv.value ?? 0,
                // @ts-ignore
                textValue: cv.textValue ?? null,
              },
              update: {
                value: cv.value ?? 0,
                // @ts-ignore
                textValue: cv.textValue ?? null,
              },
            })
          }
        }
      }

      created.push(size)
    }
    return created
  }, {
    timeout: 30000
  })

  return NextResponse.json({ created: results.length, sizes: results })
}
