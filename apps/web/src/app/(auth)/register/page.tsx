'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Zap, ArrowRight, Loader2, Check } from 'lucide-react'

const schema = z.object({
  orgName: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select your industry'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Your name is required'),
})

type FormData = z.infer<typeof schema>

const INDUSTRIES = [
  { value: 'generic', label: 'General Business' },
  { value: 'construction', label: 'Construction & Contracting' },
  { value: 'it', label: 'IT & Managed Services' },
  { value: 'creative', label: 'Creative & Marketing Agency' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'retail', label: 'Retail & Wholesale' },
  { value: 'solar', label: 'Solar & Energy' },
  { value: 'events', label: 'Events & Hospitality' },
  { value: 'education', label: 'Education & Training' },
  { value: 'logistics', label: 'Logistics & Shipping' },
]

const FEATURES = ['Unlimited quotes', 'E-signature', 'PDF export', 'Client portal', 'CRM & Contacts']

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setAuthError(null)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, orgName: data.orgName, industry: data.industry },
      },
    })

    if (authError) {
      setAuthError(authError.message)
      return
    }

    // Create org via API
    await fetch('/api/onboarding/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName: data.orgName, industry: data.industry, name: data.name }),
    })

    router.push('/dashboard?welcome=1')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">QuoteFlow</span>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Start winning more<br />
            <span className="gradient-text">business today</span>
          </h2>
          <p className="text-white/60 text-lg">
            Join 10,000+ businesses using QuoteFlow to close deals faster.
          </p>
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-primary" />
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-sm mt-4">✓ Free 14-day trial · No credit card required</p>
        </div>
        <p className="relative text-white/30 text-sm">© 2026 QuoteFlow. All rights reserved.</p>
      </div>

      {/* Right Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-7">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-2">Get started with a free 14-day trial</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{authError}</div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Your Name</label>
              <input {...register('name')} placeholder="John Smith"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Company Name</label>
              <input {...register('orgName')} placeholder="Acme Corp"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              {errors.orgName && <p className="text-xs text-red-400">{errors.orgName.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Industry</label>
              <select {...register('industry')}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm">
                <option value="">Select your industry...</option>
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
              {errors.industry && <p className="text-xs text-red-400">{errors.industry.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Work Email</label>
              <input {...register('email')} type="email" placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all hover:shadow-glow hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-primary hover:underline">Terms</a> and{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
