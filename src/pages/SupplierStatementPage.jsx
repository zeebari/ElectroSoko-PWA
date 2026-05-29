import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

export default function SupplierStatementPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [entries, setEntries] = useState([]) // combined purchases + payments sorted by date
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: sup }, { data: purchases }, { data: payments }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('supplier_purchases').select('*, items:supplier_purchase_items(*)').eq('supplier_id', id).order('created_at'),
      supabase.from('supplier_payments').select('*').eq('supplier_id', id).order('created_at'),
    ])
    setSupplier(sup)

    const combined = [
      ...(purchases || []).map(p => ({ ...p, _type: 'purchase' })),
      ...(payments || []).map(p => ({ ...p, _type: 'payment' })),
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    setEntries(combined)
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  if (!supplier) return null

  const currency = supplier.currency || 'IQD'

  // Calculate running balance
  let runningBalance = 0
  const entriesWithBalance = entries.map(e => {
    if (e._type === 'purchase') runningBalance += parseFloat(e.total_amount || 0)
    else runningBalance -= parseFloat(e.amount || 0)
    return { ...e, balance: runningBalance }
  })

  const totalPurchases = entries.filter(e => e._type === 'purchase').reduce((s, e) => s + parseFloat(e.total_amount || 0), 0)
  const totalPaid = entries.filter(e => e._type === 'payment').reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const balance = totalPurchases - totalPaid

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">كشف حساب</h1>
          <p className="text-sm text-slate-500">{supplier.name}</p>
        </div>
      </div>

      {/* Summary */}
      <div className={`rounded-2xl p-5 text-white ${balance > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-700'}`}>
        <p className="text-sm opacity-80">{balance > 0 ? 'الرصيد المستحق للمورد' : 'الحساب مسدد / رصيد دائن'}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(Math.abs(balance), currency)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-3">
          <div>
            <p className="text-xs opacity-70">إجمالي المشتريات</p>
            <p className="font-bold">{formatCurrency(totalPurchases, currency)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">إجمالي المدفوع</p>
            <p className="font-bold">{formatCurrency(totalPaid, currency)}</p>
          </div>
        </div>
      </div>

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

      {/* Statement */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm">كشف الحساب التفصيلي</h3>
          <span className="text-xs text-slate-400">{entries.length} حركة</span>
        </div>

        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400 text-sm">لا توجد معاملات بعد</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {entriesWithBalance.map((entry, idx) => (
              <div key={idx} className={`px-4 py-3 ${entry._type === 'payment' ? 'bg-green-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        entry._type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {entry._type === 'purchase' ? '📦 شراء' : '💰 دفعة'}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(entry.date || entry.created_at)}</span>
                    </div>

                    {entry._type === 'purchase' && entry.items?.length > 0 && (
                      <div className="space-y-0.5">
                        {entry.items.map((item, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            • {item.product_name} × {item.quantity} = {formatCurrency(item.total, currency)}
                          </p>
                        ))}
                      </div>
                    )}

                    {entry.notes && <p className="text-xs text-slate-400 mt-0.5">{entry.notes}</p>}
                  </div>

                  <div className="text-left shrink-0">
                    <p className={`font-bold ${entry._type === 'purchase' ? 'text-red-600' : 'text-green-700'}`}>
                      {entry._type === 'purchase' ? '+' : '-'}{formatCurrency(entry._type === 'purchase' ? entry.total_amount : entry.amount, currency)}
                    </p>
                    <p className={`text-xs font-medium ${entry.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      رصيد: {formatCurrency(Math.abs(entry.balance), currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
              <span className="font-bold text-slate-700 text-sm">الرصيد النهائي</span>
              <span className={`font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatCurrency(Math.abs(balance), currency)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
