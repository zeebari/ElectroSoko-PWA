import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

export default function SupplierDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: sup }, { data: purch }, { data: pays }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('supplier_purchases').select('*, items:supplier_purchase_items(*)').eq('supplier_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('supplier_payments').select('*').eq('supplier_id', id).order('created_at', { ascending: false }).limit(5),
    ])
    setSupplier(sup)
    setPurchases(purch || [])
    setPayments(pays || [])
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة؟')) return
    await supabase.from('suppliers').delete().eq('id', id)
    navigate('/suppliers')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  if (!supplier) return null

  const currency = supplier.currency || 'IQD'
  const totalPurchases = purchases.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)
  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  // We only have the last 5 of each — fetch full totals separately via running balance shown on statement
  const recentBalance = totalPurchases - totalPaid

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
          {supplier.notes && (
            <div className="flex justify-between">
              <span className="text-slate-500">ملاحظات</span>
              <span className="font-medium text-slate-800">{supplier.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link to={`/purchases/new?supplierId=${id}`}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold">
          📦 وصول بضاعة
        </Link>
        <Link to={`/suppliers/${id}/pay`}
          className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-2xl text-sm font-semibold">
          💰 تسجيل دفعة
        </Link>
      </div>

      {/* Statement link */}
      <Link to={`/suppliers/${id}/statement`}
        className="flex items-center justify-between bg-slate-800 text-white rounded-2xl p-4 shadow-sm">
        <div>
          <p className="font-semibold text-sm">كشف الحساب الكامل</p>
          <p className="text-xs text-slate-400 mt-0.5">{purchases.length + payments.length}+ حركة · عرض التفاصيل</p>
        </div>
        <svg className="w-5 h-5 text-slate-400 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </Link>

      {/* Recent Purchases */}
      {purchases.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm">آخر الوصولات</h3>
            <Link to={`/suppliers/${id}/statement`} className="text-blue-600 text-xs">الكل</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {purchases.map(p => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">📦 شراء</span>
                      <span className="text-xs text-slate-400">{formatDate(p.date || p.created_at)}</span>
                    </div>
                    {p.items?.length > 0 && (
                      <div className="space-y-0.5">
                        {p.items.slice(0, 2).map((item, i) => (
                          <p key={i} className="text-xs text-slate-600">• {item.product_name} × {item.quantity}</p>
                        ))}
                        {p.items.length > 2 && <p className="text-xs text-slate-400">و {p.items.length - 2} أخرى...</p>}
                      </div>
                    )}
                    {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <p className="font-bold text-red-600 shrink-0">+{formatCurrency(p.total_amount, currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm">آخر الدفعات</h3>
            <Link to={`/suppliers/${id}/statement`} className="text-blue-600 text-xs">الكل</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-green-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">💰 دفعة</span>
                    <span className="text-xs text-slate-400">{formatDate(p.date || p.created_at)}</span>
                  </div>
                  {p.notes && <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>}
                </div>
                <p className="font-bold text-green-700">-{formatCurrency(p.amount, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {purchases.length === 0 && payments.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm shadow-sm border border-slate-100">
          لا توجد معاملات بعد
        </div>
      )}

      <button onClick={handleDelete}
        className="w-full text-red-600 border border-red-200 rounded-2xl py-3 text-sm font-medium hover:bg-red-50 transition-colors">
        حذف الشركة
      </button>
    </div>
  )
}
