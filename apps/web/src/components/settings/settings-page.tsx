'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Users, CreditCard, Bell, Globe, Palette, Shield,
  Save, Check, Loader2, UserPlus, Mail, Trash2, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface SettingsPageProps {
  org: {
    id: string; name: string; industry: string; email: string | null; phone: string | null
    website: string | null; address: string | null; logoUrl: string | null
    primaryColor: string | null; defaultCurrency: string; quoteNumberFormat: string
    plan: { name: string; tier: string; maxUsers: number; maxQuotesPerMonth: number; aiCreditsPerMonth: number } | null
    memberCount: number
    members: { id: string; userId: string; role: string; inviteStatus: string }[]
  }
  currentUserId: string
  currentRole: string
}

const OrgSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  primaryColor: z.string(),
  defaultCurrency: z.string(),
  quoteNumberFormat: z.string(),
})

const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Globe },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'INR', 'AED', 'SGD', 'JPY', 'CHF']

const PLAN_COLORS: Record<string, string> = {
  free: '#64748b', starter: '#06b6d4', professional: '#7c5cfc', business: '#f59e0b', enterprise: '#10b981',
}

export function SettingsPage({ org, currentUserId, currentRole }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(OrgSchema),
    defaultValues: {
      name: org.name,
      email: org.email ?? '',
      phone: org.phone ?? '',
      website: org.website ?? '',
      address: org.address ?? '',
      primaryColor: org.primaryColor ?? '#7c5cfc',
      defaultCurrency: org.defaultCurrency,
      quoteNumberFormat: org.quoteNumberFormat,
    },
  })

  const onSave = async (data: any) => {
    const res = await fetch(`/api/settings/org`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Settings saved!')
    } else {
      toast.error('Failed to save settings')
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) {
        toast.success(`Invite sent to ${inviteEmail}`)
        setInviteEmail('')
      } else {
        toast.error('Failed to send invite')
      }
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}>
                <tab.icon size={16} className="flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* General Tab */}
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit(onSave)} className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4">Organization Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Organization Name *</label>
                  <input {...register('name')} className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message as string}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Business Email</label>
                  <input {...register('email')} type="email" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <input {...register('phone')} type="tel" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Website</label>
                  <input {...register('website')} type="url" placeholder="https://" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-sm font-medium text-foreground">Business Address</label>
                  <textarea {...register('address')} rows={2} className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Default Currency</label>
                  <select {...register('defaultCurrency')} className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none text-sm">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Quote Number Format</label>
                  <input {...register('quoteNumberFormat')} placeholder="QF-{YEAR}-{SEQ}"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                  <p className="text-xs text-muted-foreground">Variables: {'{YEAR}'}, {'{SEQ}'}, {'{MM}'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isSubmitting || !isDirty}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4 mb-5">Invite Team Member</h2>
                <div className="flex gap-3">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="sales">Sales</option>
                    <option value="finance">Finance</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                    style={{ background: '#7c5cfc' }}>
                    {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Invite
                  </button>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                  <p className="text-sm text-muted-foreground mt-1">{org.memberCount} members</p>
                </div>
                <div className="divide-y divide-border">
                  {org.members.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {m.userId.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.userId === currentUserId ? 'You' : 'Member'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{m.inviteStatus}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${m.role === 'Owner' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                          {m.role === 'Owner' && <Crown size={10} className="inline mr-1" />}
                          {m.role}
                        </span>
                        {m.userId !== currentUserId && currentRole === 'Owner' && (
                          <button className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4">Billing & Plan</h2>
              {org.plan && (
                <div className="rounded-xl p-5 border" style={{ borderColor: (PLAN_COLORS[org.plan.tier] ?? '#64748b') + '40', background: (PLAN_COLORS[org.plan.tier] ?? '#64748b') + '08' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{org.plan.name}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full font-semibold capitalize" style={{ background: (PLAN_COLORS[org.plan.tier] ?? '#64748b') + '20', color: PLAN_COLORS[org.plan.tier] ?? '#64748b' }}>
                      {org.plan.tier}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {[
                      { label: 'Users', value: org.plan.maxUsers === 0 ? 'Unlimited' : org.plan.maxUsers },
                      { label: 'Quotes/month', value: org.plan.maxQuotesPerMonth === 0 ? 'Unlimited' : org.plan.maxQuotesPerMonth },
                      { label: 'AI Credits/mo', value: org.plan.aiCreditsPerMonth === 0 ? 'Unlimited' : org.plan.aiCreditsPerMonth },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-muted-foreground">{item.label}</p>
                        <p className="font-semibold text-foreground mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition-colors">
                  View All Plans
                </button>
                <button className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4">Brand Settings</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Brand Color</label>
                  <p className="text-xs text-muted-foreground">Used in client-facing quotes, emails, and portal</p>
                  <div className="flex items-center gap-3 mt-2">
                    <input {...register('primaryColor')} type="color" className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                    <input {...register('primaryColor')} type="text" placeholder="#7c5cfc"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Company Logo</label>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt="Logo" className="h-16 mx-auto mb-3 object-contain" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Building2 size={24} className="text-muted-foreground/40" />
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">Upload PNG, JPG, or SVG (max 2MB)</p>
                    <button className="text-xs px-4 py-2 rounded-lg bg-muted border border-border text-foreground hover:bg-accent transition-colors">
                      Choose File
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleSubmit(onSave)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
                  <Save size={14} />
                  Save Branding
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4">Security</h2>
              <div className="space-y-4">
                {[
                  { title: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account', action: 'Enable 2FA', color: '#10b981' },
                  { title: 'Single Sign-On (SSO)', desc: 'Connect your identity provider (SAML 2.0)', action: 'Configure SSO', color: '#7c5cfc', enterprise: true },
                  { title: 'API Keys', desc: 'Manage API keys for integrations', action: 'Manage Keys', color: '#f59e0b' },
                  { title: 'Audit Log', desc: 'View all account activity and changes', action: 'View Log', color: '#06b6d4' },
                ].map(item => (
                  <div key={item.title} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {item.enterprise && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">Enterprise</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <button className="text-xs px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-accent"
                      style={{ borderColor: item.color + '40', color: item.color }}>
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { label: 'Quote viewed by client', key: 'quote_viewed' },
                  { label: 'Quote signed', key: 'quote_signed' },
                  { label: 'Quote expiring soon (3 days)', key: 'quote_expiring' },
                  { label: 'Invoice payment received', key: 'payment_received' },
                  { label: 'Invoice overdue', key: 'invoice_overdue' },
                  { label: 'New support ticket', key: 'ticket_new' },
                  { label: 'Team member invite accepted', key: 'invite_accepted' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
                        Email
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
                        In-app
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
                  <Save size={14} />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4 mb-5">Integrations</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Slack', desc: 'Get quote notifications in Slack', icon: '💬', connected: false },
                    { name: 'HubSpot CRM', desc: 'Sync contacts and deals', icon: '🔗', connected: false },
                    { name: 'Salesforce', desc: 'Sync with Salesforce CRM', icon: '☁️', connected: false },
                    { name: 'Zapier', desc: 'Connect to 5000+ apps', icon: '⚡', connected: false },
                    { name: 'Xero', desc: 'Sync invoices to Xero', icon: '📊', connected: false },
                    { name: 'QuickBooks', desc: 'Sync invoices to QuickBooks', icon: '💰', connected: false },
                    { name: 'Google Drive', desc: 'Save PDFs to Google Drive', icon: '📁', connected: false },
                    { name: 'Stripe', desc: 'Accept payments online', icon: '💳', connected: true },
                  ].map(integration => (
                    <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                          {integration.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">{integration.desc}</p>
                        </div>
                      </div>
                      <button className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        integration.connected
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-primary/20 text-primary hover:bg-primary/30'
                      }`}>
                        {integration.connected ? <><Check size={10} className="inline mr-1" />Connected</> : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
