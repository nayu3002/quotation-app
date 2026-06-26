'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, DollarSign, Target, Trophy, ArrowUpRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AnalyticsDashboardProps {
  currency: string
  pipelineByStatus: { status: string; count: number; total: number }[]
  monthlyRevenue: { month: string; revenue: number; quotes: number }[]
  topProducts: { name: string; revenue: number; count: number }[]
  winRate: number
  won: number
  lost: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', sent: '#06b6d4', viewed: '#8b5cf6', negotiating: '#f59e0b',
  signed: '#10b981', won: '#10b981', lost: '#ef4444', expired: '#94a3b8', cancelled: '#ef4444',
}

const CHART_COLORS = ['#7c5cfc', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function AnalyticsDashboard({ currency, pipelineByStatus, monthlyRevenue, topProducts, winRate, won, lost }: AnalyticsDashboardProps) {
  const totalPipelineValue = pipelineByStatus.reduce((s, i) => s + i.total, 0)
  const totalQuotes = pipelineByStatus.reduce((s, i) => s + i.count, 0)
  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.name === 'revenue' ? formatCurrency(p.value, currency) : p.value}</p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Business performance overview</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value', value: formatCurrency(totalPipelineValue, currency), icon: DollarSign, color: '#7c5cfc', trend: 'Total open pipeline' },
          { label: 'Total Quotes', value: totalQuotes, icon: Target, color: '#06b6d4', trend: 'All time' },
          { label: 'Win Rate', value: `${winRate}%`, icon: Trophy, color: '#10b981', trend: `${won} won, ${lost} lost` },
          { label: 'Revenue (6mo)', value: formatCurrency(totalRevenue, currency), icon: TrendingUp, color: '#f59e0b', trend: 'Last 6 months' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.color + '20' }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <ArrowUpRight size={14} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
            <p className="text-xs mt-1" style={{ color: kpi.color }}>{kpi.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-2 glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Revenue — Last 6 Months</h3>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyRevenue} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="revenue" fill="#7c5cfc" radius={[6, 6, 0, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
              No revenue data yet. Send your first quote!
            </div>
          )}
        </div>

        {/* Pipeline by Status */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Pipeline by Status</h3>
          {pipelineByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pipelineByStatus} dataKey="count" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {pipelineByStatus.map((entry, index) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pipelineByStatus.map((item, i) => (
                  <div key={item.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[item.status] ?? CHART_COLORS[i] }} />
                      <span className="text-muted-foreground capitalize">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-medium">{item.count}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.total, currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No pipeline data</div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">Top Products / Services by Revenue</h3>
        {topProducts.length > 0 ? (
          <div className="space-y-3">
            {topProducts.map((product, i) => {
              const maxRevenue = topProducts[0]?.revenue ?? 1
              const pct = (product.revenue / maxRevenue) * 100
              return (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="w-5 text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, '0')}</div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-foreground font-medium truncate max-w-[300px]">{product.name}</span>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{product.count}×</span>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(product.revenue, currency)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">No product data yet. Create quotes with line items to see performance.</div>
        )}
      </div>
    </div>
  )
}
