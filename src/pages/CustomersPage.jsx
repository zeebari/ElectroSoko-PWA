import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('customers').select('*').eq('user_id', user.id).order('createdAt', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  )

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-800">الزبائن <span className="text-slate-400 font-normal text-sm">({filtered.length})</span></h1>
        <Link to="/customers/new" className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          زبون جديد
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم أو هاتف..."
          className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right shadow-sm"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <p className="text-slate-500 text-sm mb-2">لا يوجد زبائن</p>
          <Link to="/customers/new" className="text-blue-600 text-sm font-medium">+ أضف زبون جديد</Link>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(c => (
              <Link key={c.id} to={`/customers/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 active:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-bold">{c.name?.charAt(0) || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{c.phone || 'بدون هاتف'}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.currency === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {c.currency || 'IQD'}
                </span>
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-100">
                  <th className="px-5 py-3 text-right">الاسم</th>
                  <th className="px-5 py-3 text-right">الهاتف</th>
                  <th className="px-5 py-3 text-right">العنوان</th>
                  <th className="px-5 py-3 text-right">العملة</th>
                  <th className="px-5 py-3 text-right">الكفيل</th>
                  <th className="px-5 py-3 text-right">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-blue-700 font-bold text-xs">{c.name?.charAt(0) || '?'}</span>
                        </div>
                        <span className="font-medium text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{c.phone || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-[140px] truncate">{c.address || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.currency === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.currency || 'IQD'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{c.guarantorName || '—'}</td>
                    <td className="px-5 py-3">
                      <Link to={`/customers/${c.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium">
                        عرض <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
