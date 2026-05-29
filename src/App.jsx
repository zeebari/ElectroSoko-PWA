import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import AddCustomerPage from './pages/AddCustomerPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import PlansPage from './pages/PlansPage'
import AddPlanPage from './pages/AddPlanPage'
import PlanDetailPage from './pages/PlanDetailPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/SettingsPage'
import ProductsPage from './pages/ProductsPage'
import AddProductPage from './pages/AddProductPage'
import ProductDetailPage from './pages/ProductDetailPage'
import InventoryReportPage from './pages/InventoryReportPage'
import SuppliersPage from './pages/SuppliersPage'
import AddSupplierPage from './pages/AddSupplierPage'
import SupplierDetailPage from './pages/SupplierDetailPage'
import SupplierStatementPage from './pages/SupplierStatementPage'
import AddPurchasePage from './pages/AddPurchasePage'
import AddPaymentPage from './pages/AddPaymentPage'
import SalesPage from './pages/SalesPage'
import NewSalePage from './pages/NewSalePage'
import SaleDetailPage from './pages/SaleDetailPage'
import AccountingPage from './pages/AccountingPage'
import ProfitReportPage from './pages/ProfitReportPage'
import AddExpensePage from './pages/AddExpensePage'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [langKey, setLangKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <BrowserRouter><Routes><Route path="*" element={<LoginPage />} /></Routes></BrowserRouter>

  return (
    <BrowserRouter>
      <Layout onLangChange={() => setLangKey(k => k + 1)}>
        <Routes>
          <Route path="/" element={<DashboardPage key={langKey} />} />
          {/* Sales */}
          <Route path="/sales" element={<SalesPage key={langKey} />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          {/* Customers */}
          <Route path="/customers" element={<CustomersPage key={langKey} />} />
          <Route path="/customers/new" element={<AddCustomerPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          {/* Plans */}
          <Route path="/plans" element={<PlansPage key={langKey} />} />
          <Route path="/plans/new" element={<AddPlanPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/payments" element={<PaymentsPage key={langKey} />} />
          {/* Products */}
          <Route path="/products" element={<ProductsPage key={langKey} />} />
          <Route path="/products/new" element={<AddProductPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<AddProductPage />} />
          <Route path="/inventory" element={<InventoryReportPage />} />
          {/* Suppliers */}
          <Route path="/suppliers" element={<SuppliersPage key={langKey} />} />
          <Route path="/suppliers/new" element={<AddSupplierPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="/suppliers/:id/edit" element={<AddSupplierPage />} />
          <Route path="/suppliers/:id/statement" element={<SupplierStatementPage />} />
          <Route path="/suppliers/:id/pay" element={<AddPaymentPage />} />
          <Route path="/purchases/new" element={<AddPurchasePage />} />
          {/* Accounting */}
          <Route path="/accounting" element={<AccountingPage key={langKey} />} />
          <Route path="/profit-report" element={<ProfitReportPage />} />
          <Route path="/expenses/new" element={<AddExpensePage />} />
          {/* Settings */}
          <Route path="/settings" element={<SettingsPage key={langKey} onLangChange={() => setLangKey(k => k + 1)} />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
