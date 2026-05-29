import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

export default function AddPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: sup }, { data: purchases }, { data: payments }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('supplier_purchases').select('total_amount').eq('supplier_id', id),
      supabase.from('supplier_payments').select('amount').eq('supplier_id', id),
    ])
    setSupplier(sup)
    const totalPurchases = (purchases || []).reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)
    const totalPaid = (payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0)
    setBalance(totalPurchases - totalPaid)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('أدخل مبلغاً صحيحاً')
      return
    }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('supplier_payments').insert({
      id: crypto.randomUUID(),
      supplier_id: id,
      amount: parseFloat(form.amount),
      currency: supplier.currency || 'IQD',
      date: form.date,
      notes: form.notes,
      user_id: user.id,
      created_at: new Date().toISOString(),
    })
    if (err) { setError(err.message); setSaving(false); return }
    navigate(`/suppliers/${id}`)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  if (!supplier) return null

  const currency = supplier.currency || 'IQD'

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">تسجيل دفعة</h1>
          <p className="text-sm text-slate-500">{supplier.name}</p>
        </div>
      </div>

      {/* Balance Summary */}
      <div className={`rounded-2xl p-5 text-white ${balance > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-700'}`}>
        <p className="text-sm opacity-80">{balance > 0 ? 'الرصيد المستحق للمورد' : 'الحساب مسدد'}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(Math.abs(balance), currency)}</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2">بيانات الدفعة</h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">المبلغ *</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="0"
              required
              className={cls}
            />
            {balance > 0 && (
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, amount: balance.toFixed(0) }))}
                className="mt-1.5 text-xs text-blue-600 hover:underline"
              >
                دفع كامل المبلغ ({formatCurrency(balance, currency)})
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className={cls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
            <input
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className={cls}
              placeholder="رقم الحوالة أو ملاحظة..."
            />
          </div>
        </div>

        {form.amount && parseFloat(form.amount) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-green-700">المبلغ المراد دفعه</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(parseFloat(form.amount), currency)}</p>
            {balance > 0 && parseFloat(form.amount) < balance && (
              <p className="text-xs text-green-600 mt-1">
                المتبقي بعد الدفع: {formatCurrency(balance - parseFloat(form.amount), currency)}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-60 text-sm"
        >
          {saving ? 'جاري التسجيل...' : '✓ تسجيل الدفعة'}
        </button>
      </form>
    </div>
  )
}

const cls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'
