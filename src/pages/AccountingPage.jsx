import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/i18n'

const CATEGORY_EMOJI = {
  rent: '🏠', salaries: '👥', electricity: '⚡',
  transport: '🚗', maintenance: '🔧', other: '📌',
}
const CATEGORY_LABEL = {
  rent: 'إيجار', salaries: 'رواتب', electricity: 'كهرباء',
  transport: 'مواصلات', maintenance: 'صيانة', other: 'أخرى',
}

export default function AccountingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [salesRes, expensesRes, supplierPaymentsRes] = await Promise.all([
      supabase.from('sales')
        .select('id, total_amount, currency, created_at')
        .eq('user_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase.from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .order('created_at', { ascending: false }),
      supabase.from('supplier_payments')
        .select('amount, currency')
        .eq('user_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
    ])

    const sales = salesRes.data || []
    const expenses = expensesRes.data || []
    const supplierPayments = supplierPaymentsRes.data || []

    // Revenue (IQD only for now, USD converted at rough rate)
    const revenue = sales.reduce((s, sale) => {
      const amt = parseFloat(sale.total_amount || 0)
      return s + (sale.currency === 'USD' ? amt * 1300 : amt)
    }, 0)

    // COGS: fetch sale_items and product purchase prices
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

    // Monthly expenses (IQD)
    const totalExpenses = expenses.reduce((s, e) => {
      const amt = parseFloat(e.amount || 0)
      return s + (e.currency === 'USD' ? amt * 1300 : amt)
    }, 0)

    // Supplier payments (IQD)
    const totalSupplierPayments = supplierPayments.reduce((s, p) => {
      const amt = parseFloat(p.amount || 0)
      return s + (p.currency === 'USD' ? amt * 1300 : amt)
    }, 0)

    const grossProfit = revenue - cogs
    const netProfit = revenue - cogs - totalExpenses

    setData({
      revenue,
      cogs,
      totalExpenses,
      totalSupplierPayments,
      grossProfit,
      netProfit,
      recentExpenses: expenses.slice(0, 5),
      monthName: now.toLocaleDateString('ar', { month: 'long', year: 'numeric' }),
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">جاري التحميل...</div>
  )

  const isProfit = data.netProfit >= 0
  const margin = data.revenue > 0 ? ((data.grossProfit / data.revenue) * 100).toFixed(1) : '0.0'

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">المحاسبة</h1>
        <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
          {data.monthName}
        </span>
      </div>

      {/* Hero: Net Profit Card */}
      <div className={`rounded-2xl p-6 text-white shadow-md ${
        isProfit
          ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
          : 'bg-gradient-to-br from-red-500 to-rose-700'
      }`}>
        <p className="text-sm opacity-80 mb-1">صافي الربح — {data.monthName}</p>
        <p className="text-4xl font-extrabold tracking-tight" style={{ letterSpacing: '-1px' }}>
          {isProfit ? '+' : ''}{formatCurrency(data.netProfit, 'IQD')}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            isProfit ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
          }`}>
            {isProfit ? '▲ ربح' : '▼ خسارة'}
          </span>
          <span className="text-xs opacity-70">هامش الربح الإجمالي: {margin}%</span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="إيرادات الشهر"
          value={formatCurrency(data.revenue, 'IQD')}
          icon="💰"
          color="blue"
        />
        <MetricCard
          label="تكلفة البضائع"
          value={formatCurrency(data.cogs, 'IQD')}
          icon="📦"
          color="purple"
        />
        <MetricCard
          label="مصاريف الشهر"
          value={formatCurrency(data.totalExpenses, 'IQD')}
          icon="🧾"
          color="amber"
        />
        <MetricCard
          label="مدفوعات الموردين"
          value={formatCurrency(data.totalSupplierPayments, 'IQD')}
          icon="🏭"
          color="slate"
        />
      </div>

      {/* Gross Profit Section */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm mb-3 border-b border-slate-100 pb-2">
          تحليل الربحية
        </h3>
        <div className="space-y-2">
          <ProfitRow label="الإيرادات" value={formatCurrency(data.revenue, 'IQD')} color="text-slate-800" />
          <ProfitRow label="تكلفة البضائع المباعة" value={`− ${formatCurrency(data.cogs, 'IQD')}`} color="text-red-600" />
          <div className="border-t border-slate-100 pt-2">
            <ProfitRow
              label={`مجمل الربح (${margin}%)`}
              value={formatCurrency(data.grossProfit, 'IQD')}
              color={data.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
              bold
            />
          </div>
          <ProfitRow label="المصاريف التشغيلية" value={`− ${formatCurrency(data.totalExpenses, 'IQD')}`} color="text-amber-600" />
          <div className="border-t border-slate-100 pt-2">
            <ProfitRow
              label="صافي الربح"
              value={formatCurrency(data.netProfit, 'IQD')}
              color={isProfit ? 'text-emerald-600' : 'text-red-600'}
              bold
            />
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      {data.recentExpenses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">آخر المصاريف</h3>
            <Link to="/profit-report" className="text-blue-600 text-xs">عرض الكل</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recentExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORY_EMOJI[exp.category] || '📌'}</span>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{exp.description}</p>
                    <p className="text-xs text-slate-400">{CATEGORY_LABEL[exp.category] || 'أخرى'} · {formatDate(exp.date)}</p>
                  </div>
                </div>
                <p className="font-semibold text-amber-700 text-sm">{formatCurrency(exp.amount, exp.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentExpenses.length === 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-slate-500 text-sm">لا توجد مصاريف مسجلة هذا الشهر</p>
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
          to="/profit-report"
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl py-4 font-semibold text-sm shadow-sm transition-colors active:scale-95"
        >
          <span>📊</span>
          <span>تقرير كامل</span>
        </Link>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-50 text-slate-700',
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="font-extrabold text-slate-800 text-base leading-tight" style={{ letterSpacing: '-0.5px' }}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function ProfitRow({ label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}
