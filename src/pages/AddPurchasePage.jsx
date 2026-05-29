import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

export default function AddPurchasePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSupplier = searchParams.get('supplierId')

  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [supplierId, setSupplierId] = useState(preSupplier || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: sups }, { data: prods }] = await Promise.all([
      supabase.from('suppliers').select('id,name,currency').eq('user_id', user.id).order('name'),
      supabase.from('products').select('id,name,purchase_price,currency').eq('user_id', user.id).order('name'),
    ])
    setSuppliers(sups || [])
    setProducts(prods || [])
  }

  const supplier = suppliers.find(s => s.id === supplierId)
  const currency = supplier?.currency || 'IQD'

  function setItem(idx, field, value) {
    setItems(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === value)
        if (prod) {
          updated[idx].product_name = prod.name
          updated[idx].unit_price = prod.purchase_price || 0
        }
      }
      return updated
    })
  }

  function addItem() {
    setItems(prev => [...prev, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }])
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0), 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supplierId) { setError('اختر الشركة / المورد'); return }
    if (items.length === 0 || !items[0].product_name) { setError('أضف مادة واحدة على الأقل'); return }

    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const purchaseId = crypto.randomUUID()

    // 1. Create purchase record
    const { error: purchaseErr } = await supabase.from('supplier_purchases').insert({
      id: purchaseId,
      supplier_id: supplierId,
      date,
      total_amount: totalAmount,
      currency,
      notes,
      user_id: user.id,
      created_at: now,
    })
    if (purchaseErr) { setError(purchaseErr.message); setSaving(false); return }

    // 2. Create purchase items + update product quantities
    for (const item of items) {
      if (!item.product_name || !item.quantity) continue
      const qty = parseInt(item.quantity)
      const price = parseFloat(item.unit_price) || 0
      const itemId = crypto.randomUUID()

      await supabase.from('supplier_purchase_items').insert({
        id: itemId,
        purchase_id: purchaseId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: qty,
        unit_price: price,
        total: qty * price,
        user_id: user.id,
      })

      // Auto-update product quantity if linked to a product
      if (item.product_id) {
        const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
        if (prod) {
          await supabase.from('products').update({
            quantity: (prod.quantity || 0) + qty,
            updated_at: now,
          }).eq('id', item.product_id)
        }
      }
    }

    navigate(`/suppliers/${supplierId}`)
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">تسجيل وصول بضاعة</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

      {/* Total Preview */}
      {totalAmount > 0 && (
        <div className="bg-blue-600 text-white rounded-2xl p-4 flex justify-between items-center">
          <span className="text-blue-200 text-sm">إجمالي الفاتورة</span>
          <span className="font-bold text-xl">{formatCurrency(totalAmount, currency)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier + Date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm border-b border-slate-100 pb-2">بيانات الفاتورة</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الشركة / المورد *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={cls} required>
              <option value="">اختر الشركة...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={cls} placeholder="رقم الفاتورة أو ملاحظة..." />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-700 text-sm">المواد المستلمة</h3>
            <button type="button" onClick={addItem}
              className="text-blue-600 text-xs font-semibold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              إضافة مادة
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">مادة {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 text-xs hover:text-red-600">حذف</button>
                )}
              </div>

              {/* Product selector */}
              <select value={item.product_id} onChange={e => setItem(idx, 'product_id', e.target.value)} className={cls}>
                <option value="">اختر من المخزن...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__manual__">✏️ إدخال يدوي</option>
              </select>

              {/* Manual product name if not from list */}
              {(item.product_id === '__manual__' || (!item.product_id && item.product_name)) && (
                <input value={item.product_name} onChange={e => setItem(idx, 'product_name', e.target.value)}
                  className={cls} placeholder="اسم المادة" required />
              )}
              {item.product_id && item.product_id !== '__manual__' && item.product_name && (
                <p className="text-xs text-blue-600 font-medium">✓ {item.product_name} — سيتم تحديث المخزون تلقائياً</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">الكمية</label>
                  <input type="number" value={item.quantity} min="1"
                    onChange={e => setItem(idx, 'quantity', e.target.value)}
                    className={cls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">سعر الوحدة</label>
                  <input type="number" value={item.unit_price} step="0.01"
                    onChange={e => setItem(idx, 'unit_price', e.target.value)}
                    className={cls} placeholder="0" />
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-60 text-sm">
          {saving ? 'جاري الحفظ وتحديث المخزون...' : '✓ تسجيل الوصول وتحديث المخزون'}
        </button>
      </form>
    </div>
  )
}

const cls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right'
