import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import prisma from '@/lib/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Get user's organization membership
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null, inviteStatus: 'accepted' },
    include: {
      organization: true,
      role: true,
    },
  })

  if (!member) redirect('/onboarding')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar
        org={member.organization}
        role={member.role}
        user={{ id: user.id, email: user.email ?? '' }}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          user={{ id: user.id, email: user.email ?? '' }}
          org={member.organization}
        />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
