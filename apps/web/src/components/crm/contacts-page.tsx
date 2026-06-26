'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, Mail, Phone, Building2, FileText, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Contact {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  role: string | null
  source: string | null
  createdAt: string
  company: { id: string; name: string } | null
  quoteCount: number
}

interface CRMContactsPageProps {
  contacts: Contact[]
  total: number
  page: number
  take: number
}

export function CRMContactsPage({ contacts, total, page, take }: CRMContactsPageProps) {
  const [search, setSearch] = useState('')
  const totalPages = Math.ceil(total / take)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
            Import CSV
          </button>
          <Link href="/crm/contacts/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            Add Contact
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Users size={36} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">Add your clients and prospects to build a powerful CRM.</p>
          <Link href="/crm/contacts/new"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            Add First Contact
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Contact', 'Company', 'Email', 'Phone', 'Quotes', 'Added', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map(contact => (
                <tr key={contact.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {contact.firstName.charAt(0)}{contact.lastName?.charAt(0) ?? ''}
                      </div>
                      <div>
                        <Link href={`/crm/contacts/${contact.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                          {contact.firstName} {contact.lastName ?? ''}
                        </Link>
                        {contact.role && <p className="text-xs text-muted-foreground mt-0.5">{contact.role}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {contact.company ? (
                      <Link href={`/crm/companies/${contact.company.id}`}
                        className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors">
                        <Building2 size={13} className="text-muted-foreground" />
                        {contact.company.name}
                      </Link>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail size={13} />
                        {contact.email}
                      </a>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Phone size={13} />
                        {contact.phone}
                      </a>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <FileText size={13} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{contact.quoteCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">{formatRelativeTime(contact.createdAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/crm/contacts/${contact.id}/edit`}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <Edit size={13} />
                      </Link>
                      <button className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground">Showing {(page - 1) * take + 1}–{Math.min(page * take, total)} of {total}</p>
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
