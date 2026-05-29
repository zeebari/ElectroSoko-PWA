import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadSuppliers() }, [])

  async function loadSuppliers() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: supsData } = await supabase.from('suppliers').select('*').eq('user_id', user.id).order('name')

    if (!supsData || supsData.length === 0) { setLoading(false); return }

    // Calculate balance per supplier
    const ids = supsData.map(s => s.id)
    const { data: txns } = await supabase.from('supplier_transactions').select('*').in('supplier_id', ids)

    const balanceMap = {}
    ;(txns || []).forEach(t => {
      if (!balanceMap[t.supplier_id]) balanceMap[t.supplier_id] = 0
      balanceMap[t.supplier_id] += t.type === 'purchase' ? parseFloat(t.amount) : -parseFloat(t.amount)
    })

    setSuppliers(supsData.map(s => ({ ...s, balance: balanceMap[s.id] || 0 })))
    setLoading(false)
  }

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)
  )

  const totalOwedIQD = filtered.filter(s => s.currency === 'IQD' && s.balance > 0).reduce((sum, s) => sum + s.balance, 0)
  const totalOwedUSD = filtered.filter(s => s.currency === 'USD' && s.balance > 0).reduce((sum, s) => sum + s.balance, 0)

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">الشركات / الموردون</h1>
        <Link to="/suppliers/new"
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          شركة جديدة
        </Link>
      </div>

      {/* Total Owed */}
      {(totalOwedIQD > 0 || totalOwedUSD > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-2">إجمالي المستحق للموردين</p>
          {totalOwedIQD > 0 && <p className="text-lg font-bold text-orange-700">{formatCurrency(totalOwedIQD, 'IQD')}</p>}
          {totalOwedUSD > 0 && <p className="text-lg font-bold text-orange-700">{formatCurrency(totalOwedUSD, 'USD')}</p>}
        </div>
      )}

      <div className="relative">
        <svg className="absolute right-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
          className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right" />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <p className="text-sm">لا توجد شركات</p>
            <Link to="/suppliers/new" className="text-blue-600 text-sm mt-2 inline-block">+ أضف شركة جديدة</Link>
          </div>
        ) : filtered.map(s => (
          <Link key={s.id} to={`/suppliers/${s.id}`}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.99] transition-all">
            <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-purple-700 font-bold text-lg">{s.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{s.name}</p>
              <p className="text-xs text-slate-500 truncate">{s.phone || s.address || '—'}</p>
            </div>
            <div className="text-left shrink-0">
              {s.balance > 0 ? (
                <p className="font-bold text-orange-600 text-sm">{formatCurrency(s.balance, s.currency)}</p>
              ) : s.balance < 0 ? (
                <p className="font-bold text-green-600 text-sm">رصيد دائن</p>
              ) : (
                <p className="text-xs text-green-600 font-medium">✓ مسدد</p>
              )}
              <span className="text-xs text-slate-400">{s.currency}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
