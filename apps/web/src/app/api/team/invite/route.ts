import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { sendTeamInviteEmail } from '@/lib/email'
import { generateShareToken } from '@/lib/utils'
import { z } from 'zod'

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.string().default('member'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { organization: { select: { name: true, primaryColor: true, plan: true } }, role: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only admin/owner can invite
  if (!['Owner', 'Admin'].includes(member.role.name)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Check user limit
  const currentMembers = await prisma.organizationMember.count({
    where: { organizationId: member.organizationId, deletedAt: null, inviteStatus: 'accepted' },
  })
  const maxUsers = member.organization.plan?.maxUsers ?? 1
  if (maxUsers > 0 && currentMembers >= maxUsers) {
    return NextResponse.json({ error: 'User limit reached. Upgrade your plan.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Get or create role
  let role = await prisma.role.findFirst({
    where: { name: { equals: parsed.data.role, mode: 'insensitive' }, isSystem: true },
  })
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: parsed.data.role,
        permissions: {},
      },
    })
  }

  const inviteToken = generateShareToken()

  // Check if user exists
  const existingUser = await prisma.user.findFirst({ where: { email: parsed.data.email } })

  await prisma.organizationMember.create({
    data: {
      organizationId: member.organizationId,
      userId: existingUser?.id ?? 'pending_' + inviteToken,
      roleId: role.id,
      inviteStatus: 'pending',
      inviteEmail: parsed.data.email,
      inviteToken,
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const inviterUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${inviteToken}`

  await sendTeamInviteEmail({
    to: parsed.data.email,
    inviterName: inviterUser?.name ?? inviterUser?.email ?? 'A team member',
    orgName: member.organization.name,
    orgColor: member.organization.primaryColor ?? undefined,
    role: parsed.data.role,
    inviteUrl,
  })

  return NextResponse.json({ success: true, inviteUrl }, { status: 201 })
}
