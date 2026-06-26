import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.productSize.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.productSize.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { sizeLabel, sortOrder } = await req.json()
  const existing = await prisma.productSize.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const size = await prisma.productSize.update({
    where: { id },
    data: { sizeLabel, sortOrder },
  })
  return NextResponse.json(size)
}
