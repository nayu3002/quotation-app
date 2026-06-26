'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Building2, Save, Upload } from 'lucide-react'

interface OrgData {
  id: string
  name: string
  gstNumber: string | null
  phone: string | null
  email: string | null
  address: string | null
  logoUrl: string | null
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [form, setForm] = useState({ name: '', gstNumber: '', phone: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setOrg(data)
        setForm({
          name: data.name || '',
          gstNumber: data.gstNumber || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
        })
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrg(updated)
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrg((prev) => prev ? { ...prev, logoUrl: data.logoUrl } : null)
      toast.success('Logo uploaded!')
    } catch {
      toast.error('Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  if (!org) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business profile</p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Business Logo</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
            {org.logoUrl ? (
              <Image src={org.logoUrl} alt="Logo" width={80} height={80} className="object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Logo'}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Org form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Business Details</p>
        <form onSubmit={handleSave} className="space-y-4">
          {[
            { key: 'name', label: 'Business Name *', type: 'text', placeholder: 'Sharma Garments Pvt. Ltd.', required: true },
            { key: 'gstNumber', label: 'GST Number', type: 'text', placeholder: '22AAAAA0000A1Z5' },
            { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 99999 99999' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'info@yourcompany.com' },
          ].map(({ key, label, type, placeholder, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={required}
                placeholder={placeholder}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
              placeholder="Full business address"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
