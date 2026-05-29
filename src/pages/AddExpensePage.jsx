import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { value: 'rent',          label: 'إيجار',       emoji: '🏠' },
  { value: 'salaries',      label: 'رواتب',        emoji: '👥' },
  { value: 'electricity',   label: 'كهرباء',       emoji: '⚡' },
  { value: 'transport',     label: 'مواصلات',      emoji: '🚗' },
  { value: 'maintenance',   label: 'صيانة',        emoji: '🔧' },
  { value: 'other',         label: 'أخرى',         emoji: '📌' },
]

const cls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'

export default function AddExpensePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    category: 'other',
    description: '',
    amount: '',
    currency: 'IQD',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) { setError('أدخل وصف المصروف'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('أدخل مبلغاً صحيحاً'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('expenses').insert({
      id: crypto.randomUUID(),
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      date: form.date,
      notes: form.notes.trim() || null,
      user_id: user.id,
      created_at: new Date().toISOString(),
    })
    if (err) { setError(err.message); setSaving(false); return }
    navigate('/accounting')
  }

  const selectedCat = CATEGORIES.find(c => c.value === form.category)

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">تسجيل مصروف</h1>
          <p className="text-sm text-slate-500">إضافة مصروف تشغيلي جديد</p>
        </div>
      </div>

      {/* Preview Card */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80">الفئة المختارة</p>
        <p className="text-2xl font-bold mt-1">{selectedCat?.emoji} {selectedCat?.label}</p>
        {form.amount && parseFloat(form.amount) > 0 && (
          <p className="text-lg font-semibold mt-2 opacity-90">
            {form.currency} {parseFloat(form.amount).toLocaleString('en-US')}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2">بيانات المصروف</h3>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">الفئة *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm ${
                    form.category === cat.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الوصف *</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="مثال: إيجار شهر يناير..."
              required
              className={cls}
            />
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">المبلغ *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                required
                className={cls}
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-slate-600 mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className={cls}
              >
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className={cls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="أي ملاحظات إضافية..."
              className={cls}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-60 text-sm shadow-sm"
        >
          {saving ? 'جاري التسجيل...' : '✓ تسجيل المصروف'}
        </button>
      </form>
    </div>
  )
}
