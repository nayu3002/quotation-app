'use client'

import { BarChart3, Building2, Users, FileText, Globe, Shield, TrendingUp, Activity,
  Search, Filter, Eye, Pause, Play, Trash2, MoreHorizontal, ChevronRight, Zap } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

interface SuperAdminDashboardProps {
  stats: { totalOrgs: number; activeOrgs: number; totalUsers: number; totalQuotes: number }
  recentOrgs: {
    id: string; name: string; status: string; industry: string; createdAt: string
    plan: string; memberCount: number; quoteCount: number
  }[]
}

const PLAN_COLORS: Record<string, string> = {
  Free: '#64748b', Starter: '#06b6d4', Professional: '#7c5cfc', Business: '#f59e0b', Enterprise: '#10b981',
}

export function SuperAdminDashboard({ stats, recentOrgs }: SuperAdminDashboardProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-bold text-foreground">QuoteFlow Super Admin</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">GOD MODE</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/super-admin/orgs" className="hover:text-foreground transition-colors">Organizations</Link>
            <Link href="/super-admin/billing" className="hover:text-foreground transition-colors">Billing</Link>
            <Link href="/super-admin/support" className="hover:text-foreground transition-colors">Support</Link>
            <Link href="/super-admin/health" className="hover:text-foreground transition-colors">Health</Link>
            <Link href="/super-admin/revenue" className="hover:text-foreground transition-colors">Revenue</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete visibility across all tenants</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Organizations', value: stats.totalOrgs, icon: Building2, color: '#7c5cfc', sub: `${stats.activeOrgs} active` },
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#06b6d4', sub: 'across all orgs' },
            { label: 'Total Quotes', value: stats.totalQuotes, icon: FileText, color: '#10b981', sub: 'all time' },
            { label: 'Platform MRR', value: '$24,800', icon: TrendingUp, color: '#f59e0b', sub: '+18% MoM' },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.color + '20' }}>
                  <kpi.icon size={20} style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
              <p className="text-xs" style={{ color: kpi.color }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Organizations Table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="font-semibold text-foreground">Organizations</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input placeholder="Search orgs..." className="pl-8 pr-3 py-2 text-xs rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none" />
              </div>
              <Link href="/super-admin/orgs"
                className="text-xs px-3 py-2 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                View all →
              </Link>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Organization', 'Plan', 'Industry', 'Members', 'Quotes', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrgs.map(org => (
                <tr key={org.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {org.name.charAt(0)}
                      </div>
                      <p className="text-sm font-medium text-foreground">{org.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: (PLAN_COLORS[org.plan] ?? '#64748b') + '20', color: PLAN_COLORS[org.plan] ?? '#64748b' }}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4"><p className="text-sm text-muted-foreground capitalize">{org.industry}</p></td>
                  <td className="px-6 py-4"><p className="text-sm text-foreground">{org.memberCount}</p></td>
                  <td className="px-6 py-4"><p className="text-sm text-foreground">{org.quoteCount}</p></td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4"><p className="text-sm text-muted-foreground">{formatRelativeTime(org.createdAt)}</p></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/super-admin/orgs/${org.id}`}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Impersonate">
                        <Eye size={13} />
                      </Link>
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Feature Flags', desc: 'Toggle features per org or globally', icon: Zap, color: '#7c5cfc', href: '/super-admin/feature-flags' },
            { title: 'Platform Health', desc: 'API response times, error rates, queue status', icon: Activity, color: '#10b981', href: '/super-admin/health' },
            { title: 'Broadcast', desc: 'Send announcements to all organizations', icon: Globe, color: '#f59e0b', href: '/super-admin/announcements' },
          ].map(item => (
            <Link key={item.title} href={item.href}
              className="glass-card p-6 hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.color + '20' }}>
                <item.icon size={22} style={{ color: item.color }} />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground ml-auto" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
