import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      customer: true,
      lineItems: {
        include: {
          productType: true,
          productSize: true,
          customValues: { include: { customCostField: true } },
        },
        orderBy: { productSize: { sortOrder: 'asc' } },
      },
      pdfRecords: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  const organization = await prisma.organization.findUnique({ where: { id: ctx.organizationId } })

  return NextResponse.json({ ...quotation, organization })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.quotation.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { status, notes } = await req.json()
  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  })

  return NextResponse.json(quotation)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.quotation.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.quotation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
