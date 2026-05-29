import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/i18n'

const CATEGORY_EMOJI = {
  rent: '🏠', salaries: '👥', electricity: '⚡',
  transport: '🚗', maintenance: '🔧', other: '📌',
}
const CATEGORY_LABEL = {
  rent: 'إيجار', salaries: 'رواتب', electricity: 'كهرباء',
  transport: 'مواصلات', maintenance: 'صيانة', other: 'أخرى',
}

const PERIODS = [
  { id: 'month', label: 'هذا الشهر' },
  { id: '3months', label: 'آخر 3 أشهر' },
  { id: 'year', label: 'هذه السنة' },
]

function getPeriodRange(periodId) {
  const now = new Date()
  let start, end
  if (periodId === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  } else if (periodId === '3months') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  } else {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function ProfitReportPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    loadData(period)
  }, [period])

  async function loadData(periodId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { start, end } = getPeriodRange(periodId)

    const [salesRes, expensesRes] = await Promise.all([
      supabase.from('sales')
        .select('id, total_amount, currency, payment_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end),
      supabase.from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false }),
    ])

    const sales = salesRes.data || []
    const expenses = expensesRes.data || []

    // Revenue breakdown by payment type
    const toIQD = (amt, cur) => parseFloat(amt || 0) * (cur === 'USD' ? 1300 : 1)

    const cashSales = sales.filter(s => s.payment_type === 'cash')
    const creditSales = sales.filter(s => s.payment_type === 'credit')
    const installmentSales = sales.filter(s => s.payment_type === 'installment')

    const revCash = cashSales.reduce((s, x) => s + toIQD(x.total_amount, x.currency), 0)
    const revCredit = creditSales.reduce((s, x) => s + toIQD(x.total_amount, x.currency), 0)
    const revInstallment = installmentSales.reduce((s, x) => s + toIQD(x.total_amount, x.currency), 0)
    const totalRevenue = revCash + revCredit + revInstallment

    // COGS
    const saleIds = sales.map(s => s.id)
    let cogs = 0
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase.from('sale_items')
        .select('quantity, product_id, unit_price')
        .in('sale_id', saleIds)

      if (saleItems && saleItems.length > 0) {
        const productIds = [...new Set(saleItems.map(i => i.product_id).filter(Boolean))]
        let purchasePrices = {}
        if (productIds.length > 0) {
          const { data: products } = await supabase.from('products')
            .select('id, purchase_price')
            .in('id', productIds)
          ;(products || []).forEach(p => { purchasePrices[p.id] = parseFloat(p.purchase_price || 0) })
        }
        cogs = saleItems.reduce((s, item) => {
          const cost = item.product_id ? (purchasePrices[item.product_id] || 0) : 0
          return s + cost * parseFloat(item.quantity || 0)
        }, 0)
      }
    }

    // Expenses by category
    const expByCategory = {}
    expenses.forEach(e => {
      const amt = toIQD(e.amount, e.currency)
      expByCategory[e.category] = (expByCategory[e.category] || 0) + amt
    })
    const totalExpenses = Object.values(expByCategory).reduce((s, v) => s + v, 0)

    const grossProfit = totalRevenue - cogs
    const netProfit = grossProfit - totalExpenses
    const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

    setData({
      revCash, revCredit, revInstallment, totalRevenue,
      cogs, grossProfit, margin,
      expByCategory, totalExpenses,
      netProfit, netMargin,
      expenses,
    })
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">تقرير الأرباح والخسائر</h1>
          <p className="text-sm text-slate-500">قائمة الدخل التفصيلية</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100 gap-1">
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">جاري التحميل...</div>
      ) : (
        <>
          {/* Net Profit Hero */}
          <div className={`rounded-2xl p-5 text-white shadow-md ${
            data.netProfit >= 0
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-red-500 to-rose-700'
          }`}>
            <p className="text-sm opacity-80 mb-1">صافي الربح</p>
            <p className="text-4xl font-extrabold" style={{ letterSpacing: '-1px' }}>
              {data.netProfit >= 0 ? '+' : ''}{formatCurrency(data.netProfit, 'IQD')}
            </p>
            <p className="text-sm opacity-70 mt-1">هامش صافي الربح: {data.netMargin}%</p>
          </div>

          {/* Income Statement */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            {/* Revenue Section */}
            <SectionHeader title="الإيرادات" color="bg-blue-50 text-blue-800" />
            <PLRow label="مبيعات نقدية" value={formatCurrency(data.revCash, 'IQD')} indent />
            <PLRow label="مبيعات دين" value={formatCurrency(data.revCredit, 'IQD')} indent />
            <PLRow label="مبيعات أقساط" value={formatCurrency(data.revInstallment, 'IQD')} indent />
            <PLRow label="إجمالي الإيرادات" value={formatCurrency(data.totalRevenue, 'IQD')} total valueColor="text-blue-700" />

            <div className="border-t-4 border-slate-100" />

            {/* COGS */}
            <SectionHeader title="تكلفة البضائع المباعة" color="bg-purple-50 text-purple-800" />
            <PLRow label="تكلفة المواد المباعة" value={`− ${formatCurrency(data.cogs, 'IQD')}`} indent valueColor="text-red-600" />
            <PLRow
              label={`مجمل الربح (${data.margin}%)`}
              value={formatCurrency(data.grossProfit, 'IQD')}
              total
              valueColor={data.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}
            />

            <div className="border-t-4 border-slate-100" />

            {/* Operating Expenses */}
            <SectionHeader title="المصاريف التشغيلية" color="bg-amber-50 text-amber-800" />
            {Object.entries(data.expByCategory).map(([cat, amt]) => (
              <PLRow
                key={cat}
                label={`${CATEGORY_EMOJI[cat] || '📌'} ${CATEGORY_LABEL[cat] || cat}`}
                value={`− ${formatCurrency(amt, 'IQD')}`}
                indent
                valueColor="text-amber-700"
              />
            ))}
            {Object.keys(data.expByCategory).length === 0 && (
              <PLRow label="لا توجد مصاريف مسجلة" value="—" indent valueColor="text-slate-400" />
            )}
            <PLRow
              label="إجمالي المصاريف"
              value={`− ${formatCurrency(data.totalExpenses, 'IQD')}`}
              total
              valueColor="text-amber-700"
            />

            <div className="border-t-4 border-slate-100" />

            {/* Net Profit */}
            <div className={`px-4 py-4 flex items-center justify-between ${
              data.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              <span className={`font-bold text-base ${data.netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                صافي الربح
              </span>
              <span className={`font-extrabold text-lg ${data.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                style={{ letterSpacing: '-0.5px' }}>
                {data.netProfit >= 0 ? '+' : ''}{formatCurrency(data.netProfit, 'IQD')}
              </span>
            </div>
          </div>

          {/* Expense Details */}
          {data.expenses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">تفاصيل المصاريف</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {data.expenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{CATEGORY_EMOJI[exp.category] || '📌'}</span>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{exp.description}</p>
                        <p className="text-xs text-slate-400">{CATEGORY_LABEL[exp.category] || 'أخرى'} · {exp.date}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-amber-700 text-sm">{formatCurrency(exp.amount, exp.currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/expenses/new"
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl py-4 font-semibold text-sm shadow-sm transition-colors active:scale-95"
            >
              <span>🧾</span>
              <span>تسجيل مصروف</span>
            </Link>
            <Link
              to="/accounting"
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl py-4 font-semibold text-sm shadow-sm transition-colors active:scale-95"
            >
              <span>📊</span>
              <span>لوحة المحاسبة</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function SectionHeader({ title, color }) {
  return (
    <div className={`px-4 py-2 ${color}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
    </div>
  )
}

function PLRow({ label, value, indent, total, valueColor = 'text-slate-800' }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${total ? 'border-t border-slate-100 bg-slate-50' : ''}`}>
      <span className={`text-sm ${total ? 'font-semibold text-slate-800' : 'text-slate-600'} ${indent ? 'pr-3' : ''}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}
