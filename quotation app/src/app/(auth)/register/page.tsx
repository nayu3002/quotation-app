'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'org'>('account')
  const [loading, setLoading] = useState(false)

  // Account fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Org fields
  const [orgName, setOrgName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setStep('org')
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // 1) Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('No user returned')

      // 2) Create org + user record via API
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email: authData.user.email,
          orgName,
          gstNumber,
          phone,
          address,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Setup failed')
      }

      toast.success('Account created! Welcome to QuoteWise 🎉')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <span className="text-2xl">🧵</span>
          </div>
          <h1 className="text-3xl font-bold text-white">QuoteWise</h1>
          <p className="text-brand-300 mt-1">Set up your business account</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1 rounded-full transition-all ${step === 'account' ? 'bg-brand-400' : 'bg-brand-500'}`} />
          <div className={`flex-1 h-1 rounded-full transition-all ${step === 'org' ? 'bg-brand-400' : 'bg-white/20'}`} />
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl animate-fade-in">
          {step === 'account' ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
              <p className="text-brand-300 text-sm mb-6">Step 1 of 2 – Account details</p>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/30 mt-2"
                >
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Your business details</h2>
              <p className="text-brand-300 text-sm mb-6">Step 2 of 2 – Organization info</p>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">Business Name *</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    placeholder="e.g. Sharma Garments Pvt. Ltd."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">GST Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Business address"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 transition resize-none"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep('account')}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-500/30"
                  >
                    {loading ? 'Creating...' : 'Get Started 🚀'}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="text-center text-brand-300 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
