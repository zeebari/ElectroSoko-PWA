import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency, formatDate } from '../lib/i18n'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: cust }, { data: plansData }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('plans').select('*').eq('customerId', id).order('createdAt', { ascending: false }),
    ])
    setCustomer(cust)
    setPlans(plansData || [])
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('customers').delete().eq('id', id)
    navigate('/customers')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>
  if (!customer) return <div className="p-4 text-slate-400">العميل غير موجود</div>

  const currency = customer.currency || 'IQD'
  const totalOutstanding = plans.reduce((sum, p) => sum + Math.max(0, parseFloat(p.totalAmount || 0) + parseFloat(p.totalInterest || 0) - parseFloat(p.downPayment || 0)), 0)

  const whatsappMsg = encodeURIComponent(
    `مرحباً ${customer.name} 👋\nكشف حساب من إلكترو سوقو\nالتاريخ: ${formatDate(new Date().toISOString())}\n─────────────────\nإجمالي الأقساط: ${plans.length}\nالمبلغ المستحق: ${formatCurrency(totalOutstanding, currency)}\n─────────────────\nشكراً لتعاملكم معنا 🙏`
  )
  const waLink = `https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}?text=${whatsappMsg}`

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">بيانات العميل</h1>
      </div>

      {/* Customer Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-blue-700 font-bold text-2xl">{customer.name?.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 text-lg">{customer.name}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${currency === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {currency}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {customer.phone && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('phone')}</span>
              <a href={`tel:${customer.phone}`} className="font-medium text-blue-600">{customer.phone}</a>
            </div>
          )}
          {customer.address && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('address')}</span>
              <span className="font-medium text-slate-800">{customer.address}</span>
            </div>
          )}
          {customer.guarantorName && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('guarantorName')}</span>
              <span className="font-medium text-slate-800">{customer.guarantorName} ({customer.guarantorRelation})</span>
            </div>
          )}
          {customer.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-slate-500 text-xs mb-1">{t('notes')}</p>
              <p className="text-slate-700 text-xs">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {customer.phone && (
            <a href={waLink} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t('whatsapp')}
            </a>
          )}
          <Link to={`/plans/new?customerId=${customer.id}`}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            {t('addPlan')}
          </Link>
        </div>
      </div>

      {/* Plans */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{t('plans')} ({plans.length})</h3>
        </div>
        {plans.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">{t('noData')}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {plans.map(plan => {
              const schedule = plan.schedule || []
              const paid = schedule.filter(s => s.paid).length
              const total = schedule.length
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0
              return (
                <Link key={plan.id} to={`/plans/${plan.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{plan.description || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-24">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{paid}/{total}</span>
                    </div>
                  </div>
                  <div className="text-left mr-3">
                    <p className="font-semibold text-blue-700 text-sm">{formatCurrency(plan.totalAmount, currency)}</p>
                    <p className="text-xs text-slate-400">{formatDate(plan.startDate)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete */}
      <button onClick={handleDelete}
        className="w-full text-red-600 border border-red-200 rounded-2xl py-3 text-sm font-medium hover:bg-red-50 transition-colors">
        {t('delete')}
      </button>
    </div>
  )
}
