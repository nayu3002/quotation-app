'use client'

import { Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user: { id: string; email: string }
  org: { name: string; primaryColor?: string | null }
}

export function DashboardHeader({ user, org }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quotes, clients, invoices..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border hidden md:inline-flex">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 glass-card border border-border shadow-card-hover z-50 overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {[
                  { icon: '📋', text: 'Quote #QF-2026-042 was viewed by client', time: '2m ago', color: 'text-blue-400' },
                  { icon: '✍️', text: 'Quote #QF-2026-040 signed!', time: '1h ago', color: 'text-green-400' },
                  { icon: '💰', text: 'Payment received: $4,500 for INV-023', time: '3h ago', color: 'text-emerald-400' },
                  { icon: '⏰', text: 'Quote #QF-2026-038 expiring in 2 days', time: '5h ago', color: 'text-yellow-400' },
                ].map((n, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                    <span className="text-lg">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${n.color}`}>{n.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border">
                <button className="w-full text-xs text-primary hover:underline text-center">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-foreground max-w-[120px] truncate hidden md:block">
              {user.email}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-card border border-border shadow-card-hover z-50 overflow-hidden">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{org.name}</p>
              </div>
              <div className="p-1.5">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                  <User size={14} />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                  <Settings size={14} />
                  Settings
                </button>
                <hr className="my-1.5 border-border" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
