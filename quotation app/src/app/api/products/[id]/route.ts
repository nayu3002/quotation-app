import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { name, description } = await req.json()
  const existing = await prisma.productType.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const product = await prisma.productType.update({
    where: { id },
    data: { name, description: description || null },
  })
  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.productType.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.productType.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
