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

    // Calculate balance per supplier using supplier_purchases and supplier_payments
    const ids = supsData.map(s => s.id)
    const [{ data: purchases }, { data: payments }] = await Promise.all([
      supabase.from('supplier_purchases').select('supplier_id,total_amount').in('supplier_id', ids),
      supabase.from('supplier_payments').select('supplier_id,amount').in('supplier_id', ids),
    ])

    const balanceMap = {}
    ;(purchases || []).forEach(p => {
      if (!balanceMap[p.supplier_id]) balanceMap[p.supplier_id] = 0
      balanceMap[p.supplier_id] += parseFloat(p.total_amount || 0)
    })
    ;(payments || []).forEach(p => {
      if (!balanceMap[p.supplier_id]) balanceMap[p.supplier_id] = 0
      balanceMap[p.supplier_id] -= parseFloat(p.amount || 0)
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
    <div className="space-y-3">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-700">الشركات</h1>
        <Link
          to="/suppliers/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          شركة جديدة+
        </Link>
      </div>

      {/* Outstanding Alert */}
      {(totalOwedIQD > 0 || totalOwedUSD > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-800 mb-1">إجمالي المستحق للموردين</p>
            <div className="flex gap-4">
              {totalOwedIQD > 0 && <span className="text-base font-bold text-orange-700">{formatCurrency(totalOwedIQD, 'IQD')}</span>}
              {totalOwedUSD > 0 && <span className="text-base font-bold text-orange-700">{formatCurrency(totalOwedUSD, 'USD')}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Search */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-xs text-slate-400">{filtered.length} شركة</span>
          <div className="relative">
            <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث..."
              className="border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 text-right"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-right">الشركة</th>
                <th className="px-5 py-3 text-right">الهاتف</th>
                <th className="px-5 py-3 text-right">العملة</th>
                <th className="px-5 py-3 text-right">الرصيد</th>
                <th className="px-5 py-3 text-right">الحالة</th>
                <th className="px-5 py-3 text-right">عرض + كشف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    <p className="text-sm">لا توجد شركات</p>
                    <Link to="/suppliers/new" className="text-blue-600 text-sm mt-1 inline-block">+ أضف شركة جديدة</Link>
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-purple-700 font-bold text-sm">{s.name?.charAt(0) || '?'}</span>
                      </div>
                      <span className="font-medium text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{s.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      s.currency === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.currency || 'IQD'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">
                    {formatCurrency(Math.abs(s.balance), s.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    {s.balance > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">مستحق</span>
                    ) : s.balance < 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">دائن</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">مسدّد</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/suppliers/${s.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        عرض
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </Link>
                      <span className="text-slate-200">|</span>
                      <Link
                        to={`/suppliers/${s.id}/statement`}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs font-medium"
                      >
                        كشف
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} شركة
          </div>
        )}
      </div>
    </div>
  )
}
