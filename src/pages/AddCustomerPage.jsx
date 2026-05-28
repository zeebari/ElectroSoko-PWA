import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

export default function AddCustomerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', phone: '', address: '', currency: 'IQD',
    guarantorName: '', guarantorPhone: '', guarantorAddress: '', guarantorRelation: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('الاسم مطلوب'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const { error: err } = await supabase.from('customers').insert({
      id: crypto.randomUUID(),
      ...form,
      user_id: user.id,
      createdAt: now,
      updatedAt: now,
    })
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/customers')
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">{t('addCustomer')}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <Section title="البيانات الأساسية">
          <Field label={t('name')} required>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="اسم العميل" required />
          </Field>
          <Field label={t('phone')}>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="07xxxxxxxxx" type="tel" />
          </Field>
          <Field label={t('address')}>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="العنوان" />
          </Field>
          <Field label={t('currency')}>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
              <option value="IQD">IQD — دينار عراقي</option>
              <option value="USD">USD — دولار أمريكي</option>
            </select>
          </Field>
        </Section>

        {/* Guarantor */}
        <Section title="بيانات الكفيل">
          <Field label={t('guarantorName')}>
            <input value={form.guarantorName} onChange={e => set('guarantorName', e.target.value)} className={inputCls} placeholder="اسم الكفيل" />
          </Field>
          <Field label={t('guarantorPhone')}>
            <input value={form.guarantorPhone} onChange={e => set('guarantorPhone', e.target.value)} className={inputCls} placeholder="07xxxxxxxxx" type="tel" />
          </Field>
          <Field label={t('guarantorAddress')}>
            <input value={form.guarantorAddress} onChange={e => set('guarantorAddress', e.target.value)} className={inputCls} placeholder="عنوان الكفيل" />
          </Field>
          <Field label={t('guarantorRelation')}>
            <input value={form.guarantorRelation} onChange={e => set('guarantorRelation', e.target.value)} className={inputCls} placeholder="مثل: أخ، جار، صديق" />
          </Field>
        </Section>

        {/* Notes */}
        <Section title="ملاحظات">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inputCls} h-24 resize-none`} placeholder="أي ملاحظات إضافية..." />
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
