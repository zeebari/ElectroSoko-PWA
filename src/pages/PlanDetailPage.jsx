import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency, formatDate } from '../lib/i18n'

export default function PlanDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', installmentNumber: '' })
  const [paying, setPaying] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: planData }, { data: paymentsData }] = await Promise.all([
      supabase.from('plans').select('*').eq('id', id).single(),
      supabase.from('payments').select('*').eq('planId', id).order('createdAt', { ascending: false }),
    ])
    setPlan(planData)
    setPayments(paymentsData || [])
    if (planData?.customerId) {
      const { data: cust } = await supabase.from('customers').select('*').eq('id', planData.customerId).single()
      setCustomer(cust)
    }
    setLoading(false)
  }

  async function recordPayment(e) {
    e.preventDefault()
    if (!payForm.amount) return
    setPaying(true)

    const { data: { user } } = await supabase.auth.getUser()
    const amount = parseFloat(payForm.amount)
    const now = new Date().toISOString()

    // Record payment
    await supabase.from('payments').insert({
      id: crypto.randomUUID(),
      planId: id,
      amount,
      date: payForm.date,
      installmentNumber: payForm.installmentNumber ? parseInt(payForm.installmentNumber) : null,
      notes: payForm.notes,
      type: 'full',
      user_id: user.id,
      createdAt: now,
    })

    // Update schedule if installment number provided
    if (payForm.installmentNumber && plan?.schedule) {
      const newSchedule = plan.schedule.map(s =>
        s.installmentNumber === parseInt(payForm.installmentNumber)
          ? { ...s, paid: true, paidDate: payForm.date, paidAmount: amount }
          : s
      )
      await supabase.from('plans').update({ schedule: newSchedule, updatedAt: now }).eq('id', id)
    }

    setPayForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', installmentNumber: '' })
    setShowPayForm(false)
    loadData()
    setPaying(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>
  if (!plan) return <div className="p-4 text-slate-400">العقد غير موجود</div>

  const currency = customer?.currency || 'IQD'
  const schedule = plan.schedule || []
  const paidCount = schedule.filter(s => s.paid).length
  const pct = schedule.length > 0 ? Math.round((paidCount / schedule.length) * 100) : 0
  const totalPaidFromPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const totalDue = parseFloat(plan.totalAmount || 0) + parseFloat(plan.totalInterest || 0)
  const remaining = Math.max(0, totalDue - parseFloat(plan.downPayment || 0) - totalPaidFromPayments)

  const nextUnpaid = schedule.find(s => !s.paid)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">تفاصيل العقد</h1>
      </div>

      {/* Plan Summary */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5">
        <p className="text-blue-200 text-sm">{customer?.name}</p>
        <h2 className="font-bold text-lg mt-1">{plan.description || 'عقد تقسيط'}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-blue-300 text-xs">{t('totalAmount')}</p>
            <p className="font-bold">{formatCurrency(totalDue, currency)}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs">{t('remaining')}</p>
            <p className="font-bold">{formatCurrency(remaining, currency)}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs">{t('monthlyAmount')}</p>
            <p className="font-bold">{formatCurrency(plan.monthlyAmount, currency)}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs">{t('startDate')}</p>
            <p className="font-bold">{formatDate(plan.startDate)}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>{paidCount} من {schedule.length} قسط</span>
            <span>{pct}%</span>
          </div>
          <div className="bg-blue-900/50 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Next Installment */}
      {nextUnpaid && (
        <div className={`rounded-2xl p-4 border ${nextUnpaid.dueDate < today ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-semibold ${nextUnpaid.dueDate < today ? 'text-red-700' : 'text-amber-700'}`}>
                {nextUnpaid.dueDate < today ? 'قسط متأخر!' : t('nextInstallment')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">القسط #{nextUnpaid.installmentNumber} — {formatDate(nextUnpaid.dueDate)}</p>
            </div>
            <p className="font-bold text-slate-800">{formatCurrency(nextUnpaid.amount, currency)}</p>
          </div>
        </div>
      )}

      {/* Pay Button */}
      <button onClick={() => setShowPayForm(!showPayForm)}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl text-sm font-semibold transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        {t('recordPayment')}
      </button>

      {/* Pay Form */}
      {showPayForm && (
        <form onSubmit={recordPayment} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">{t('recordPayment')}</h3>
          <div>
            <label className="block text-xs text-slate-600 mb-1">{t('amount')} *</label>
            <input value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
              type="number" placeholder="0" step="0.01" required />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">{t('date')}</label>
            <input value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              type="date" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">رقم القسط</label>
            <select value={payForm.installmentNumber} onChange={e => setPayForm(p => ({ ...p, installmentNumber: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right">
              <option value="">بدون تحديد</option>
              {schedule.filter(s => !s.paid).map(s => (
                <option key={s.installmentNumber} value={s.installmentNumber}>
                  قسط #{s.installmentNumber} — {formatDate(s.dueDate)} — {formatCurrency(s.amount, currency)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">{t('paymentNotes')}</label>
            <input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
              placeholder="ملاحظات..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={paying}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {paying ? 'جاري...' : t('save')}
            </button>
            <button type="button" onClick={() => setShowPayForm(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Schedule Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{t('schedule')}</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {schedule.map(inst => (
            <div key={inst.installmentNumber}
              className={`flex items-center justify-between px-4 py-3 ${inst.paid ? 'bg-green-50' : inst.dueDate < today ? 'bg-red-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${inst.paid ? 'bg-green-500 text-white' : inst.dueDate < today ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {inst.installmentNumber}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{formatDate(inst.dueDate)}</p>
                  {inst.paid && inst.paidDate && <p className="text-xs text-green-600">دُفع: {formatDate(inst.paidDate)}</p>}
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">{formatCurrency(inst.amount, currency)}</p>
                {inst.paid
                  ? <span className="text-xs text-green-600 font-medium">✓ {t('paid')}</span>
                  : inst.dueDate < today
                    ? <span className="text-xs text-red-600 font-medium">متأخر</span>
                    : <span className="text-xs text-slate-400">معلق</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">سجل الدفعات ({payments.length})</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{formatDate(p.date)}</p>
                  {p.installmentNumber && <p className="text-xs text-slate-500">قسط #{p.installmentNumber}</p>}
                  {p.notes && <p className="text-xs text-slate-400">{p.notes}</p>}
                </div>
                <p className="font-semibold text-green-700">{formatCurrency(p.amount, currency)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <p className="text-sm font-bold text-slate-700">{t('totalPaid')}</p>
              <p className="font-bold text-green-700">{formatCurrency(totalPaidFromPayments, currency)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
