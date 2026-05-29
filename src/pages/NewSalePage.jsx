import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

function buildSchedule(startDate, count, monthly) {
  const schedule = []
  const start = new Date(startDate || new Date())
  for (let i = 0; i < count; i++) {
    const due = new Date(start)
    due.setMonth(due.getMonth() + i + 1)
    schedule.push({
      installmentNumber: i + 1,
      dueDate: due.toISOString().split('T')[0],
      amount: parseFloat(monthly) || 0,
      paid: false,
      paidDate: null,
      paidAmount: 0,
    })
  }
  return schedule
}

export default function NewSalePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preCustomer = searchParams.get('customerId')

  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [customerId, setCustomerId] = useState(preCustomer || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [paymentType, setPaymentType] = useState('cash') // cash | credit | installments
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }])
  const [downPayment, setDownPayment] = useState(0)
  const [installmentCount, setInstallmentCount] = useState(12)
  const [interestRate, setInterestRate] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: custs }, { data: prods }] = await Promise.all([
      supabase.from('customers').select('id,name,currency').eq('user_id', user.id).order('name'),
      supabase.from('products').select('id,name,sell_price,currency').eq('user_id', user.id).order('name'),
    ])
    setCustomers(custs || [])
    setProducts(prods || [])
  }

  const customer = customers.find(c => c.id === customerId)
  const currency = customer?.currency || 'IQD'

  function setItem(idx, field, value) {
    setItems(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === value)
        if (prod) {
          updated[idx].product_name = prod.name
          updated[idx].unit_price = prod.sell_price || 0
        }
      }
      return updated
    })
  }

  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0), 0)
  const dp = parseFloat(downPayment) || 0
  const count = parseInt(installmentCount) || 1
  const interest = (totalAmount * (parseFloat(interestRate) || 0) / 100) * (count / 12)
  const financeAmount = totalAmount + interest - dp
  const monthly = count > 0 ? financeAmount / count : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!customerId) { setError('اختر الزبون'); return }
    if (!items[0].product_name) { setError('أضف منتجاً واحداً على الأقل'); return }
    setSaving(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const saleId = crypto.randomUUID()

    // Create plan first if installments
    let planId = null
    if (paymentType === 'installments') {
      planId = crypto.randomUUID()
      const schedule = buildSchedule(date, count, monthly)
      const productNames = items.filter(i => i.product_name).map(i => i.product_name).join(', ')
      await supabase.from('plans').insert({
        id: planId,
        customerId,
        description: notes || productNames,
        totalAmount,
        downPayment: dp,
        totalInterest: interest,
        installmentCount: count,
        interestRate: parseFloat(interestRate) || 0,
        interestType: interestRate > 0 ? 'simple' : 'none',
        monthlyAmount: monthly,
        startDate: date,
        schedule,
        status: 'active',
        currency,
        user_id: user.id,
        createdAt: now,
      })
    }

    // Create sale
    const { error: saleErr } = await supabase.from('sales').insert({
      id: saleId,
      customer_id: customerId,
      date,
      total_amount: totalAmount,
      down_payment: dp,
      payment_type: paymentType,
      currency,
      notes,
      plan_id: planId,
      user_id: user.id,
      created_at: now,
    })
    if (saleErr) { setError(saleErr.message); setSaving(false); return }

    // Create sale items + update inventory
    for (const item of items) {
      if (!item.product_name || !item.quantity) continue
      const qty = parseInt(item.quantity)
      const price = parseFloat(item.unit_price) || 0

      await supabase.from('sale_items').insert({
        id: crypto.randomUUID(),
        sale_id: saleId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: qty,
        unit_price: price,
        total: qty * price,
        user_id: user.id,
      })

      if (item.product_id) {
        const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
        if (prod) {
          await supabase.from('products').update({
            quantity: Math.max(0, (prod.quantity || 0) - qty),
            updated_at: now,
          }).eq('id', item.product_id)
        }
      }
    }

    if (paymentType === 'installments') navigate(`/plans/${planId}`)
    else navigate(`/sales/${saleId}`)
  }

  const payTypes = [
    { key: 'cash', label: 'نقد', emoji: '💵', color: 'green' },
    { key: 'credit', label: 'دين', emoji: '📋', color: 'orange' },
    { key: 'installments', label: 'أقساط', emoji: '📅', color: 'blue' },
  ]

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">بيع جديد</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      {/* Total preview */}
      {totalAmount > 0 && (
        <div className={`text-white rounded-2xl p-4 flex justify-between items-center ${
          paymentType === 'cash' ? 'bg-green-600' : paymentType === 'credit' ? 'bg-orange-500' : 'bg-blue-600'
        }`}>
          <span className="text-sm opacity-80">إجمالي الفاتورة</span>
          <span className="font-bold text-xl">{formatCurrency(totalAmount, currency)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer + Date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2">بيانات البيع</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الزبون *</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={cls} required>
              <option value="">اختر الزبون...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={cls} placeholder="وصف البيع..." />
          </div>
        </div>

        {/* Payment Type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2 mb-3">طريقة الدفع</h3>
          <div className="grid grid-cols-3 gap-2">
            {payTypes.map(({ key, label, emoji, color }) => (
              <button key={key} type="button" onClick={() => setPaymentType(key)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                  paymentType === key
                    ? color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                      : color === 'orange' ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500'
                }`}>
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Installment Fields */}
        {paymentType === 'installments' && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-3">
            <h3 className="font-semibold text-blue-800 text-sm">إعدادات الأقساط</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-blue-700 mb-1">الدفعة الأولى</label>
                <input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)}
                  className={cls} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">عدد الأقساط</label>
                <input type="number" value={installmentCount} min="1" onChange={e => setInstallmentCount(e.target.value)}
                  className={cls} />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">نسبة الفائدة %</label>
                <input type="number" value={interestRate} step="0.1" onChange={e => setInterestRate(e.target.value)}
                  className={cls} placeholder="0" />
              </div>
            </div>
            {totalAmount > 0 && (
              <div className="bg-white rounded-xl p-3 text-sm">
                {dp > 0 && <div className="flex justify-between"><span className="text-slate-500">الدفعة الأولى</span><span className="font-bold text-slate-800">{formatCurrency(dp, currency)}</span></div>}
                {interest > 0 && <div className="flex justify-between"><span className="text-slate-500">الفائدة</span><span className="font-bold text-orange-600">{formatCurrency(interest, currency)}</span></div>}
                <div className="flex justify-between border-t border-slate-100 mt-2 pt-2">
                  <span className="text-slate-500">القسط الشهري ({count} شهر)</span>
                  <span className="font-bold text-blue-700">{formatCurrency(monthly, currency)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-700 text-sm">المنتجات</h3>
            <button type="button" onClick={() => setItems(p => [...p, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }])}
              className="text-blue-600 text-xs font-semibold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              إضافة
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">منتج {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 text-xs">حذف</button>
                )}
              </div>

              <select value={item.product_id} onChange={e => setItem(idx, 'product_id', e.target.value)} className={cls}>
                <option value="">اختر من المخزن...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__manual__">✏️ إدخال يدوي</option>
              </select>

              {(item.product_id === '__manual__' || (!item.product_id && item.product_name)) && (
                <input value={item.product_name} onChange={e => setItem(idx, 'product_name', e.target.value)}
                  className={cls} placeholder="اسم المنتج" />
              )}
              {item.product_id && item.product_id !== '__manual__' && item.product_name && (
                <p className="text-xs text-blue-600">✓ {item.product_name}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">الكمية</label>
                  <input type="number" value={item.quantity} min="1"
                    onChange={e => setItem(idx, 'quantity', e.target.value)} className={cls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">سعر البيع</label>
                  <input type="number" value={item.unit_price} step="0.01"
                    onChange={e => setItem(idx, 'unit_price', e.target.value)} className={cls} />
                </div>
              </div>

              {item.quantity > 0 && item.unit_price > 0 && (
                <p className="text-xs text-slate-500 text-left">
                  المجموع: {formatCurrency(item.quantity * item.unit_price, currency)}
                </p>
              )}
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving}
          className={`w-full text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-60 text-sm ${
            paymentType === 'cash' ? 'bg-green-600 hover:bg-green-700'
            : paymentType === 'credit' ? 'bg-orange-500 hover:bg-orange-600'
            : 'bg-blue-600 hover:bg-blue-700'
          }`}>
          {saving ? 'جاري الحفظ...' : paymentType === 'cash' ? '✓ تسجيل بيع نقدي' : paymentType === 'credit' ? '✓ تسجيل دين' : '✓ إنشاء خطة أقساط'}
        </button>
      </form>
    </div>
  )
}

const cls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'
