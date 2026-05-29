import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

const TYPE_LABELS = {
  cash: { label: 'نقد', emoji: '💵', bg: 'bg-green-100', text: 'text-green-700' },
  credit: { label: 'دين', emoji: '📋', bg: 'bg-orange-100', text: 'text-orange-700' },
  installments: { label: 'أقساط', emoji: '📅', bg: 'bg-blue-100', text: 'text-blue-700' },
}

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState({})
  const [paidBySale, setPaidBySale] = useState({})
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: salesData }, { data: custsData }, { data: paymentsData }] = await Promise.all([
      supabase.from('sales').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id,name,currency').eq('user_id', user.id),
      supabase.from('sale_payments').select('sale_id,amount').eq('user_id', user.id),
    ])

    const custMap = {}
    ;(custsData || []).forEach(c => { custMap[c.id] = c })

    const paidMap = {}
    ;(paymentsData || []).forEach(p => {
      paidMap[p.sale_id] = (paidMap[p.sale_id] || 0) + parseFloat(p.amount || 0)
    })

    setSales(salesData || [])
    setCustomers(custMap)
    setPaidBySale(paidMap)
    setLoading(false)
  }

  const filtered = filter === 'all' ? sales : sales.filter(s => s.payment_type === filter)

  // Stats
  const creditSales = sales.filter(s => s.payment_type === 'credit')
  const totalOutstandingIQD = creditSales
    .filter(s => s.currency === 'IQD')
    .reduce((sum, s) => sum + Math.max(0, parseFloat(s.total_amount) - (paidBySale[s.id] || 0)), 0)
  const totalOutstandingUSD = creditSales
    .filter(s => s.currency === 'USD')
    .reduce((sum, s) => sum + Math.max(0, parseFloat(s.total_amount) - (paidBySale[s.id] || 0)), 0)

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">المبيعات</h1>
        <Link to="/sales/new"
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          بيع جديد
        </Link>
      </div>

      {/* Outstanding debts */}
      {(totalOutstandingIQD > 0 || totalOutstandingUSD > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-orange-700 mb-2">ديون مستحقة</p>
          <div className="flex gap-4">
            {totalOutstandingIQD > 0 && <div><p className="text-lg font-bold text-orange-800">{formatCurrency(totalOutstandingIQD, 'IQD')}</p></div>}
            {totalOutstandingUSD > 0 && <div><p className="text-lg font-bold text-orange-800">{formatCurrency(totalOutstandingUSD, 'USD')}</p></div>}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'cash', label: '💵 نقد' },
          { key: 'credit', label: '📋 دين' },
          { key: 'installments', label: '📅 أقساط' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{filtered.length} عملية بيع</p>

      {/* Sales List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">لا توجد مبيعات</p>
            <Link to="/sales/new" className="text-blue-600 text-sm mt-2 inline-block">+ بيع جديد</Link>
          </div>
        ) : filtered.map(sale => {
          const cust = customers[sale.customer_id]
          const paid = paidBySale[sale.id] || 0
          const remaining = Math.max(0, parseFloat(sale.total_amount) - paid - (sale.payment_type === 'credit' ? 0 : parseFloat(sale.down_payment || 0)))
          const typeInfo = TYPE_LABELS[sale.payment_type] || TYPE_LABELS.cash
          return (
            <Link key={sale.id} to={sale.payment_type === 'installments' && sale.plan_id ? `/plans/${sale.plan_id}` : `/sales/${sale.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 transition-all active:scale-[0.99]">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${typeInfo.bg}`}>
                <span className="text-xl">{typeInfo.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{cust?.name || '—'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.text}`}>{typeInfo.label}</span>
                  <span className="text-xs text-slate-400">{formatDate(sale.date)}</span>
                </div>
                {sale.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{sale.notes}</p>}
              </div>
              <div className="text-left shrink-0">
                <p className="font-bold text-slate-800">{formatCurrency(sale.total_amount, sale.currency)}</p>
                {sale.payment_type === 'credit' && remaining > 0 && (
                  <p className="text-xs text-orange-600">متبقي: {formatCurrency(remaining, sale.currency)}</p>
                )}
                {sale.payment_type === 'credit' && remaining <= 0 && (
                  <p className="text-xs text-green-600">مسدد ✓</p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
