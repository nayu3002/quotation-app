import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'
import { calculateLineItem, calculateQuotationTotals } from '@/lib/calc'

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const quotations = await prisma.quotation.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(customerId && customerId !== 'all' ? { customerId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(search ? {
        OR: [
          { quotationNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        }
      } : {}),
    },
    include: {
      customer: true,
      lineItems: {
        include: {
          productType: true,
          productSize: true,
          customValues: { include: { customCostField: true } },
        },
      },
      pdfRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(quotations)
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerId, gstPercentage = 18, notes, terms, lineItems } = body

  if (!customerId) return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  if (!lineItems || lineItems.length === 0) return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })

  // Verify customer belongs to org
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: ctx.organizationId } })
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Generate quotation number
  const count = await prisma.quotation.count({ where: { organizationId: ctx.organizationId } })
  const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  // Calculate all line items using the engine
  const calculatedLineItems = lineItems.map((item: {
    productTypeId: string
    productSizeId: string
    quantity: number
    fabricAvg: number
    fabricRate: number
    stitchingCost: number
    matchingCost: number
    labelCost: number
    extraCost: number
    profitMultiplier: number
    roundOff: boolean
    customValues?: Array<{ customCostFieldId: string; name: string; isMultiplier: boolean; value: number; type?: string; textValue?: string }>
  }) => {
    const customFields = (item.customValues || []).map((cv) => ({
      id: cv.customCostFieldId,
      name: cv.name,
      type: cv.type || 'numeric',
      isMultiplier: cv.isMultiplier,
      value: Number(cv.value) || 0,
      textValue: cv.textValue || null,
    }))

    const calc = calculateLineItem({
      fabricAvg: Number(item.fabricAvg),
      fabricRate: Number(item.fabricRate),
      stitchingCost: Number(item.stitchingCost),
      matchingCost: Number(item.matchingCost),
      labelCost: Number(item.labelCost),
      extraCost: Number(item.extraCost),
      profitMultiplier: Number(item.profitMultiplier),
      roundOff: item.roundOff ?? true,
      quantity: Number(item.quantity),
      customFields,
    })

    return { ...item, calc }
  })

  const totals = calculateQuotationTotals(
    calculatedLineItems.map((li: { calc: { totalPrice: number } }) => li.calc.totalPrice),
    Number(gstPercentage)
  )

  // Save to DB in a transaction
  const quotation = await prisma.$transaction(async (tx) => {
    const q = await tx.quotation.create({
      data: {
        customerId,
        quotationNumber,
        notes: notes || null,
        terms: terms || null,
        gstPercentage,
        subtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        total: totals.total,
        organizationId: ctx.organizationId,
      },
    })

    await Promise.all(
      calculatedLineItems.map(async (item: {
        productTypeId: string
        productSizeId: string
        quantity: number
        fabricAvg: number
        fabricRate: number
        stitchingCost: number
        matchingCost: number
        labelCost: number
        extraCost: number
        profitMultiplier: number
        roundOff: boolean
        customValues?: Array<{ customCostFieldId: string; value: number; textValue?: string | null }>
        calc: { fabricCost: number; pricePerPiece: number; totalPrice: number }
      }) => {
        const li = await tx.quotationLineItem.create({
          data: {
            quotationId: q.id,
            productTypeId: item.productTypeId,
            productSizeId: item.productSizeId,
            quantity: item.quantity,
            fabricAvg: item.fabricAvg,
            fabricRate: item.fabricRate,
            fabricCost: item.calc.fabricCost,
            stitchingCost: item.stitchingCost,
            matchingCost: item.matchingCost,
            labelCost: item.labelCost,
            extraCost: item.extraCost,
            profitMultiplier: item.profitMultiplier,
            roundOff: item.roundOff ?? true,
            pricePerPiece: item.calc.pricePerPiece,
            totalPrice: item.calc.totalPrice,
          },
        })

        if (item.customValues && item.customValues.length > 0) {
          await tx.quotationLineItemCustomValue.createMany({
            data: item.customValues.map((cv) => ({
              quotationLineItemId: li.id,
              customCostFieldId: cv.customCostFieldId,
              value: cv.value,
              textValue: cv.textValue || null,
            })),
          })
        }
      })
    )

    return q
  })

  const result = await prisma.quotation.findUnique({
    where: { id: quotation.id },
    include: {
      customer: true,
      lineItems: {
        include: {
          productType: true,
          productSize: true,
          customValues: { include: { customCostField: true } },
        },
      },
    },
  })

  return NextResponse.json(result, { status: 201 })
}
