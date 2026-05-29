import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adjQty, setAdjQty] = useState('')
  const [adjType, setAdjType] = useState('add')
  const [adjNote, setAdjNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProduct() }, [id])

  async function loadProduct() {
    const { data } = await supabase.from('products').select('*').eq('id', id).single()
    setProduct(data)
    setLoading(false)
  }

  async function adjustStock(e) {
    e.preventDefault()
    if (!adjQty) return
    setSaving(true)
    const change = parseInt(adjQty) * (adjType === 'remove' ? -1 : 1)
    const newQty = Math.max(0, (product.quantity || 0) + change)
    await supabase.from('products').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', id)
    setProduct(p => ({ ...p, quantity: newQty }))
    setAdjQty('')
    setAdjNote('')
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) return
    await supabase.from('products').delete().eq('id', id)
    navigate('/products')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  if (!product) return <div className="p-4 text-slate-400">المادة غير موجودة</div>

  const stockStatus = product.quantity <= 0 ? 'out' : product.quantity <= product.min_quantity ? 'low' : 'ok'
  const profit = (product.sell_price || 0) - (product.purchase_price || 0)
  const profitPct = product.purchase_price > 0 ? ((profit / product.purchase_price) * 100).toFixed(1) : 0
  const stockValue = (product.quantity || 0) * (product.purchase_price || 0)

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">تفاصيل المادة</h1>
        </div>
        <Link to={`/products/${id}/edit`} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </Link>
      </div>

      {/* Product Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            stockStatus === 'out' ? 'bg-red-100' : stockStatus === 'low' ? 'bg-orange-100' : 'bg-blue-50'
          }`}>
            <svg className={`w-7 h-7 ${stockStatus === 'out' ? 'text-red-500' : stockStatus === 'low' ? 'text-orange-500' : 'text-blue-500'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 text-lg">{product.name}</h2>
            {product.category && (
              <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full mt-1">{product.category}</span>
            )}
            {product.description && <p className="text-sm text-slate-500 mt-1">{product.description}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className={`rounded-xl p-3 ${stockStatus === 'out' ? 'bg-red-50' : stockStatus === 'low' ? 'bg-orange-50' : 'bg-green-50'}`}>
            <p className={`text-3xl font-bold ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-orange-600' : 'text-green-700'}`}>
              {product.quantity}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">الكمية</p>
            <span className={`text-xs font-semibold ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-orange-600' : 'text-green-600'}`}>
              {stockStatus === 'out' ? 'نفد' : stockStatus === 'low' ? 'منخفض' : 'متوفر'}
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-sm font-bold text-slate-700">{formatCurrency(product.purchase_price, product.currency)}</p>
            <p className="text-xs text-slate-500 mt-0.5">سعر الشراء</p>
            <p className="text-sm font-bold text-blue-700 mt-1">{formatCurrency(product.sell_price, product.currency)}</p>
            <p className="text-xs text-slate-500">سعر البيع</p>
          </div>
          <div className={`rounded-xl p-3 ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Math.abs(profit), product.currency)}</p>
            <p className="text-xs text-slate-500 mt-0.5">الربح</p>
            <p className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitPct}%</p>
          </div>
        </div>

        {/* Stock Value */}
        <div className="mt-3 bg-blue-50 rounded-xl p-3 flex justify-between items-center">
          <span className="text-sm text-blue-700 font-medium">قيمة المخزون الكلية</span>
          <span className="font-bold text-blue-800">{formatCurrency(stockValue, product.currency)}</span>
        </div>
      </div>

      {/* Stock Adjustment */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">تعديل المخزون</h3>
        <form onSubmit={adjustStock} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAdjType('add')}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${adjType === 'add' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              + إضافة
            </button>
            <button type="button" onClick={() => setAdjType('remove')}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${adjType === 'remove' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              − خصم
            </button>
          </div>
          <input value={adjQty} onChange={e => setAdjQty(e.target.value)} type="number" placeholder="الكمية" min="1"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          <input value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="ملاحظة (اختياري)"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          <button type="submit" disabled={saving || !adjQty}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 text-white ${adjType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
            {saving ? 'جاري...' : adjType === 'add' ? `إضافة ${adjQty || ''} قطعة` : `خصم ${adjQty || ''} قطعة`}
          </button>
        </form>
      </div>

      <button onClick={handleDelete}
        className="w-full text-red-600 border border-red-200 rounded-2xl py-3 text-sm font-medium hover:bg-red-50 transition-colors">
        حذف المادة
      </button>
    </div>
  )
}
