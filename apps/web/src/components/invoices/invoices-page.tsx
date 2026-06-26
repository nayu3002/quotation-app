'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Receipt, Plus, Search, Download, Send, Eye, MoreHorizontal, DollarSign,
  CheckCircle, Clock, AlertCircle, CreditCard } from 'lucide-react'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string | null
  title: string
  status: string
  total: number
  amountPaid: number
  amountDue: number
  currency: string
  createdAt: string
  dueDate: string | null
  paidAt: string | null
  contact: { firstName: string; lastName: string | null } | null
  company: { name: string } | null
  quote: { quoteNumber: string | null } | null
  payments: { amount: number; status: string }[]
}

interface InvoicesPageProps {
  invoices: Invoice[]
  total: number
  page: number
  take: number
  summary: { total: number; paid: number; outstanding: number }
  currency: string
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
]

export function InvoicesPage({ invoices, total, page, take, summary, currency }: InvoicesPageProps) {
  const [activeStatus, setActiveStatus] = useState('')
  const [search, setSearch] = useState('')

  const totalPages = Math.ceil(total / take)

  const isOverdue = (inv: Invoice) =>
    inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paid' && inv.status !== 'void'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} invoices total</p>
        </div>
        <Link href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
          <Plus size={16} />
          New Invoice
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', value: summary.total, icon: Receipt, color: '#7c5cfc' },
          { label: 'Total Paid', value: summary.paid, icon: CheckCircle, color: '#10b981' },
          { label: 'Outstanding', value: summary.outstanding, icon: AlertCircle, color: '#f59e0b' },
        ].map(item => (
          <div key={item.label} className="kpi-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: item.color + '20' }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(item.value, currency)}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setActiveStatus(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeStatus === tab.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Receipt size={36} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No invoices yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Convert a signed quote to an invoice or create one manually.
          </p>
          <Link href="/invoices/new"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            Create Invoice
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Invoice', 'Client', 'Status', 'Amount', 'Due Date', 'Paid', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(inv => (
                <tr key={inv.id} className={`hover:bg-accent/20 transition-colors ${isOverdue(inv) ? 'bg-red-500/5' : ''}`}>
                  <td className="px-6 py-4">
                    <div>
                      <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                        {inv.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {inv.invoiceNumber && <p className="text-xs text-muted-foreground">{inv.invoiceNumber}</p>}
                        {inv.quote?.quoteNumber && (
                          <span className="text-xs text-muted-foreground/60">← {inv.quote.quoteNumber}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">
                      {inv.company?.name ?? (inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName ?? ''}` : '—')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit ${getStatusColor(inv.status)}`}>
                        {getStatusLabel(inv.status)}
                      </span>
                      {isOverdue(inv) && (
                        <span className="text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle size={10} /> Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.total, inv.currency)}</p>
                    {inv.amountDue > 0 && inv.status !== 'paid' && (
                      <p className="text-xs text-yellow-400 mt-0.5">{formatCurrency(inv.amountDue, inv.currency)} due</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className={`text-sm ${isOverdue(inv) ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">
                      {inv.paidAt ? formatDate(inv.paidAt) : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/invoices/${inv.id}`}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="View">
                        <Eye size={14} />
                      </Link>
                      {inv.status !== 'paid' && (
                        <button className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors" title="Send payment link">
                          <Send size={14} />
                        </button>
                      )}
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Download PDF">
                        <Download size={14} />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * take + 1}–{Math.min(page * take, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link key={p} href={`?page=${p}`}
                    className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-colors ${p === page ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'}`}>
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
