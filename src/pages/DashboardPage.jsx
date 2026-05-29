import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency, formatDate } from '../lib/i18n'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recentPlans, setRecentPlans] = useState([])
  const [alerts, setAlerts] = useState({ lowStock: [], supplierDebts: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [customersRes, plansRes, productsRes, suppliersRes, purchasesRes, paymentsRes] = await Promise.all([
      supabase.from('customers').select('id').eq('user_id', user.id),
      supabase.from('plans').select('*').eq('user_id', user.id),
      supabase.from('products').select('id,name,quantity,min_quantity').eq('user_id', user.id),
      supabase.from('suppliers').select('id,name,currency').eq('user_id', user.id),
      supabase.from('supplier_purchases').select('supplier_id,total_amount').eq('user_id', user.id),
      supabase.from('supplier_payments').select('supplier_id,amount').eq('user_id', user.id),
    ])

    const plans = plansRes.data || []
    const today = new Date().toISOString().split('T')[0]

    // Low stock alerts
    const lowStockProducts = (productsRes.data || []).filter(p =>
      p.quantity <= (p.min_quantity || 0) && p.min_quantity > 0
    )
    const outOfStockProducts = (productsRes.data || []).filter(p => p.quantity <= 0)

    // Supplier debt alerts
    const purchasesBySupplier = {}
    ;(purchasesRes.data || []).forEach(p => {
      purchasesBySupplier[p.supplier_id] = (purchasesBySupplier[p.supplier_id] || 0) + parseFloat(p.total_amount || 0)
    })
    const paymentsBySupplier = {}
    ;(paymentsRes.data || []).forEach(p => {
      paymentsBySupplier[p.supplier_id] = (paymentsBySupplier[p.supplier_id] || 0) + parseFloat(p.amount || 0)
    })
    const supplierDebts = (suppliersRes.data || [])
      .map(s => ({
        ...s,
        balance: (purchasesBySupplier[s.id] || 0) - (paymentsBySupplier[s.id] || 0),
      }))
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)

    // Plans: overdue installments
    let overdueCount = 0
    plans.forEach(p => {
      const schedule = p.schedule || []
      schedule.filter(s => !s.paid && s.dueDate && s.dueDate < today).forEach(() => overdueCount++)
    })

    // Customer outstanding
    const plansWithCustomers = await Promise.all(
      plans.slice(0, 5).map(async (p) => {
        const { data: cust } = await supabase.from('customers').select('name, currency').eq('id', p.customerId).single()
        return { ...p, customerName: cust?.name, currency: cust?.currency || 'IQD' }
      })
    )

    const { data: paymentsAll } = await supabase.from('payments').select('amount, planId').eq('user_id', user.id)
    const paidByPlan = {}
    ;(paymentsAll || []).forEach(p => {
      paidByPlan[p.planId] = (paidByPlan[p.planId] || 0) + parseFloat(p.amount || 0)
    })

    const { data: custsData } = await supabase.from('customers').select('id, currency').eq('user_id', user.id)
    const allCustomers = {}
    ;(custsData || []).forEach(c => { allCustomers[c.id] = c })

    let totalOutstandingIQD = 0, totalOutstandingUSD = 0
    plans.forEach(p => {
      const currency = allCustomers[p.customerId]?.currency || 'IQD'
      const paid = paidByPlan[p.id] || 0
      const remaining = Math.max(0, parseFloat(p.totalAmount || 0) + parseFloat(p.totalInterest || 0) - parseFloat(p.downPayment || 0) - paid)
      if (currency === 'USD') totalOutstandingUSD += remaining
      else totalOutstandingIQD += remaining
    })

    setStats({
      customers: customersRes.data?.length || 0,
      plans: plans.length,
      outstandingIQD: totalOutstandingIQD,
      outstandingUSD: totalOutstandingUSD,
      overdue: overdueCount,
    })
    setRecentPlans(plansWithCustomers)
    setAlerts({
      lowStock: [...outOfStockProducts, ...lowStockProducts.filter(p => p.quantity > 0)],
      supplierDebts,
    })
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-slate-800">{t('dashboard')}</h1>

      {/* Alerts Section */}
      {alerts.lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <p className="font-semibold text-red-800 text-sm">
              {alerts.lowStock.filter(p => p.quantity <= 0).length > 0
                ? `${alerts.lowStock.filter(p => p.quantity <= 0).length} مادة نفدت من المخزن`
                : `${alerts.lowStock.length} مادة بمخزون منخفض`}
            </p>
          </div>
          <div className="space-y-1">
            {alerts.lowStock.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <Link to={`/products/${p.id}`} className="text-xs text-red-700 hover:underline">{p.name}</Link>
                <span className={`text-xs font-bold ${p.quantity <= 0 ? 'text-red-700' : 'text-orange-600'}`}>
                  {p.quantity <= 0 ? 'نفد' : `${p.quantity} قطعة`}
                </span>
              </div>
            ))}
            {alerts.lowStock.length > 3 && (
              <Link to="/products" className="text-xs text-red-600 hover:underline block mt-1">
                + {alerts.lowStock.length - 3} أخرى — عرض المخزن
              </Link>
            )}
          </div>
        </div>
      )}

      {alerts.supplierDebts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <p className="font-semibold text-orange-800 text-sm">
              {alerts.supplierDebts.length} شركة لديها رصيد مستحق
            </p>
          </div>
          <div className="space-y-1">
            {alerts.supplierDebts.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <Link to={`/suppliers/${s.id}`} className="text-xs text-orange-700 hover:underline">{s.name}</Link>
                <span className="text-xs font-bold text-orange-700">{formatCurrency(s.balance, s.currency)}</span>
              </div>
            ))}
            {alerts.supplierDebts.length > 3 && (
              <Link to="/suppliers" className="text-xs text-orange-600 hover:underline block mt-1">
                + {alerts.supplierDebts.length - 3} أخرى — عرض الشركات
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('totalCustomers')}
          value={stats?.customers ?? 0}
          color="blue"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
        />
        <StatCard
          label={t('totalPlans')}
          value={stats?.plans ?? 0}
          color="purple"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
        />
        <StatCard
          label={`${t('outstanding')} (IQD)`}
          value={formatCurrency(stats?.outstandingIQD, 'IQD')}
          color="orange"
          small
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard
          label={`${t('outstanding')} (USD)`}
          value={formatCurrency(stats?.outstandingUSD, 'USD')}
          color="green"
          small
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* Overdue Alert */}
      {stats?.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="font-semibold text-red-800 text-sm">{stats.overdue} قسط متأخر</p>
            <Link to="/plans?filter=overdue" className="text-red-600 text-xs hover:underline">{t('viewDetails')} ←</Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/customers/new"
          className="flex items-center gap-2 bg-blue-600 text-white rounded-2xl p-4 shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          <span className="text-sm font-semibold">{t('addCustomer')}</span>
        </Link>
        <Link to="/plans/new"
          className="flex items-center gap-2 bg-slate-700 text-white rounded-2xl p-4 shadow-sm hover:bg-slate-800 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          <span className="text-sm font-semibold">{t('addPlan')}</span>
        </Link>
      </div>

      {/* Recent Plans */}
      {recentPlans.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">آخر العقود</h3>
            <Link to="/plans" className="text-blue-600 text-xs">{t('viewDetails')}</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentPlans.map(plan => (
              <Link key={plan.id} to={`/plans/${plan.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{plan.customerName || '—'}</p>
                  <p className="text-xs text-slate-500">{plan.description}</p>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-blue-700 text-sm">{formatCurrency(plan.totalAmount, plan.currency)}</p>
                  <p className="text-xs text-slate-400">{formatDate(plan.startDate)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, icon, small }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className={`font-bold text-slate-800 ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
