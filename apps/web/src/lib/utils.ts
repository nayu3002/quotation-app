import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) return formatDate(date)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateQuoteNumber(format: string, seq: number, year?: number): string {
  const y = year ?? new Date().getFullYear()
  const seqStr = String(seq).padStart(4, '0')
  return format
    .replace('{YEAR}', String(y))
    .replace('{SEQ}', seqStr)
    .replace('{MM}', String(new Date().getMonth() + 1).padStart(2, '0'))
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}...`
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'status-draft',
    sent: 'status-sent',
    viewed: 'status-viewed',
    signed: 'status-signed',
    expired: 'status-expired',
    won: 'status-won',
    lost: 'status-lost',
    invoiced: 'status-invoiced',
    paid: 'status-paid',
    open: 'status-sent',
    pending: 'status-draft',
    active: 'status-signed',
  }
  return map[status] ?? 'status-draft'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    negotiating: 'Negotiating',
    awaiting_signature: 'Awaiting Signature',
    signed: 'Signed',
    invoiced: 'Invoiced',
    paid: 'Paid',
    won: 'Won',
    lost: 'Lost',
    expired: 'Expired',
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

export function getIndustryLabel(industry: string): string {
  const map: Record<string, string> = {
    generic: 'General',
    construction: 'Construction',
    manufacturing: 'Manufacturing',
    it: 'IT & Managed Services',
    creative: 'Creative Agency',
    professional: 'Professional Services',
    healthcare: 'Healthcare',
    retail: 'Retail & Wholesale',
    logistics: 'Logistics',
    solar: 'Solar & Energy',
    events: 'Events & Hospitality',
    education: 'Education & Training',
  }
  return map[industry] ?? industry
}

export function getTerminology(industry: string): Record<string, string> {
  const defaults = {
    quote: 'Quote',
    quotes: 'Quotes',
    project: 'Project',
    projects: 'Projects',
    client: 'Client',
    clients: 'Clients',
  }

  const overrides: Record<string, Record<string, string>> = {
    construction: { quote: 'Estimate', quotes: 'Estimates', project: 'Job', projects: 'Jobs' },
    legal: { quote: 'Engagement Letter', quotes: 'Engagement Letters', project: 'Matter', projects: 'Matters' },
    professional: { quote: 'Proposal', quotes: 'Proposals', project: 'Engagement', projects: 'Engagements' },
    creative: { quote: 'Proposal', quotes: 'Proposals', project: 'Scope of Work', projects: 'Projects' },
    healthcare: { quote: 'Treatment Plan', quotes: 'Treatment Plans', client: 'Patient', clients: 'Patients' },
    education: { quote: 'Course Proposal', quotes: 'Course Proposals', client: 'Student', clients: 'Students' },
  }

  return { ...defaults, ...(overrides[industry] ?? {}) }
}
