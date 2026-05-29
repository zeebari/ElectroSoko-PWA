import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AddSupplierPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', currency: 'IQD' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (isEdit) loadSupplier() }, [id])

  async function loadSupplier() {
    const { data } = await supabase.from('suppliers').select('*').eq('id', id).single()
    if (data) setForm({ name: data.name || '', phone: data.phone || '', address: data.address || '', notes: data.notes || '', currency: data.currency || 'IQD' })
  }

  function set(field, value) { setForm(p => ({ ...p, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('اسم الشركة مطلوب'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const payload = { ...form, user_id: user.id, updated_at: now }
    let err
    if (isEdit) {
      ({ error: err } = await supabase.from('suppliers').update(payload).eq('id', id))
    } else {
      ({ error: err } = await supabase.from('suppliers').insert({ id: crypto.randomUUID(), ...payload, created_at: now }))
    }
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/suppliers')
  }

  const cls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'تعديل الشركة' : 'شركة جديدة'}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2">بيانات الشركة / المورد</h3>
          {[['name','اسم الشركة','شركة الأمل للتوزيع',true],['phone','الهاتف','07xxxxxxxxx',false],['address','العنوان','العنوان',false]].map(([f,l,pl,req]) => (
            <div key={f}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{l}{req && <span className="text-red-500">*</span>}</label>
              <input value={form[f]} onChange={e => set(f, e.target.value)} className={cls} placeholder={pl} required={req} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">العملة</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className={cls}>
              <option value="IQD">IQD — دينار عراقي</option>
              <option value="USD">USD — دولار</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={`${cls} h-20 resize-none`} placeholder="أي ملاحظات..." />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl disabled:opacity-60 text-sm">
          {loading ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </form>
    </div>
  )
}
