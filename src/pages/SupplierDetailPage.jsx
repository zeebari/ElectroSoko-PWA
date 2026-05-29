import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

export default function SupplierDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('purchase')
  const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: sup }, { data: txns }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('supplier_transactions').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
    ])
    setSupplier(sup)
    setTransactions(txns || [])
    setLoading(false)
  }

  const balance = transactions.reduce((sum, t) => sum + (t.type === 'purchase' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0)
  const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalPaid = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + parseFloat(t.amount), 0)

  async function handleTransaction(e) {
    e.preventDefault()
    if (!form.amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('supplier_transactions').insert({
      id: crypto.randomUUID(),
      supplier_id: id,
      type: formType,
      amount: parseFloat(form.amount),
      currency: supplier.currency,
      description: form.description,
      date: form.date,
      notes: form.notes,
      user_id: user.id,
      created_at: new Date().toISOString(),
    })
    setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0], notes: '' })
    setShowForm(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة؟')) return
    await supabase.from('suppliers').delete().eq('id', id)
    navigate('/suppliers')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  if (!supplier) return null

  const currency = supplier.currency || 'IQD'

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">{supplier.name}</h1>
        </div>
        <Link to={`/suppliers/${id}/edit`} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </Link>
      </div>

      {/* Balance Card */}
      <div className={`rounded-2xl p-5 text-white ${balance > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600' : balance < 0 ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
        <p className="text-sm opacity-80">{balance > 0 ? 'مستحق للمورد' : balance < 0 ? 'رصيد دائن' : 'الحساب مسدد'}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(Math.abs(balance), currency)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="opacity-70 text-xs">إجمالي المشتريات</p>
            <p className="font-semibold">{formatCurrency(totalPurchases, currency)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">إجمالي المدفوع</p>
            <p className="font-semibold">{formatCurrency(totalPaid, currency)}</p>
          </div>
        </div>
      </div>

      {/* Contact */}
      {(supplier.phone || supplier.address) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2 text-sm">
          {supplier.phone && (
            <div className="flex justify-between">
              <span className="text-slate-500">الهاتف</span>
              <a href={`tel:${supplier.phone}`} className="font-medium text-blue-600">{supplier.phone}</a>
            </div>
          )}
          {supplier.address && (
            <div className="flex justify-between">
              <span className="text-slate-500">العنوان</span>
              <span className="font-medium text-slate-800">{supplier.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setFormType('purchase'); setShowForm(true) }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          تسجيل شراء
        </button>
        <button onClick={() => { setFormType('payment'); setShowForm(true) }}
          className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-2xl text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          تسجيل دفعة
        </button>
      </div>

      {/* Transaction Form */}
      {showForm && (
        <form onSubmit={handleTransaction} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">
            {formType === 'purchase' ? '📦 تسجيل شراء جديد' : '💰 تسجيل دفعة للمورد'}
          </h3>
          {[
            ['amount','المبلغ','number','0',true],
            ['description', formType==='purchase'?'الوصف / البضاعة':'ملاحظة الدفعة','text','',false],
          ].map(([f,l,type,ph,req]) => (
            <div key={f}>
              <label className="block text-xs text-slate-600 mb-1">{l}{req && ' *'}</label>
              <input value={form[f]} onChange={e => setForm(p => ({...p,[f]:e.target.value}))}
                type={type} placeholder={ph} required={req}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-slate-600 mb-1">التاريخ</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({...p,date:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className={`flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 ${formType==='purchase'?'bg-blue-600':'bg-green-600'}`}>
              {saving ? 'جاري...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm">إلغاء</button>
          </div>
        </form>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">سجل المعاملات ({transactions.length})</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">لا توجد معاملات بعد</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map(t => (
              <div key={t.id} className={`flex items-center justify-between px-4 py-3 ${t.type==='payment' ? 'bg-green-50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type==='purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {t.type==='purchase' ? 'شراء' : 'دفعة'}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(t.date)}</span>
                  </div>
                  {t.description && <p className="text-xs text-slate-600 mt-0.5">{t.description}</p>}
                </div>
                <p className={`font-bold ${t.type==='purchase' ? 'text-red-600' : 'text-green-700'}`}>
                  {t.type==='purchase' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleDelete}
        className="w-full text-red-600 border border-red-200 rounded-2xl py-3 text-sm font-medium hover:bg-red-50 transition-colors">
        حذف الشركة
      </button>
    </div>
  )
}
