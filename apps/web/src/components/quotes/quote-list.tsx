'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, FileText, Eye, Edit, Send, MoreHorizontal,
  CheckCircle, Clock, XCircle, Kanban, List, SlidersHorizontal } from 'lucide-react'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface Quote {
  id: string
  quoteNumber: string | null
  title: string
  status: string
  total: number
  currency: string
  createdAt: string
  expiresAt: string | null
  contact: { firstName: string; lastName: string | null } | null
  company: { name: string } | null
  createdBy: { name: string | null; email: string }
}

interface QuoteListProps {
  quotes: Quote[]
  total: number
  page: number
  take: number
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'signed', label: 'Signed' },
  { value: 'expired', label: 'Expired' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export function QuoteList({ quotes, total, page, take }: QuoteListProps) {
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatus, setActiveStatus] = useState('')

  const totalPages = Math.ceil(total / take)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} quotes total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setView('kanban')}
              className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
              <Kanban size={16} />
            </button>
          </div>
          <Link href="/quotes/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            New Quote
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, number, or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          <SlidersHorizontal size={16} />
          Filters
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeStatus === tab.value
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quote Table */}
      {quotes.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <FileText size={36} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No quotes yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Create your first professional quote and start winning business today.
          </p>
          <Link href="/quotes/new"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            Create Your First Quote
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Quote', 'Client', 'Status', 'Total', 'Created', 'Expires', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map(quote => (
                <tr key={quote.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <Link href={`/quotes/${quote.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                        {quote.title}
                      </Link>
                      {quote.quoteNumber && (
                        <p className="text-xs text-muted-foreground mt-0.5">{quote.quoteNumber}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">
                      {quote.company?.name ?? (quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName ?? ''}` : '—')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(quote.total, quote.currency)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">{formatDate(quote.createdAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">
                      {quote.expiresAt ? formatDate(quote.expiresAt) : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/quotes/${quote.id}`}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="View">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/quotes/${quote.id}/edit`}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Edit size={14} />
                      </Link>
                      {quote.status === 'draft' && (
                        <button className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors" title="Send">
                          <Send size={14} />
                        </button>
                      )}
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * take + 1}–{Math.min(page * take, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link
                    key={p}
                    href={`?page=${p}`}
                    className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-colors ${
                      p === page ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
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
