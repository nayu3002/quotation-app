import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { name, type, isMultiplier, defaultValue, sortOrder, isActive } = await req.json()

  const existing = await prisma.customCostField.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const field = await prisma.customCostField.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(isMultiplier !== undefined ? { isMultiplier } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  })

  return NextResponse.json(field)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.customCostField.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.customCostField.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
