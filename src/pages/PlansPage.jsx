import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency, formatDate } from '../lib/i18n'

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: plansData } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('createdAt', { ascending: false })

    const plans = plansData || []

    // Fetch customer names
    const customerIds = [...new Set(plans.map(p => p.customerId).filter(Boolean))]
    const { data: customers } = await supabase.from('customers').select('id, name, currency').in('id', customerIds)
    const custMap = {}
    ;(customers || []).forEach(c => { custMap[c.id] = c })

    setPlans(plans.map(p => ({
      ...p,
      customerName: custMap[p.customerId]?.name || '—',
      currency: custMap[p.customerId]?.currency || 'IQD',
    })))
    setLoading(false)
  }

  const filtered = plans.filter(p =>
    p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('plans')}</h1>
        <Link to="/plans/new"
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          {t('addPlan')}
        </Link>
      </div>

      <div className="relative">
        <svg className="absolute right-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
          className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right" />
      </div>

      <p className="text-xs text-slate-500">{filtered.length} عقد</p>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p className="text-sm">{t('noData')}</p>
          </div>
        ) : filtered.map(plan => {
          const schedule = plan.schedule || []
          const paid = schedule.filter(s => s.paid).length
          const total = schedule.length
          const pct = total > 0 ? Math.round((paid / total) * 100) : 0
          const isComplete = pct === 100

          return (
            <Link key={plan.id} to={`/plans/${plan.id}`}
              className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.99] transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{plan.customerName}</p>
                  <p className="text-xs text-slate-500 truncate">{plan.description || '—'}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-bold text-blue-700">{formatCurrency(plan.totalAmount, plan.currency)}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {isComplete ? t('completed') : t('active')}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 shrink-0">{paid}/{total} قسط</span>
                <span className="text-xs text-slate-400">{formatDate(plan.startDate)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
