import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs, FontScale } from '../prefs';
import { Lock, Eye, EyeOff, Globe, ArrowRight, AlertCircle, UserCheck, MapPin, Wrench, Calculator, CalendarDays, Mail, ShieldCheck } from 'lucide-react';

const MS_TENANT_ID = (import.meta as any).env?.VITE_MS_TENANT_ID || 'common';
const MS_CLIENT_ID = (import.meta as any).env?.VITE_MS_CLIENT_ID || '';

function parseJwtEmail(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.preferred_username || payload.email || payload.upn || null;
  } catch {
    return null;
  }
}

export const LoginScreen: React.FC = () => {
  const { accounts, loginWithPassword, loginWithMs } = useApp();
  const { lang, toggleLang, fontScale, setFontScale, tx } = usePrefs();
  const [loginMode, setLoginMode] = useState<'ms365' | 'staff'>('ms365');
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || 'usr-bs');
  const [msEmail, setMsEmail] = useState(accounts[0]?.email || 'benshih@lab-tech.com.hk');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  // Handle Microsoft Entra ID (Azure AD) OAuth 2.0 implicit id_token callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.includes('id_token=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const idToken = params.get('id_token');
      if (idToken) {
        const email = parseJwtEmail(idToken);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        if (email) {
          loginWithMs(email);
        }
      }
    }
  }, [loginWithMs]);

  const handleMsOAuthPopupOrRedirect = () => {
    if (MS_CLIENT_ID) {
      const redirectUri = encodeURIComponent(window.location.origin);
      const nonce = Math.random().toString(36).slice(2);
      const authUrl =
        `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize` +
        `?client_id=${encodeURIComponent(MS_CLIENT_ID)}` +
        `&response_type=id_token` +
        `&redirect_uri=${redirectUri}` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&response_mode=fragment` +
        `&nonce=${nonce}` +
        `&login_hint=${encodeURIComponent(msEmail.trim())}`;
      window.location.href = authUrl;
      return;
    }
    // Direct company Microsoft account sign-in (matches @lab-tech.com.hk / @kinwing.com.hk)
    const clean = msEmail.trim().toLowerCase();
    if (!clean || (!clean.endsWith('@lab-tech.com.hk') && !clean.endsWith('@kinwing.com.hk'))) {
      setError(
        tx(
          '請輸入建榮或 Labtech 公司 Microsoft 365 電郵（@lab-tech.com.hk 或 @kinwing.com.hk）。',
          'Please enter a valid company Microsoft 365 email (@lab-tech.com.hk or @kinwing.com.hk).'
        )
      );
      return;
    }
    if (password.trim() && password.trim() !== 'labtech123' && password.trim() !== 'lt7418@appUAT') {
      setError(tx('通行密碼不正確，請重新輸入。', 'Incorrect access password.'));
      return;
    }
    setError('');
    loginWithMs(clean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMode === 'ms365') {
      handleMsOAuthPopupOrRedirect();
      return;
    }
    const ok = loginWithPassword(password, selectedAccId, remember);
    if (!ok) {
      setError(tx('密碼不正確，請重新輸入公司平台通行密碼。', 'Incorrect access password. Please try again.'));
    } else {
      setError('');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-slate-950">
      {/* Left Hero Showcase */}
      <div className="blueprint-bg hidden lg:col-span-7 lg:flex flex-col justify-between p-12 text-white border-r border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white px-3.5 py-2 shadow-sm">
            <img src="/labtech-logo.png" alt="LaBTECH" className="h-8 w-auto" />
          </div>
          <span className="rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-extrabold text-blue-300 ring-1 ring-blue-400/30">
            HOKLAS 298 · Kin Wing UAT Server &amp; Field Hub
          </span>
        </div>

        <div className="max-w-xl space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            {tx('地基及建築材料測試平台', 'Foundation & Construction Material Testing')}
            <span className="block text-blue-400 mt-1">
              {tx('一體化 Web 工作台及現場工具箱', 'Unified Web Workspace & Field Toolbox')}
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            {tx(
              '整合工程 Site ID 與地圖定位、儀器借還及校準證書清單、受控工作文件庫、自動計算工具與排程日曆，並已連接公司 MySQL 資料庫及 Nextcloud DMS。',
              'All-in-one portal for Site IDs & Maps, Equipment Checkout & Cal Certs, Controlled STPs, Auto-Calculators with HK Gov Specs, and Schedule Calendar.'
            )}
          </p>
          <div className="grid grid-cols-2 gap-3.5 pt-2 text-xs">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <MapPin className="h-5 w-5 text-blue-400 mb-2" />
              <div className="font-extrabold text-sm">Site ID &amp; Location</div>
              <div className="mt-1 text-slate-400 text-[11px]">{tx('列表及地圖視圖 · Google Maps 定位導航', 'Table & map views · 1-click Google Maps Pin')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <Wrench className="h-5 w-5 text-emerald-400 mb-2" />
              <div className="font-extrabold text-sm">Equipment &amp; Cal Cert</div>
              <div className="mt-1 text-slate-400 text-[11px]">{tx('器材清單 · 借還紀錄 · 校準到期預警色帶', 'Equipment table · Checkout logs · Cal due alerts')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <Calculator className="h-5 w-5 text-amber-400 mb-2" />
              <div className="font-extrabold text-sm">{tx('現場測試計算及報告生成', 'Calculators & Gov Specs')}</div>
              <div className="mt-1 text-slate-400 text-[11px]">{tx('自動計算 + Job Ref. 編號管理 + 政府驗收標準', 'Auto calculators + Job Ref. Registry + Gov criteria')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <CalendarDays className="h-5 w-5 text-violet-400 mb-2" />
              <div className="font-extrabold text-sm">{tx('受控文件庫及排程日曆', 'Controlled Docs & Calendar')}</div>
              <div className="mt-1 text-slate-400 text-[11px]">{tx('6 大文件分類 · 內部例會與培訓排程日曆', '6 doc sub-sections · Meeting & training schedule')}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Labtech Testing Limited · Kin Wing Engineering Group</span>
          <span>Microsoft 365 &amp; HOKLAS LIMS</span>
        </div>
      </div>

      {/* Right Login Gate */}
      <div className="col-span-12 lg:col-span-5 flex flex-col justify-center bg-white px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="flex items-center justify-between gap-2">
            <img src="/labtech-logo.png" alt="LaBTECH" className="h-9 w-auto lg:hidden" />
            <div className="ml-auto flex items-center gap-1.5">
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-extrabold">
                {(['md', 'lg', 'xl'] as FontScale[]).map((s, idx) => (
                  <button key={s} type="button" onClick={() => setFontScale(s)} className={`rounded-lg px-2 py-1 cursor-pointer transition ${fontScale === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                    {idx === 0 ? 'A' : idx === 1 ? 'A+' : 'A++'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={toggleLang} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 hover:border-brand cursor-pointer">
                <Globe className="h-3.5 w-3.5 text-brand" /> {lang === 'zh' ? '中/EN' : 'EN'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-[11px] font-extrabold text-brand-deep">
              <ShieldCheck className="h-3.5 w-3.5" /> {tx('MICROSOFT 365 SSO & STAFF ACCESS', 'MICROSOFT 365 SSO & STAFF ACCESS')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {tx('登入 Labtech 工作平台', 'Sign in to Labtech Hub')}
            </h2>
            <p className="text-xs text-slate-500">
              {tx(
                '支援以公司 Microsoft 365 電郵（@lab-tech.com.hk / @kinwing.com.hk）直接登入，或使用當值同事通行密碼登入。',
                'Sign in with your company Microsoft 365 account (@lab-tech.com.hk / @kinwing.com.hk) or internal staff password.'
              )}
            </p>
          </div>

          {/* Login Mode Switcher */}
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => { setLoginMode('ms365'); setError(''); }}
              className={`rounded-xl py-2 transition cursor-pointer ${
                loginMode === 'ms365' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tx('Microsoft 365 公司帳號', 'Microsoft 365 Account')}
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('staff'); setError(''); }}
              className={`rounded-xl py-2 transition cursor-pointer ${
                loginMode === 'staff' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tx('當值名單及通行密碼', 'Staff List & Password')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200/90 bg-slate-50/60 p-5 sm:p-6 shadow-xs">
            {loginMode === 'ms365' ? (
              <>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-brand" /> {tx('1. 公司 Microsoft 365 電郵地址', '1. Company Microsoft 365 Email')}
                  </label>
                  <input
                    type="email"
                    required
                    list="company-ms-accounts"
                    value={msEmail}
                    onChange={(e) => { setMsEmail(e.target.value); if (error) setError(''); }}
                    placeholder="benshih@lab-tech.com.hk / name@kinwing.com.hk"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />
                  <datalist id="company-ms-accounts">
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.email}>
                        {acc.name} {acc.zh ? `· ${acc.zh}` : ''} — {acc.title}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-brand" /> {tx('快速選擇已登記 Microsoft 365 同事帳號', 'Quick Pick Registered Staff Account')}
                    </span>
                  </label>
                  <select
                    value={accounts.find((a) => a.email.toLowerCase() === msEmail.trim().toLowerCase())?.id || ''}
                    onChange={(e) => {
                      const found = accounts.find((a) => a.id === e.target.value);
                      if (found) setMsEmail(found.email);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="">{tx('— 從 Labtech 名單帶入公司電郵 —', '— Select from Labtech Staff Directory —')}</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.zh || acc.name} · {acc.email}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0f172a] hover:bg-slate-800 py-3.5 text-sm font-extrabold text-white shadow-sm transition cursor-pointer"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  <span>{tx('以 Microsoft 365 公司帳號登入', 'Sign in with Microsoft 365')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                    <UserCheck className="h-3.5 w-3.5 text-brand" /> {tx('1. 當值同事身份', '1. Staff Profile')}
                  </label>
                  <select
                    value={selectedAccId}
                    onChange={(e) => setSelectedAccId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.zh ? `· ${acc.zh}` : ''} — {acc.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                    <Lock className="h-3.5 w-3.5 text-brand" /> {tx('2. 平台密碼 Password', '2. Platform Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                      placeholder={tx('輸入平台密碼...', 'Enter platform password...')}
                      className="w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-11 py-3 font-mono text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Toggle password visibility">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> <span>{error}</span>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
                  <span>{tx('在此裝置保持登入狀態', 'Keep me signed in on this browser')}</span>
                </label>

                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-deep transition cursor-pointer">
                  <span>{tx('進入 Labtech 平台', 'Enter Labtech Platform')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
