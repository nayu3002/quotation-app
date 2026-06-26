'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Users, Building2, TrendingUp,
  Package, Receipt, CreditCard, Settings, LifeBuoy, Zap,
  ChevronLeft, ChevronRight, Bell, Bot, Shield, BarChart3,
  Kanban, BookOpen, MessageSquare, PlusCircle, Star,
  ChevronDown, Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  org: { id: string; name: string; logoUrl?: string | null; primaryColor?: string; industry?: string }
  role: { name: string; permissions: any }
  user: { id: string; email: string }
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/pipeline', icon: Kanban, label: 'Pipeline' },
    ],
  },
  {
    label: 'Quotes & Sales',
    items: [
      { href: '/quotes', icon: FileText, label: 'Quotes', badge: 'new' },
      { href: '/quotes/new', icon: PlusCircle, label: 'New Quote' },
      { href: '/invoices', icon: Receipt, label: 'Invoices' },
      { href: '/payments', icon: CreditCard, label: 'Payments' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/crm/contacts', icon: Users, label: 'Contacts' },
      { href: '/crm/companies', icon: Building2, label: 'Companies' },
      { href: '/crm/deals', icon: Briefcase, label: 'Deals' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/catalog', icon: Package, label: 'Products' },
      { href: '/templates', icon: BookOpen, label: 'Templates' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/analytics/pipeline', icon: TrendingUp, label: 'Pipeline' },
      { href: '/analytics/revenue', icon: BarChart3, label: 'Revenue' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/support/tickets', icon: LifeBuoy, label: 'Tickets' },
      { href: '/support/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
      { href: '/support/chat', icon: MessageSquare, label: 'Live Chat' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/integrations', icon: Zap, label: 'Integrations' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function DashboardSidebar({ org, role, user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Quotes & Sales', 'CRM'])

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  const orgColor = org.primaryColor ?? '#7c5cfc'

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Org Logo & Name */}
      <div className="flex items-center gap-3 p-4 border-b border-border min-h-[64px]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${orgColor}, ${orgColor}99)` }}
        >
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            org.name.charAt(0).toUpperCase()
          )}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{org.industry ?? 'General'}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-2 py-1.5 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                {group.label}
                <ChevronDown
                  size={12}
                  className={cn(
                    'transition-transform',
                    expandedGroups.includes(group.label) ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>
            )}
            {(collapsed || expandedGroups.includes(group.label)) && (
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'nav-item',
                        isActive && 'active',
                        collapsed && 'justify-center px-2'
                      )}
                      style={isActive ? { color: orgColor, background: `${orgColor}18` } : {}}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badge === 'new' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          NEW
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
            {!collapsed && <div className="my-2" />}
          </div>
        ))}
      </nav>

      {/* AI Assistant button */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all group"
          >
            <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Bot size={14} className="text-primary" />
            </div>
            <span>AI Assistant</span>
            <Star size={12} className="ml-auto text-yellow-400 opacity-70" />
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight size={12} className="text-muted-foreground" />
          : <ChevronLeft size={12} className="text-muted-foreground" />
        }
      </button>
    </aside>
  )
}
