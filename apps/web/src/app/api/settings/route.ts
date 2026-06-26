import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(ctx.org)
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, gstNumber, phone, email, address } = await req.json()

  const org = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: {
      name: name || ctx.org.name,
      gstNumber: gstNumber || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
    },
  })

  return NextResponse.json(org)
}
