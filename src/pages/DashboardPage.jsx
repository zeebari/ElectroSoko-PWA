import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t, formatCurrency, formatDate } from '../lib/i18n'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [financial, setFinancial] = useState(null)
  const [recentSales, setRecentSales] = useState([])
  const [alerts, setAlerts] = useState({ lowStock: [], supplierDebts: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [
      customersRes,
      productsRes,
      suppliersRes,
      purchasesRes,
      paymentsRes,
      monthlySalesRes,
      todaySalesRes,
      monthlyExpensesRes,
      recentSalesRes,
    ] = await Promise.all([
      supabase.from('customers').select('id').eq('user_id', user.id),
      supabase.from('products').select('id,name,quantity,min_quantity').eq('user_id', user.id),
      supabase.from('suppliers').select('id,name,currency').eq('user_id', user.id),
      supabase.from('supplier_purchases').select('supplier_id,total_amount').eq('user_id', user.id),
      supabase.from('supplier_payments').select('supplier_id,amount').eq('user_id', user.id),
      supabase.from('sales').select('id,total_amount,currency,created_at').eq('user_id', user.id).gte('created_at', monthStart).lte('created_at', monthEnd),
      supabase.from('sales').select('id,total_amount,currency').eq('user_id', user.id).gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('expenses').select('amount,currency').eq('user_id', user.id).gte('created_at', monthStart).lte('created_at', monthEnd),
      supabase.from('sales').select('id,total_amount,currency,created_at,customer_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
    ])

    const toIQD = (amt, cur) => parseFloat(amt || 0) * (cur === 'USD' ? 1300 : 1)

    // Monthly financial calcs
    const monthlySales = monthlySalesRes.data || []
    const monthlyRevenue = monthlySales.reduce((s, x) => s + toIQD(x.total_amount, x.currency), 0)

    // COGS for month
    const saleIds = monthlySales.map(s => s.id)
    let monthlyCogs = 0
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase.from('sale_items')
        .select('quantity, product_id')
        .in('sale_id', saleIds)
      if (saleItems && saleItems.length > 0) {
        const productIds = [...new Set(saleItems.map(i => i.product_id).filter(Boolean))]
        let purchasePrices = {}
        if (productIds.length > 0) {
          const { data: products } = await supabase.from('products').select('id, purchase_price').in('id', productIds)
          ;(products || []).forEach(p => { purchasePrices[p.id] = parseFloat(p.purchase_price || 0) })
        }
        monthlyCogs = saleItems.reduce((s, item) => {
          return s + (purchasePrices[item.product_id] || 0) * parseFloat(item.quantity || 0)
        }, 0)
      }
    }

    const monthlyExpenses = (monthlyExpensesRes.data || []).reduce((s, e) => s + toIQD(e.amount, e.currency), 0)
    const monthlyNetProfit = monthlyRevenue - monthlyCogs - monthlyExpenses

    // Today's revenue
    const todaySales = todaySalesRes.data || []
    const todayRevenue = todaySales.reduce((s, x) => s + toIQD(x.total_amount, x.currency), 0)

    // Low stock alerts
    const lowStockProducts = (productsRes.data || []).filter(p => p.quantity <= (p.min_quantity || 0) && p.min_quantity > 0)
    const outOfStockProducts = (productsRes.data || []).filter(p => p.quantity <= 0)

    // Supplier debt
    const purchasesBySupplier = {}
    ;(purchasesRes.data || []).forEach(p => {
      purchasesBySupplier[p.supplier_id] = (purchasesBySupplier[p.supplier_id] || 0) + parseFloat(p.total_amount || 0)
    })
    const paymentsBySupplier = {}
    ;(paymentsRes.data || []).forEach(p => {
      paymentsBySupplier[p.supplier_id] = (paymentsBySupplier[p.supplier_id] || 0) + parseFloat(p.amount || 0)
    })
    const supplierDebts = (suppliersRes.data || [])
      .map(s => ({ ...s, balance: (purchasesBySupplier[s.id] || 0) - (paymentsBySupplier[s.id] || 0) }))
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)

    // Recent sales with customer names
    const latestSales = recentSalesRes.data || []
    const salesWithCustomers = await Promise.all(
      latestSales.map(async (sale) => {
        if (!sale.customer_id) return { ...sale, customerName: 'زبون غير محدد' }
        const { data: cust } = await supabase.from('customers').select('name').eq('id', sale.customer_id).single()
        return { ...sale, customerName: cust?.name || 'زبون' }
      })
    )

    setStats({ customers: customersRes.data?.length || 0 })
    setFinancial({ todayRevenue, monthlyRevenue, monthlyExpenses, monthlyNetProfit })
    setRecentSales(salesWithCustomers)
    setAlerts({
      lowStock: [...outOfStockProducts, ...lowStockProducts.filter(p => p.quantity > 0)],
      supplierDebts,
    })
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading')}</div>

  const isProfit = financial.monthlyNetProfit >= 0

  return (
    <div className="p-4 space-y-4" dir="rtl">

      {/* Hero: Today's Revenue + Net Profit */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-5 text-white shadow-md">
        <p className="text-xs opacity-60 mb-3 font-medium tracking-wide uppercase">لوحة اليوم</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs opacity-70">إيرادات اليوم</p>
            <p className="text-2xl font-extrabold mt-0.5" style={{ letterSpacing: '-0.5px' }}>
              {formatCurrency(financial.todayRevenue, 'IQD')}
            </p>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="text-xs opacity-70">صافي الربح (الشهر)</p>
            <p className={`text-2xl font-extrabold mt-0.5 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
              style={{ letterSpacing: '-0.5px' }}>
              {isProfit ? '+' : ''}{formatCurrency(financial.monthlyNetProfit, 'IQD')}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Summary Strip */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">ملخص الشهر</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-base font-extrabold text-slate-800" style={{ letterSpacing: '-0.5px' }}>
              {formatCurrency(financial.monthlyRevenue, 'IQD')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">إيرادات</p>
          </div>
          <div>
            <p className="text-base font-extrabold text-amber-600" style={{ letterSpacing: '-0.5px' }}>
              {formatCurrency(financial.monthlyExpenses, 'IQD')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">مصاريف</p>
          </div>
          <div>
            <p className={`text-base font-extrabold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}
              style={{ letterSpacing: '-0.5px' }}>
              {isProfit ? '+' : ''}{formatCurrency(financial.monthlyNetProfit, 'IQD')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">صافي الربح</p>
          </div>
        </div>
      </div>

      {/* Alert: Low Stock */}
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

      {/* Alert: Supplier Debts */}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/sales/new"
          className="flex flex-col items-center gap-1.5 bg-emerald-600 text-white rounded-2xl py-4 shadow-sm hover:bg-emerald-700 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <span className="text-xs font-semibold">بيع جديد</span>
        </Link>
        <Link to="/expenses/new"
          className="flex flex-col items-center gap-1.5 bg-amber-500 text-white rounded-2xl py-4 shadow-sm hover:bg-amber-600 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
          </svg>
          <span className="text-xs font-semibold">تسجيل مصروف</span>
        </Link>
        <Link to="/customers/new"
          className="flex flex-col items-center gap-1.5 bg-blue-600 text-white rounded-2xl py-4 shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
          </svg>
          <span className="text-xs font-semibold">زبون جديد</span>
        </Link>
      </div>

      {/* Link to Full Accounting */}
      <Link to="/accounting"
        className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800">عرض التقرير المالي الكامل</span>
        </div>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
      </Link>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">آخر المبيعات</h3>
            <Link to="/sales" className="text-blue-600 text-xs">{t('viewDetails')}</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentSales.map(sale => (
              <Link key={sale.id} to={`/sales/${sale.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{sale.customerName}</p>
                  <p className="text-xs text-slate-400">{formatDate(sale.created_at)}</p>
                </div>
                <p className="font-semibold text-blue-700 text-sm">{formatCurrency(sale.total_amount, sale.currency)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
