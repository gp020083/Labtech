import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs, FontScale } from '../prefs';
import { Lock, Eye, EyeOff, Globe, ArrowRight, AlertCircle, UserCheck, MapPin, Wrench, Calculator, CalendarDays } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { accounts, loginWithPassword } = useApp();
  const { lang, toggleLang, fontScale, setFontScale, tx } = usePrefs();
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || 'usr-ben');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
            HOKLAS 298 · Web &amp; Field Hub 2.5
          </span>
        </div>

        <div className="max-w-xl space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            {tx('地基及建築材料 Testing', 'Foundation & Construction Material Testing')}
            <span className="block text-blue-400 mt-1">
              {tx('一體化 Web 工作台 & 現場工具箱', 'Unified Web Workspace & Field Toolbox')}
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            {tx(
              '整合工程 Site ID 與地圖定位、Equipment 借還及 Cal Cert 清單、受控 STP 文件、自動計算工具（附 CEDD / ASD / Housing / BD 驗收要求）及 Calendar 排程日曆。',
              'All-in-one portal for Site IDs & Maps, Equipment Checkout & Cal Certs, Controlled STPs, Auto-Calculators with latest CEDD / ASD / Housing / BD Specs, and Schedule Calendar.'
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
              <div className="mt-1 text-slate-400 text-[11px]">{tx('器材清單 · 借還紀錄 · Cal Cert 到期提示', 'Equipment table · Checkout logs · Cal due alerts')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <Calculator className="h-5 w-5 text-amber-400 mb-2" />
              <div className="font-extrabold text-sm">{tx('TOOL 計算工具 + 部門 Spec', 'Calculators & Gov Specs')}</div>
              <div className="mt-1 text-slate-400 text-[11px]">{tx('自動計算指南 + CEDD / ASD / Housing / BD 要求', 'Auto calculators + CEDD / ASD / Housing / BD criteria')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <CalendarDays className="h-5 w-5 text-violet-400 mb-2" />
              <div className="font-extrabold text-sm">{tx('STP 文件 & Calendar 日曆', 'STP Vault & Calendar')}</div>
              <div className="mt-1 text-slate-400 text-[11px]">{tx('受控 STP 清單 · 工程測試及培訓排程日曆', 'Controlled STP list · Project & schedule calendar')}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Labtech Testing Limited · Internal Staff Portal</span>
          <span>HOKLAS Field & Lab LIMS</span>
        </div>
      </div>

      {/* Right Password Gate */}
      <div className="col-span-12 lg:col-span-5 flex flex-col justify-center bg-white px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md space-y-6">
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
              <Lock className="h-3.5 w-3.5" /> {tx('INTERNAL STAFF ACCESS', 'INTERNAL STAFF ACCESS')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {tx('登入 Labtech 工作平台', 'Sign in to Labtech Hub')}
            </h2>
            <p className="text-xs text-slate-500">
              {tx('請選擇當值同事身份，並輸入公司內部通行密碼進入系統。', 'Select your operator profile and enter the internal platform password.')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200/90 bg-slate-50/60 p-5 sm:p-6 shadow-xs">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                <UserCheck className="h-3.5 w-3.5 text-brand" /> {tx('1. 當值同事身份 (用於借還機自動登記)', '1. Staff Profile (for Checkout / Logs)')}
              </label>
              <select
                value={selectedAccId}
                onChange={(e) => setSelectedAccId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.zh ? `(${acc.zh})` : ''} — {acc.title}
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
                  autoFocus
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
          </form>
        </div>
      </div>
    </div>
  );
};
