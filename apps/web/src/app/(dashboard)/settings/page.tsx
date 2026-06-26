import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SettingsPage } from '@/components/settings/settings-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: {
      organization: {
        include: {
          plan: true,
          members: {
            where: { deletedAt: null },
            include: { role: { select: { name: true } } },
          },
        },
      },
      role: true,
    },
  })
  if (!member) redirect('/onboarding')

  return (
    <SettingsPage
      org={{
        id: member.organization.id,
        name: member.organization.name,
        industry: member.organization.industry,
        email: member.organization.email,
        phone: member.organization.phone,
        website: member.organization.website,
        address: member.organization.address,
        logoUrl: member.organization.logoUrl,
        primaryColor: member.organization.primaryColor,
        defaultCurrency: member.organization.defaultCurrency,
        quoteNumberFormat: member.organization.quoteNumberFormat,
        plan: member.organization.plan ? {
          name: member.organization.plan.name,
          tier: member.organization.plan.tier,
          maxUsers: member.organization.plan.maxUsers,
          maxQuotesPerMonth: member.organization.plan.maxQuotesPerMonth,
          aiCreditsPerMonth: member.organization.plan.aiCreditsPerMonth,
        } : null,
        memberCount: member.organization.members.length,
        members: member.organization.members.map(m => ({
          id: m.id,
          userId: m.userId,
          role: m.role.name,
          inviteStatus: m.inviteStatus,
        })),
      }}
      currentUserId={user.id}
      currentRole={member.role.name}
    />
  )
}
