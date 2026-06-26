'use client'

import { formatCurrency, formatRelativeTime, getStatusColor, getStatusLabel } from '@/lib/utils'
import { TrendingUp, FileText, CheckCircle, DollarSign, ArrowUpRight, Plus, MoreHorizontal, Eye } from 'lucide-react'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardHomeProps {
  org: { name: string; industry: string; defaultCurrency: string; primaryColor?: string | null }
  kpis: {
    totalQuotes: number
    sentQuotes: number
    signedQuotes: number
    winRate: number
    totalInvoiced: number
    pipelineByStatus: { status: string; _count: { id: number }; _sum: { total: any } }[]
  }
  recentQuotes: {
    id: string
    quoteNumber: string | null
    title: string
    status: string
    total: number
    currency: string
    createdAt: string
    contact: { firstName: string; lastName: string | null } | null
    company: { name: string } | null
  }[]
}

const AREA_DATA = [
  { month: 'Jan', quotes: 12, revenue: 48000 },
  { month: 'Feb', quotes: 19, revenue: 72000 },
  { month: 'Mar', quotes: 15, revenue: 58000 },
  { month: 'Apr', quotes: 24, revenue: 95000 },
  { month: 'May', quotes: 28, revenue: 112000 },
  { month: 'Jun', quotes: 22, revenue: 88000 },
]

const PIPELINE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export function DashboardHome({ org, kpis, recentQuotes }: DashboardHomeProps) {
  const currency = org.defaultCurrency ?? 'USD'
  const color = org.primaryColor ?? '#7c5cfc'

  const pieData = kpis.pipelineByStatus.map(s => ({
    name: getStatusLabel(s.status),
    value: s._count.id,
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {getGreeting()}, {org.name} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening in your pipeline today.
          </p>
        </div>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:shadow-glow hover:-translate-y-0.5"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          <Plus size={16} />
          New Quote
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Quotes',
            value: kpis.totalQuotes,
            icon: FileText,
            trend: '+12%',
            trendUp: true,
            color: '#6366f1',
          },
          {
            label: 'Quotes Sent',
            value: kpis.sentQuotes,
            icon: TrendingUp,
            trend: '+8%',
            trendUp: true,
            color: '#06b6d4',
          },
          {
            label: 'Win Rate',
            value: `${kpis.winRate}%`,
            icon: CheckCircle,
            trend: '+3%',
            trendUp: true,
            color: '#10b981',
          },
          {
            label: 'Total Invoiced',
            value: formatCurrency(kpis.totalInvoiced, currency),
            icon: DollarSign,
            trend: '+18%',
            trendUp: true,
            color: '#f59e0b',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${kpi.color}20` }}
              >
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${kpi.trendUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
              >
                <ArrowUpRight size={10} />
                {kpi.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue Overview</h3>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <select className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-muted-foreground">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={AREA_DATA}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,47%,16%)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,47%,16%)', borderRadius: '8px', color: '#e2e8f0' }}
                formatter={(v: number) => [`$${(v / 1000).toFixed(1)}k`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Distribution */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground">Pipeline Status</h3>
            <p className="text-xs text-muted-foreground">By quote count</p>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIPELINE_COLORS[i % PIPELINE_COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FileText size={32} className="text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No quotes yet</p>
              <Link href="/quotes/new" className="text-xs text-primary hover:underline mt-1">Create your first quote</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="glass-card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Quotes</h3>
          <Link href="/quotes" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <FileText size={28} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No quotes yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first quote to start winning business</p>
              <Link
                href="/quotes/new"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                <Plus size={14} />
                Create Quote
              </Link>
            </div>
          ) : (
            recentQuotes.map((quote) => (
              <div key={quote.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{quote.title}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {quote.quoteNumber && <span className="text-primary/70">{quote.quoteNumber} · </span>}
                      {quote.company?.name ?? (quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName ?? ''}` : 'No client')}
                    </p>
                    <span className="text-muted-foreground/40">·</span>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(quote.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(quote.total, quote.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Eye size={14} />
                  </Link>
                  <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
