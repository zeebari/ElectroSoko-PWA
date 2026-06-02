import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('createdAt', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">الزبائن</h1>
        <Link
          to="/customers/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          {t('addCustomer')}
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Search */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-xs text-slate-400">{filtered.length} عميل</span>
          <div className="relative">
            <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              className="border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 text-right"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-right">الاسم</th>
                <th className="px-5 py-3 text-right">الهاتف</th>
                <th className="px-5 py-3 text-right">العنوان</th>
                <th className="px-5 py-3 text-right">العملة</th>
                <th className="px-5 py-3 text-right">الكفيل</th>
                <th className="px-5 py-3 text-right">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    <p className="text-sm">{t('noData')}</p>
                    <Link to="/customers/new" className="text-blue-600 text-sm mt-1 inline-block">+ {t('addCustomer')}</Link>
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-blue-700 font-bold text-sm">{c.name?.charAt(0) || '?'}</span>
                      </div>
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500 max-w-[160px] truncate">{c.address || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      c.currency === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {c.currency || 'IQD'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{c.guarantor || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/customers/${c.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      عرض
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
