import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  companyId: z.string().optional(),
  preferredLang: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search')

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: member.organizationId,
      deletedAt: null,
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      quotes: { select: { id: true, status: true, total: true }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: contacts })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = ContactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const contact = await prisma.contact.create({
    data: { ...parsed.data, organizationId: member.organizationId },
  })

  return NextResponse.json({ data: contact }, { status: 201 })
}
