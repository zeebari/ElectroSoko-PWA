import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

const TYPE_CONFIG = {
  cash:         { label: 'نقد',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  credit:       { label: 'دين',   bg: 'bg-orange-100',  text: 'text-orange-700'  },
  installments: { label: 'أقساط', bg: 'bg-blue-100',    text: 'text-blue-700'    },
}

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState({})
  const [paidBySale, setPaidBySale] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
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

  const creditSales = sales.filter(s => s.payment_type === 'credit')
  const totalOutstandingIQD = creditSales
    .filter(s => s.currency === 'IQD')
    .reduce((sum, s) => sum + Math.max(0, parseFloat(s.total_amount) - (paidBySale[s.id] || 0)), 0)
  const totalOutstandingUSD = creditSales
    .filter(s => s.currency === 'USD')
    .reduce((sum, s) => sum + Math.max(0, parseFloat(s.total_amount) - (paidBySale[s.id] || 0)), 0)

  const filtered = sales
    .filter(s => filter === 'all' || s.payment_type === filter)
    .filter(s => {
      if (!search) return true
      const cust = customers[s.customer_id]
      return (
        cust?.name?.toLowerCase().includes(search.toLowerCase()) ||
        String(s.id).includes(search)
      )
    })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">المبيعات</h1>
        <Link
          to="/sales/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          بيع جديد+
        </Link>
      </div>

      {/* Outstanding Debts Alert */}
      {(totalOutstandingIQD > 0 || totalOutstandingUSD > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-800 mb-1">ديون مستحقة</p>
            <div className="flex gap-4">
              {totalOutstandingIQD > 0 && <span className="text-base font-bold text-orange-700">{formatCurrency(totalOutstandingIQD, 'IQD')}</span>}
              {totalOutstandingUSD > 0 && <span className="text-base font-bold text-orange-700">{formatCurrency(totalOutstandingUSD, 'USD')}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Card header: filter tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'all',          label: 'الكل'   },
              { key: 'cash',         label: 'نقد'    },
              { key: 'credit',       label: 'دين'    },
              { key: 'installments', label: 'أقساط'  },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث..."
              className="border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 text-right"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-right">رقم البيع</th>
                <th className="px-5 py-3 text-right">الزبون</th>
                <th className="px-5 py-3 text-right">النوع</th>
                <th className="px-5 py-3 text-right">الإجمالي</th>
                <th className="px-5 py-3 text-right">المدفوع</th>
                <th className="px-5 py-3 text-right">الحالة</th>
                <th className="px-5 py-3 text-right">التاريخ</th>
                <th className="px-5 py-3 text-right">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-slate-400">
                    <p className="text-sm">لا توجد مبيعات</p>
                    <Link to="/sales/new" className="text-blue-600 text-sm mt-1 inline-block">+ بيع جديد</Link>
                  </td>
                </tr>
              ) : filtered.map(sale => {
                const cust = customers[sale.customer_id]
                const paid = paidBySale[sale.id] || 0
                const total = parseFloat(sale.total_amount || 0)
                const remaining = Math.max(0, total - paid)
                const typeInfo = TYPE_CONFIG[sale.payment_type] || TYPE_CONFIG.cash
                const isPaid = remaining <= 0
                const detailLink = sale.payment_type === 'installments' && sale.plan_id
                  ? `/plans/${sale.plan_id}`
                  : `/sales/${sale.id}`

                return (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">#{String(sale.id).slice(-6)}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{cust?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeInfo.bg} ${typeInfo.text}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatCurrency(total, sale.currency)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatCurrency(paid, sale.currency)}</td>
                    <td className="px-5 py-3.5">
                      {isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">مسدّد</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">متبقي</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(sale.date || sale.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={detailLink}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        عرض
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} عملية بيع
          </div>
        )}
      </div>
    </div>
  )
}
