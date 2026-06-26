'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search, User, Phone, Mail, MapPin, X, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

interface CustomerFormData {
  name: string
  phone: string
  email: string
  address: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CustomerFormData>({ name: '', phone: '', email: '', address: '' })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setCustomers(data)
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(timer)
  }, [fetchCustomers])

  function openCreate() {
    setEditingCustomer(null)
    setForm({ name: '', phone: '', email: '', address: '' })
    setShowModal(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    setForm({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '' })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'
      const method = editingCustomer ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(editingCustomer ? 'Customer updated!' : 'Customer created!')
      setShowModal(false)
      fetchCustomers()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Customer deleted')
      fetchCustomers()
    } else {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">{search ? 'No customers found' : 'No customers yet'}</p>
            {!search && <button onClick={openCreate} className="mt-3 text-sm text-brand-600 hover:underline">Add your first customer →</button>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center px-5 py-4 hover:bg-gray-50 transition group">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-brand-700 font-bold text-sm">{c.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/customers/${c.id}`} className="group-link inline-block">
                    <p className="font-medium text-gray-900 text-sm hover:text-brand-600 hover:underline transition">{c.name}</p>
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.address && <span className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-xs"><MapPin className="w-3 h-3 flex-shrink-0" />{c.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition" title="Edit Customer">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete Customer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {[
                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'e.g. Rajesh Kumar', required: true },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 99999 99999' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'customer@email.com' },
              ].map(({ label, key, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof CustomerFormData]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  placeholder="Business or delivery address"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-brand-600/25">
                  {saving ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
