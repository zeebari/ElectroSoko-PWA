import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t, getLang, setLang, formatCurrency } from '../lib/i18n'

export default function SettingsPage({ onLangChange }) {
  const [settings, setSettings] = useState({ penaltyRate: 2, penaltyEnabled: true })
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lang, setLangState] = useState(getLang())

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data: { user: u } } = await supabase.auth.getUser()
    setUser(u)
    const { data } = await supabase.from('settings').select('*').eq('user_id', u.id).single()
    if (data) setSettings({ penaltyRate: data.penaltyRate || 2, penaltyEnabled: data.penaltyEnabled !== false })
  }

  async function saveSettings() {
    setSaving(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    await supabase.from('settings').upsert({
      id: '_settings',
      penaltyRate: settings.penaltyRate,
      penaltyEnabled: settings.penaltyEnabled,
      user_id: u.id,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function changeLang(l) {
    setLang(l)
    setLangState(l)
    onLangChange && onLangChange(l)
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-slate-800">{t('settings')}</h1>

      {/* User Info */}
      {user && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">الحساب</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Language */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">{t('language')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {[['ar','العربية','ع'],['ku_sorani','کوردی سۆرانی','ک'],['ku_badini','کوردی بادینی','ب']].map(([l,name,abbr]) => (
            <button key={l} onClick={() => changeLang(l)}
              className={`py-3 rounded-xl text-sm font-semibold transition-all ${lang === l ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span className="text-lg">{abbr}</span>
              <p className="text-xs mt-0.5 leading-tight">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Penalty Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-semibold text-slate-700 text-sm">{t('penaltyEnabled')}</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">تفعيل غرامة التأخير</span>
          <button onClick={() => setSettings(s => ({ ...s, penaltyEnabled: !s.penaltyEnabled }))}
            className={`w-12 h-6 rounded-full transition-all ${settings.penaltyEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-all mx-0.5 ${settings.penaltyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {settings.penaltyEnabled && (
          <div>
            <label className="block text-xs text-slate-600 mb-1">{t('penaltyRate')}</label>
            <input
              type="number"
              value={settings.penaltyRate}
              onChange={e => setSettings(s => ({ ...s, penaltyRate: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              step="0.1"
            />
          </div>
        )}
        <button onClick={saveSettings} disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
          {saved ? '✓ تم الحفظ' : saving ? 'جاري...' : t('save')}
        </button>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <p className="font-bold text-slate-800">إلكترو سوقو</p>
        <p className="text-xs text-slate-400 mt-1">نظام إدارة الأجهزة الكهربائية</p>
        <p className="text-xs text-slate-300 mt-1">v1.0.0</p>
      </div>
    </div>
  )
}
