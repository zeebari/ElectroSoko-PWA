import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/',           label: 'الرئيسية',  icon: HomeIcon },
  { to: '/sales',      label: 'المبيعات',  icon: CartIcon },
  { to: '/customers',  label: 'الزبائن',   icon: UsersIcon },
  { to: '/plans',      label: 'الأقساط',   icon: DocumentIcon },
  { to: '/suppliers',  label: 'الشركات',   icon: BuildingIcon },
  { to: '/accounting', label: 'المحاسبة',  icon: ChartIcon },
  { to: '/products',   label: 'المخزن',    icon: BoxIcon },
]

// Bottom nav shows top 5 most used
const bottomNav = [
  { to: '/',          label: 'الرئيسية', icon: HomeIcon },
  { to: '/sales',     label: 'مبيعات',   icon: CartIcon },
  { to: '/customers', label: 'زبائن',    icon: UsersIcon },
  { to: '/suppliers', label: 'شركات',    icon: BuildingIcon },
  { to: '/products',  label: 'مخزن',     icon: BoxIcon },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || ''))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden md:flex fixed top-0 right-0 h-full w-52 bg-[#0f172a] flex-col z-50 shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">إلكترو سوقو</p>
            <p className="text-slate-500 text-[10px] mt-0.5">نظام المبيعات</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'stroke-white' : 'stroke-slate-400'}`} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-2 py-3 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">{userEmail.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-slate-400 text-[10px] truncate">{userEmail}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR (hidden on desktop) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f172a] px-4 py-3 flex items-center justify-between shadow-lg">
        <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span className="text-white font-bold text-sm">إلكترو سوقو</span>
        </div>
        <NavLink to="/sales/new" className="bg-blue-500 text-white rounded-lg p-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
        </NavLink>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="md:mr-52">
        {/* mobile top padding, desktop no top padding */}
        <main className="pt-16 md:pt-0 pb-20 md:pb-0 p-3 md:p-5 min-h-screen">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around px-1 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {bottomNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-blue-600' : 'stroke-slate-400'}`} />
                <span className="text-[9px] font-medium truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}

function HomeIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
}
function UsersIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
}
function BuildingIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
}
function CartIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
}
function ChartIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
}
function DocumentIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
}
function BoxIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
}
