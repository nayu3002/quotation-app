'use client'

import { useState } from 'react'
import { Package, Plus, Search, Grid3X3, List, Edit, Trash2, Tag, Layers, MoreHorizontal, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string | null
  sku: string | null
  basePrice: number
  costPrice: number
  unitOfMeasure: string
  currency: string
  isRecurring: boolean
  recurrenceInterval: string | null
  isActive: boolean
  isBundle: boolean
  imageUrl: string | null
  category: { id: string; name: string } | null
  variants: { id: string; name: string }[]
}

interface Category {
  id: string
  name: string
}

interface CatalogPageProps {
  products: Product[]
  categories: Category[]
}

export function CatalogPage({ products, categories }: CatalogPageProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const filtered = products.filter(p => {
    if (!showInactive && !p.isActive) return false
    if (selectedCategory && p.category?.id !== selectedCategory) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.sku ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const margin = (p: Product) => p.costPrice > 0
    ? Math.round(((p.basePrice - p.costPrice) / p.basePrice) * 100)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Layers size={15} />
            Import CSV
          </button>
          <Link href="/catalog/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products or SKU..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory ?? ''}
            onChange={e => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
              <Grid3X3 size={15} />
            </button>
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          All Products
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === c.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Package size={36} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No products found</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Add your products and services to build quotes faster.
          </p>
          <Link href="/catalog/new"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9c77fc)' }}>
            <Plus size={16} />
            Add First Product
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="glass-card hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
              {/* Product Image or Placeholder */}
              <div className="h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package size={40} className="text-muted-foreground/30" />
                )}
                {product.isBundle && (
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/80 text-white font-medium">
                    Bundle
                  </span>
                )}
                {product.isRecurring && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/80 text-white font-medium">
                    Recurring
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors">
                    <Edit size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                    {product.category && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag size={11} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{product.category.name}</p>
                      </div>
                    )}
                    {product.sku && <p className="text-xs text-muted-foreground/60 mt-0.5">SKU: {product.sku}</p>}
                  </div>
                  <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors flex-shrink-0">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(product.basePrice, product.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">per {product.unitOfMeasure}</p>
                  </div>
                  {margin(product) !== null && (
                    <div className="text-right">
                      <p className={`text-xs font-medium ${margin(product)! >= 30 ? 'text-emerald-400' : margin(product)! >= 15 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {margin(product)}% margin
                      </p>
                    </div>
                  )}
                </div>
                {product.variants.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">{product.variants.length} variants</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Product', 'Category', 'SKU', 'Price', 'Cost', 'Margin', 'Type', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {product.imageUrl
                          ? <img src={product.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                          : <Package size={16} className="text-muted-foreground" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.name}</p>
                        {product.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{product.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><p className="text-sm text-muted-foreground">{product.category?.name ?? '—'}</p></td>
                  <td className="px-6 py-4"><p className="text-xs text-muted-foreground font-mono">{product.sku ?? '—'}</p></td>
                  <td className="px-6 py-4"><p className="text-sm font-semibold text-foreground">{formatCurrency(product.basePrice, product.currency)}</p></td>
                  <td className="px-6 py-4"><p className="text-sm text-muted-foreground">{product.costPrice > 0 ? formatCurrency(product.costPrice, product.currency) : '—'}</p></td>
                  <td className="px-6 py-4">
                    {margin(product) !== null
                      ? <span className={`text-xs font-medium ${margin(product)! >= 30 ? 'text-emerald-400' : 'text-yellow-400'}`}>{margin(product)}%</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {product.isBundle && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">Bundle</span>}
                      {product.isRecurring && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{product.recurrenceInterval}</span>}
                      {!product.isBundle && !product.isRecurring && <span className="text-[10px] text-muted-foreground">One-time</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Edit size={13} /></button>
                      <button className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
