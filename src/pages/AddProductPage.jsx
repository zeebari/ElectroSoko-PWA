import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency } from '../lib/i18n'

export default function AddProductPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    name: '', category: '', description: '',
    purchase_price: '', sell_price: '',
    quantity: '0', min_quantity: '5', currency: 'IQD',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingCategories, setExistingCategories] = useState([])
  const [newCategory, setNewCategory] = useState(false)

  useEffect(() => {
    loadCategories()
    if (isEdit) loadProduct()
  }, [id])

  async function loadCategories() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('products').select('category').eq('user_id', user.id)
    const cats = [...new Set((data || []).map(p => p.category).filter(Boolean))]
    setExistingCategories(cats)
  }

  async function loadProduct() {
    const { data } = await supabase.from('products').select('*').eq('id', id).single()
    if (data) setForm({
      name: data.name || '',
      category: data.category || '',
      description: data.description || '',
      purchase_price: data.purchase_price?.toString() || '',
      sell_price: data.sell_price?.toString() || '',
      quantity: data.quantity?.toString() || '0',
      min_quantity: data.min_quantity?.toString() || '5',
      currency: data.currency || 'IQD',
    })
  }

  function set(field, value) { setForm(p => ({ ...p, [field]: value })) }

  const profit = (parseFloat(form.sell_price) || 0) - (parseFloat(form.purchase_price) || 0)
  const profitPct = form.purchase_price > 0 ? ((profit / parseFloat(form.purchase_price)) * 100).toFixed(1) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('اسم المادة مطلوب'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      purchase_price: parseFloat(form.purchase_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      quantity: parseInt(form.quantity) || 0,
      min_quantity: parseInt(form.min_quantity) || 5,
      currency: form.currency,
      user_id: user.id,
      updated_at: now,
    }
    let err
    if (isEdit) {
      ({ error: err } = await supabase.from('products').update(payload).eq('id', id))
    } else {
      ({ error: err } = await supabase.from('products').insert({ id: crypto.randomUUID(), ...payload, created_at: now }))
    }
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/products')
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'تعديل المادة' : 'مادة جديدة'}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      {/* Profit Preview */}
      {form.purchase_price && form.sell_price && (
        <div className={`rounded-2xl p-3 flex justify-between items-center ${profit >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
          <span className="text-sm text-slate-600">هامش الربح</span>
          <div className="text-left">
            <span className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(Math.abs(profit), form.currency)}
            </span>
            <span className={`text-xs mr-2 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>({profitPct}%)</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <Section title="بيانات المادة">
          <Field label="اسم المادة" required>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="مثل: تلفاز سامسونج" required />
          </Field>

          <Field label="الصنف / النوع">
            {existingCategories.length > 0 && !newCategory ? (
              <div className="space-y-2">
                <select value={form.category} onChange={e => {
                  if (e.target.value === '__new__') { setNewCategory(true); set('category', '') }
                  else set('category', e.target.value)
                }} className={inputCls}>
                  <option value="">بدون صنف</option>
                  {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ صنف جديد</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={form.category} onChange={e => set('category', e.target.value)} className={`${inputCls} flex-1`} placeholder="مثل: تلفازات، ثلاجات، غسالات" />
                {existingCategories.length > 0 && (
                  <button type="button" onClick={() => setNewCategory(false)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600">قائمة</button>
                )}
              </div>
            )}
          </Field>

          <Field label="الوصف">
            <input value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} placeholder="مواصفات أو ملاحظات" />
          </Field>

          <Field label="العملة">
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
              <option value="IQD">IQD — دينار عراقي</option>
              <option value="USD">USD — دولار</option>
            </select>
          </Field>
        </Section>

        {/* Pricing */}
        <Section title="الأسعار">
          <Field label="سعر الشراء">
            <input value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} className={inputCls} type="number" placeholder="0" step="0.01" />
          </Field>
          <Field label="سعر البيع">
            <input value={form.sell_price} onChange={e => set('sell_price', e.target.value)} className={inputCls} type="number" placeholder="0" step="0.01" />
          </Field>
        </Section>

        {/* Stock */}
        <Section title="المخزون">
          <Field label="الكمية الحالية">
            <input value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inputCls} type="number" placeholder="0" />
          </Field>
          <Field label="الحد الأدنى للتنبيه">
            <input value={form.min_quantity} onChange={e => set('min_quantity', e.target.value)} className={inputCls} type="number" placeholder="5" />
            <p className="text-xs text-slate-400 mt-1">عند وصول الكمية لهذا الحد يظهر تنبيه</p>
          </Field>
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
