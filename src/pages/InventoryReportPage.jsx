import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

export default function InventoryReportPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id)
    setProducts(data || [])
    setLoading(false)
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  let filtered = products.filter(p =>
    (!category || p.category === category) &&
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()))
  )

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'qty_asc') return a.quantity - b.quantity
    if (sortBy === 'qty_desc') return b.quantity - a.quantity
    if (sortBy === 'value') return (b.quantity * b.purchase_price) - (a.quantity * a.purchase_price)
    return a.name?.localeCompare(b.name)
  })

  const totalIQD = products.filter(p => p.currency === 'IQD').reduce((s, p) => s + p.quantity * p.purchase_price, 0)
  const totalUSD = products.filter(p => p.currency === 'USD').reduce((s, p) => s + p.quantity * p.purchase_price, 0)
  const sellIQD = products.filter(p => p.currency === 'IQD').reduce((s, p) => s + p.quantity * p.sell_price, 0)
  const sellUSD = products.filter(p => p.currency === 'USD').reduce((s, p) => s + p.quantity * p.sell_price, 0)
  const outOfStock = products.filter(p => p.quantity <= 0).length
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.min_quantity).length
  const totalQty = products.reduce((s, p) => s + (p.quantity || 0), 0)

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">جرد المخزن</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">إجمالي القطع</p>
          <p className="text-3xl font-bold text-slate-800">{totalQty.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{products.length} نوع</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm border ${outOfStock > 0 ? 'bg-red-50 border-red-100' : lowStock > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
          <p className={`text-xs font-medium ${outOfStock > 0 ? 'text-red-600' : lowStock > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {outOfStock > 0 ? `${outOfStock} نفد المخزون` : lowStock > 0 ? `${lowStock} مخزون منخفض` : 'كل المخزون جيد'}
          </p>
          <p className={`text-3xl font-bold ${outOfStock > 0 ? 'text-red-700' : lowStock > 0 ? 'text-orange-700' : 'text-green-700'}`}>{outOfStock + lowStock}</p>
        </div>
        {totalIQD > 0 && <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-blue-600">تكلفة المخزون (IQD)</p>
            <p className="font-bold text-blue-800 text-sm">{formatCurrency(totalIQD, 'IQD')}</p>
            <p className="text-xs text-blue-500 mt-0.5">قيمة البيع: {formatCurrency(sellIQD, 'IQD')}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <p className="text-xs text-green-600">الربح المتوقع (IQD)</p>
            <p className="font-bold text-green-800 text-sm">{formatCurrency(sellIQD - totalIQD, 'IQD')}</p>
          </div>
        </>}
        {totalUSD > 0 && <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-blue-600">تكلفة المخزون (USD)</p>
            <p className="font-bold text-blue-800 text-sm">{formatCurrency(totalUSD, 'USD')}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <p className="text-xs text-green-600">الربح المتوقع (USD)</p>
            <p className="font-bold text-green-800 text-sm">{formatCurrency(sellUSD - totalUSD, 'USD')}</p>
          </div>
        </>}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['name','الاسم'],['qty_asc','أقل كمية'],['qty_desc','أكثر كمية'],['value','أعلى قيمة']].map(([v,l]) => (
            <button key={v} onClick={() => setSortBy(v)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sortBy===v ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {l}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${!category ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              الكل
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat === category ? '' : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${category===cat ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm">{filtered.length} مادة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">المادة</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">الكمية</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">الحالة</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">سعر الشراء</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">قيمة المخزون</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">الربح/قطعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => {
                const status = p.quantity <= 0 ? 'out' : p.quantity <= p.min_quantity ? 'low' : 'ok'
                const profit = (p.sell_price || 0) - (p.purchase_price || 0)
                return (
                  <tr key={p.id} className={`${status === 'out' ? 'bg-red-50' : status === 'low' ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      {p.category && <p className="text-xs text-slate-400">{p.category}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-lg font-bold ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-orange-600' : 'text-slate-800'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        status === 'out' ? 'bg-red-100 text-red-700' :
                        status === 'low' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'}`}>
                        {status === 'out' ? 'نفد' : status === 'low' ? 'منخفض' : 'متوفر'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-left text-slate-600 text-xs">{formatCurrency(p.purchase_price, p.currency)}</td>
                    <td className="px-3 py-2.5 text-left font-semibold text-blue-700 text-xs">{formatCurrency(p.quantity * p.purchase_price, p.currency)}</td>
                    <td className={`px-3 py-2.5 text-left text-xs font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatCurrency(profit, p.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-3 py-2.5 font-bold text-slate-700 text-sm" colSpan={2}>الإجمالي</td>
                <td></td>
                <td></td>
                <td className="px-3 py-2.5 text-left font-bold text-blue-700 text-xs">
                  {totalIQD > 0 && <div>{formatCurrency(totalIQD, 'IQD')}</div>}
                  {totalUSD > 0 && <div>{formatCurrency(totalUSD, 'USD')}</div>}
                </td>
                <td className="px-3 py-2.5 text-left font-bold text-green-700 text-xs">
                  {totalIQD > 0 && <div>{formatCurrency(sellIQD - totalIQD, 'IQD')}</div>}
                  {totalUSD > 0 && <div>{formatCurrency(sellUSD - totalUSD, 'USD')}</div>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
