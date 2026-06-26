import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, company, gstin, phone, email, address } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const customer = await prisma.customer.create({
    data: {
      name,
      company: company || null,
      gstin: gstin || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      organizationId: ctx.organizationId,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}
