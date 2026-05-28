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
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('customers')}</h1>
        <Link to="/customers/new"
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          {t('addCustomer')}
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute right-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
        />
      </div>

      {/* Customer Count */}
      <p className="text-xs text-slate-500">{filtered.length} عميل</p>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <p className="text-sm">{t('noData')}</p>
          </div>
        ) : filtered.map(c => (
          <Link key={c.id} to={`/customers/${c.id}`}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.99] transition-all">
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-blue-700 font-bold text-lg">{c.name?.charAt(0) || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{c.name}</p>
              <p className="text-xs text-slate-500 truncate">{c.phone || c.address || '—'}</p>
            </div>
            <div className="text-left shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.currency === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {c.currency || 'IQD'}
              </span>
              <svg className="w-4 h-4 text-slate-300 mt-1 mr-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
