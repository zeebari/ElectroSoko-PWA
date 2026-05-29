import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency } from '../lib/i18n'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, valueIQD: 0, valueUSD: 0 })

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    const list = data || []
    setProducts(list)

    const cats = [...new Set(list.map(p => p.category).filter(Boolean))]
    setCategories(cats)

    const s = {
      total: list.length,
      lowStock: list.filter(p => p.quantity > 0 && p.quantity <= p.min_quantity).length,
      outOfStock: list.filter(p => p.quantity <= 0).length,
      valueIQD: list.filter(p => p.currency === 'IQD').reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0),
      valueUSD: list.filter(p => p.currency === 'USD').reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0),
    }
    setStats(s)
    setLoading(false)
  }

  const filtered = products.filter(p =>
    (!category || p.category === category) &&
    (p.name?.toLowerCase().includes(search.toLowerCase()) ||
     p.category?.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">المخزن</h1>
        <div className="flex gap-2">
          <Link to="/inventory"
            className="flex items-center gap-1 border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all">
            جرد
          </Link>
          <Link to="/products/new"
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            جديد
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">إجمالي المواد</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className={`rounded-2xl p-3 shadow-sm border ${stats.outOfStock > 0 ? 'bg-red-50 border-red-100' : stats.lowStock > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
          <p className={`text-xs ${stats.outOfStock > 0 ? 'text-red-600' : stats.lowStock > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {stats.outOfStock > 0 ? `${stats.outOfStock} نفد المخزون` : stats.lowStock > 0 ? `${stats.lowStock} مخزون منخفض` : 'المخزون جيد'}
          </p>
          <p className={`text-2xl font-bold ${stats.outOfStock > 0 ? 'text-red-700' : stats.lowStock > 0 ? 'text-orange-700' : 'text-green-700'}`}>
            {stats.outOfStock + stats.lowStock}
          </p>
        </div>
        {stats.valueIQD > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-blue-600">قيمة المخزون (IQD)</p>
            <p className="text-base font-bold text-blue-800">{formatCurrency(stats.valueIQD, 'IQD')}</p>
          </div>
        )}
        {stats.valueUSD > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <p className="text-xs text-green-600">قيمة المخزون (USD)</p>
            <p className="text-base font-bold text-green-800">{formatCurrency(stats.valueUSD, 'USD')}</p>
          </div>
        )}
      </div>

      {/* Search + Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <svg className="absolute right-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right" />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!category ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              الكل
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat === category ? '' : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">{filtered.length} مادة</p>

      {/* Product List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <p className="text-sm">لا توجد مواد</p>
            <Link to="/products/new" className="text-blue-600 text-sm mt-2 inline-block">+ أضف مادة جديدة</Link>
          </div>
        ) : filtered.map(p => {
          const stockStatus = p.quantity <= 0 ? 'out' : p.quantity <= p.min_quantity ? 'low' : 'ok'
          return (
            <Link key={p.id} to={`/products/${p.id}`}
              className={`flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-[0.99] ${
                stockStatus === 'out' ? 'border-red-200 bg-red-50' :
                stockStatus === 'low' ? 'border-orange-200 bg-orange-50' :
                'border-slate-100'
              }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                stockStatus === 'out' ? 'bg-red-100' :
                stockStatus === 'low' ? 'bg-orange-100' :
                'bg-blue-50'
              }`}>
                <svg className={`w-6 h-6 ${stockStatus === 'out' ? 'text-red-500' : stockStatus === 'low' ? 'text-orange-500' : 'text-blue-500'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                {p.category && <p className="text-xs text-slate-500">{p.category}</p>}
              </div>
              <div className="text-left shrink-0">
                <p className={`text-2xl font-bold ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-orange-600' : 'text-slate-800'}`}>
                  {p.quantity}
                </p>
                <p className="text-xs text-slate-400">قطعة</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
