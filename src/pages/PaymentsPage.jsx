import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency, formatDate } from '../lib/i18n'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthTotal, setMonthTotal] = useState({ IQD: 0, USD: 0 })

  useEffect(() => { loadPayments() }, [])

  async function loadPayments() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: paysData } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('createdAt', { ascending: false })
      .limit(100)

    const pays = paysData || []

    // Fetch plan + customer info
    const planIds = [...new Set(pays.map(p => p.planId).filter(Boolean))]
    const { data: plansData } = await supabase.from('plans').select('id, customerId, description').in('id', planIds)
    const planMap = {}
    ;(plansData || []).forEach(p => { planMap[p.id] = p })

    const custIds = [...new Set(Object.values(planMap).map(p => p.customerId).filter(Boolean))]
    const { data: custsData } = await supabase.from('customers').select('id, name, currency').in('id', custIds)
    const custMap = {}
    ;(custsData || []).forEach(c => { custMap[c.id] = c })

    const enriched = pays.map(p => {
      const plan = planMap[p.planId] || {}
      const cust = custMap[plan.customerId] || {}
      return { ...p, planDescription: plan.description, customerName: cust.name, currency: cust.currency || 'IQD' }
    })

    // This month total
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let iqd = 0, usd = 0
    enriched.filter(p => p.date?.startsWith(monthStr)).forEach(p => {
      if (p.currency === 'USD') usd += parseFloat(p.amount || 0)
      else iqd += parseFloat(p.amount || 0)
    })

    setPayments(enriched)
    setMonthTotal({ IQD: iqd, USD: usd })
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-slate-800">{t('payments')}</h1>

      {/* This month */}
      <div className="grid grid-cols-2 gap-3">
        {monthTotal.IQD > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs text-blue-600 font-medium">{t('thisMonth')} (IQD)</p>
            <p className="font-bold text-blue-800 text-lg">{formatCurrency(monthTotal.IQD, 'IQD')}</p>
          </div>
        )}
        {monthTotal.USD > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-xs text-green-600 font-medium">{t('thisMonth')} (USD)</p>
            <p className="font-bold text-green-800 text-lg">{formatCurrency(monthTotal.USD, 'USD')}</p>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">آخر الدفعات</h3>
        </div>
        {payments.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400 text-sm">{t('noData')}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {payments.map(p => (
              <Link key={p.id} to={`/plans/${p.planId}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{p.customerName || '—'}</p>
                  <p className="text-xs text-slate-500">{p.planDescription || '—'}</p>
                  <p className="text-xs text-slate-400">{formatDate(p.date)}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-green-700">{formatCurrency(p.amount, p.currency)}</p>
                  {p.installmentNumber && <p className="text-xs text-slate-400">قسط #{p.installmentNumber}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
