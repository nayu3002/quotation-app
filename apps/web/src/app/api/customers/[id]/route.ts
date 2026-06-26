import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { name, phone, email, address } = body

  const existing = await prisma.customer.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const customer = await prisma.customer.update({
    where: { id },
    data: { name, phone: phone || null, email: email || null, address: address || null },
  })

  return NextResponse.json(customer)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.customer.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.customer.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
