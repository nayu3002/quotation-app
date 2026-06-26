import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  quoteId: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assignedToId = searchParams.get('assignedTo')

  const where: any = { organizationId: member.organizationId, deletedAt: null }
  if (status) where.status = status
  if (priority) where.priority = priority
  if (assignedToId) where.assignedToId = assignedToId

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: {
      contact: { select: { firstName: true, lastName: true } },
      company: { select: { name: true } },
      assignedTo: { select: { name: true, email: true } },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  })

  return NextResponse.json({ data: tickets })
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
  const parsed = CreateTicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Compute SLA deadline based on priority
  const slaHours: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 72 }
  const slaDeadline = new Date()
  slaDeadline.setHours(slaDeadline.getHours() + (slaHours[parsed.data.priority] ?? 24))

  const ticket = await prisma.supportTicket.create({
    data: {
      ...parsed.data,
      organizationId: member.organizationId,
      slaDeadline,
      source: 'portal',
    },
  })

  return NextResponse.json({ data: ticket }, { status: 201 })
}
