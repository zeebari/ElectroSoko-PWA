import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

const TYPE_LABELS = {
  cash: { label: 'نقد', emoji: '💵', color: 'green' },
  credit: { label: 'دين', emoji: '📋', color: 'orange' },
  installments: { label: 'أقساط', emoji: '📅', color: 'blue' },
}

export default function SaleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sale, setSale] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNotes, setPayNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: saleData }, { data: itemsData }, { data: paymentsData }] = await Promise.all([
      supabase.from('sales').select('*').eq('id', id).single(),
      supabase.from('sale_items').select('*').eq('sale_id', id),
      supabase.from('sale_payments').select('*').eq('sale_id', id).order('created_at'),
    ])
    setSale(saleData)
    setItems(itemsData || [])
    setPayments(paymentsData || [])

    if (saleData?.customer_id) {
      const { data: cust } = await supabase.from('customers').select('*').eq('id', saleData.customer_id).single()
      setCustomer(cust)
    }
    setLoading(false)
  }

  async function addPayment(e) {
    e.preventDefault()
    if (!payAmount || parseFloat(payAmount) <= 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('sale_payments').insert({
      id: crypto.randomUUID(),
      sale_id: id,
      amount: parseFloat(payAmount),
      currency: sale.currency,
      date: payDate,
      notes: payNotes,
      user_id: user.id,
      created_at: new Date().toISOString(),
    })
    setPayAmount(''); setPayNotes(''); setShowPayForm(false)
    loadData()
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  if (!sale) return null

  const currency = sale.currency || 'IQD'
  const typeInfo = TYPE_LABELS[sale.payment_type] || TYPE_LABELS.cash
  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const remaining = Math.max(0, parseFloat(sale.total_amount) - totalPaid)

  const whatsappMsg = customer?.phone ? encodeURIComponent(
    `مرحباً ${customer.name} 👋\nفاتورة من إلكترو سوقو\nالتاريخ: ${formatDate(sale.date)}\n─────────────────\nالإجمالي: ${formatCurrency(sale.total_amount, currency)}\n${sale.payment_type === 'credit' ? `المدفوع: ${formatCurrency(totalPaid, currency)}\nالمتبقي: ${formatCurrency(remaining, currency)}` : 'مدفوع بالكامل ✓'}\n─────────────────\nشكراً لتعاملكم معنا 🙏`
  ) : null

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">تفاصيل البيع</h1>
          <p className="text-sm text-slate-500">{customer?.name || '—'}</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className={`rounded-2xl p-5 text-white ${
        typeInfo.color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-700'
        : typeInfo.color === 'orange' ? (remaining > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-700')
        : 'bg-gradient-to-br from-blue-500 to-blue-700'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{typeInfo.emoji}</span>
          <span className="text-sm opacity-80">{typeInfo.label} · {formatDate(sale.date)}</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(sale.total_amount, currency)}</p>
        {sale.payment_type === 'credit' && (
          <div className="mt-3 grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-3 text-sm">
            <div><p className="opacity-70 text-xs">المدفوع</p><p className="font-bold">{formatCurrency(totalPaid, currency)}</p></div>
            <div><p className="opacity-70 text-xs">المتبقي</p><p className="font-bold">{formatCurrency(remaining, currency)}</p></div>
          </div>
        )}
      </div>

      {/* Actions for credit */}
      {sale.payment_type === 'credit' && remaining > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowPayForm(!showPayForm)}
            className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-2xl text-sm font-semibold">
            💰 تسجيل دفعة
          </button>
          {whatsappMsg && (
            <a href={`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}?text=${whatsappMsg}`}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-2xl text-sm font-semibold">
              واتساب
            </a>
          )}
        </div>
      )}

      {sale.payment_type === 'cash' && whatsappMsg && (
        <a href={`https://wa.me/${customer?.phone?.replace(/[^0-9]/g, '')}?text=${whatsappMsg}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-2xl text-sm font-semibold">
          واتساب — إرسال الفاتورة
        </a>
      )}

      {/* Payment Form */}
      {showPayForm && (
        <form onSubmit={addPayment} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">💰 تسجيل دفعة</h3>
          <div>
            <label className="block text-xs text-slate-600 mb-1">المبلغ *</label>
            <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              className={cls} placeholder="0" required />
            {remaining > 0 && (
              <button type="button" onClick={() => setPayAmount(remaining.toFixed(0))}
                className="mt-1 text-xs text-blue-600 hover:underline">
                دفع كامل المتبقي ({formatCurrency(remaining, currency)})
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">التاريخ</label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">ملاحظات</label>
            <input value={payNotes} onChange={e => setPayNotes(e.target.value)} className={cls} placeholder="ملاحظة..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {saving ? 'جاري...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setShowPayForm(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm">إلغاء</button>
          </div>
        </form>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">المنتجات ({items.length})</h3>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-400 text-sm">لا توجد مواد</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{item.product_name}</p>
                  <p className="text-xs text-slate-500">{item.quantity} × {formatCurrency(item.unit_price, currency)}</p>
                </div>
                <p className="font-bold text-slate-800">{formatCurrency(item.total, currency)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <span className="font-bold text-slate-700 text-sm">الإجمالي</span>
              <span className="font-bold text-lg text-slate-800">{formatCurrency(sale.total_amount, currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment History (credit sales) */}
      {sale.payment_type === 'credit' && payments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">سجل الدفعات</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-green-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">💰 دفعة</span>
                    <span className="text-xs text-slate-400">{formatDate(p.date)}</span>
                  </div>
                  {p.notes && <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>}
                </div>
                <p className="font-bold text-green-700">{formatCurrency(p.amount, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer link */}
      {customer && (
        <Link to={`/customers/${customer.id}`}
          className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-blue-700 font-bold">{customer.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{customer.name}</p>
              <p className="text-xs text-slate-500">عرض ملف الزبون</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-400 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </Link>
      )}
    </div>
  )
}

const cls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'
