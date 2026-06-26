import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const OrgUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  primaryColor: z.string().optional(),
  defaultCurrency: z.string().optional(),
  quoteNumberFormat: z.string().optional(),
  logoUrl: z.string().url().optional(),
  fontFamily: z.string().optional(),
  accentColor: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { role: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only admin/owner can change settings
  const allowedRoles = ['Owner', 'Admin']
  if (!allowedRoles.includes(member.role.name)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = OrgUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.organization.update({
    where: { id: member.organizationId },
    data: parsed.data,
  })

  await prisma.activityLog.create({
    data: {
      organizationId: member.organizationId,
      entityType: 'organization',
      entityId: member.organizationId,
      userId: user.id,
      action: 'settings_updated',
      description: 'Organization settings updated',
    },
  })

  return NextResponse.json({ data: updated })
}
