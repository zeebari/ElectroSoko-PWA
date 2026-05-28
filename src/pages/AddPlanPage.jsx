import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency } from '../lib/i18n'

function buildSchedule(startDate, installmentCount, monthlyAmount, downPayment) {
  const schedule = []
  const start = new Date(startDate || new Date())
  for (let i = 0; i < installmentCount; i++) {
    const due = new Date(start)
    due.setMonth(due.getMonth() + i + 1)
    schedule.push({
      installmentNumber: i + 1,
      dueDate: due.toISOString().split('T')[0],
      amount: parseFloat(monthlyAmount) || 0,
      paid: false,
      paidDate: null,
      paidAmount: 0,
    })
  }
  return schedule
}

export default function AddPlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedCustomerId = searchParams.get('customerId')

  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({
    customerId: preselectedCustomerId || '',
    description: '',
    totalAmount: '',
    downPayment: '0',
    installmentCount: '12',
    interestRate: '0',
    interestType: 'none',
    startDate: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('customers').select('id, name, currency').eq('user_id', user.id).order('name')
    setCustomers(data || [])
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const totalAmount = parseFloat(form.totalAmount) || 0
  const downPayment = parseFloat(form.downPayment) || 0
  const installmentCount = parseInt(form.installmentCount) || 1
  const interestRate = parseFloat(form.interestRate) || 0

  let totalInterest = 0
  if (form.interestType === 'simple') totalInterest = (totalAmount * interestRate / 100) * (installmentCount / 12)
  else if (form.interestType === 'compound') totalInterest = totalAmount * (Math.pow(1 + interestRate/100/12, installmentCount) - 1)

  const totalWithInterest = totalAmount + totalInterest
  const financeAmount = totalWithInterest - downPayment
  const monthlyAmount = installmentCount > 0 ? financeAmount / installmentCount : 0

  const selectedCustomer = customers.find(c => c.id === form.customerId)
  const currency = selectedCustomer?.currency || 'IQD'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customerId) { setError('اختر العميل'); return }
    if (!totalAmount) { setError('أدخل المبلغ الإجمالي'); return }
    setLoading(true)
    setError('')

    const schedule = buildSchedule(form.startDate, installmentCount, monthlyAmount, downPayment)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    const { error: err } = await supabase.from('plans').insert({
      id: crypto.randomUUID(),
      customerId: form.customerId,
      description: form.description,
      totalAmount: totalAmount,
      downPayment: downPayment,
      installmentCount: installmentCount,
      interestRate: interestRate,
      interestType: form.interestType,
      totalInterest: totalInterest,
      monthlyAmount: monthlyAmount,
      startDate: form.startDate,
      schedule: schedule,
      user_id: user.id,
      createdAt: now,
      updatedAt: now,
    })

    if (err) { setError(err.message); setLoading(false); return }
    navigate('/plans')
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">{t('addPlan')}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      {/* Summary Card */}
      {totalAmount > 0 && (
        <div className="bg-blue-600 text-white rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="opacity-80">{t('totalAmount')}</span>
            <span className="font-semibold">{formatCurrency(totalWithInterest, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-80">{t('downPayment')}</span>
            <span className="font-semibold">{formatCurrency(downPayment, currency)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-white/20 pt-2">
            <span className="opacity-80">{t('monthlyAmount')}</span>
            <span className="font-bold text-lg">{formatCurrency(monthlyAmount, currency)} × {installmentCount}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Section title="بيانات العقد">
          <Field label={t('customer')} required>
            <select value={form.customerId} onChange={e => set('customerId', e.target.value)} className={inputCls} required>
              <option value="">اختر العميل...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>)}
            </select>
          </Field>
          <Field label={t('description')}>
            <input value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} placeholder="مثل: تلفاز سامسونج 55 بوصة" />
          </Field>
          <Field label={t('totalAmount')} required>
            <input value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} className={inputCls} type="number" placeholder="0" step="0.01" required />
          </Field>
          <Field label={t('downPayment')}>
            <input value={form.downPayment} onChange={e => set('downPayment', e.target.value)} className={inputCls} type="number" placeholder="0" step="0.01" />
          </Field>
          <Field label={t('installmentCount')}>
            <select value={form.installmentCount} onChange={e => set('installmentCount', e.target.value)} className={inputCls}>
              {[3,6,9,12,18,24,36,48,60].map(n => <option key={n} value={n}>{n} شهر</option>)}
            </select>
          </Field>
          <Field label={t('startDate')}>
            <input value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} type="date" />
          </Field>
        </Section>

        <Section title="الفائدة (اختياري)">
          <Field label={t('interestType')}>
            <select value={form.interestType} onChange={e => set('interestType', e.target.value)} className={inputCls}>
              <option value="none">{t('none')}</option>
              <option value="simple">{t('simple')}</option>
              <option value="compound">{t('compound')}</option>
            </select>
          </Field>
          {form.interestType !== 'none' && (
            <Field label={t('interestRate')}>
              <input value={form.interestRate} onChange={e => set('interestRate', e.target.value)} className={inputCls} type="number" placeholder="0" step="0.1" />
            </Field>
          )}
          {totalInterest > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-sm text-orange-700">
              الفائدة: {formatCurrency(totalInterest, currency)}
            </div>
          )}
        </Section>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-60 text-sm">
          {loading ? 'جاري الحفظ...' : t('save')}
        </button>
      </form>
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
      <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}{required && <span className="text-red-500 mr-0.5">*</span>}</label>
      {children}
    </div>
  )
}
