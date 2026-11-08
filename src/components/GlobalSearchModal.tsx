import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { HK_GOV_SPECS } from '../data/hkGovSpecs';
import { FieldTabId } from './FieldNavShell';
import { CalcToolId } from '../pages/ToolsPage';
import { Search, X, MapPin, Wrench, FileText, Landmark, Calculator } from 'lucide-react';

export const GlobalSearchModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: FieldTabId, opts?: { toolMode?: 'calc' | 'specs'; calcId?: CalcToolId }) => void;
}> = ({ open, onClose, onNavigate }) => {
  const { jobs, equipment, tests, setStpPreviewCode } = useApp();
  const { lang, tx } = usePrefs();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  const results = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const matchJobs = jobs.filter((j) => !kw || `${j.no} ${j.companyProjNo} ${j.shortName} ${j.site} ${j.mapAddress || ''}`.toLowerCase().includes(kw)).slice(0, 4);
    const matchEq = equipment.filter((e) => e.inUse !== 'N' && (!kw || `${e.code} ${e.name} ${e.serial} ${e.currentLoan?.siteLocation || ''}`.toLowerCase().includes(kw))).slice(0, 4);
    const matchStp = tests.filter((t) => !kw || `${t.code} ${t.name} ${t.stpDocCode} ${t.std}`.toLowerCase().includes(kw)).slice(0, 4);
    const matchSpecs = HK_GOV_SPECS.filter((s) => !kw || `${s.titleZh} ${s.titleEn} ${s.testStd} ${s.stpCode || ''} ${Object.values(s.depts).map((d) => d.criteriaZh + d.keyLimitBadge).join(' ')}`.toLowerCase().includes(kw)).slice(0, 4);
    return { matchJobs, matchEq, matchStp, matchSpecs };
  }, [q, jobs, equipment, tests]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs p-4 pt-14 sm:pt-20" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <Search className="h-5 w-5 text-brand shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx('搜尋 Site ID (LT0001)、器材編號、STP、自動計算工具或 CEDD / ASD / Housing / BD Spec...', 'Search Site ID, Equipment, STP, Calculator, or CEDD / ASD / Housing / BD Spec...')}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-3 text-xs">
          {results.matchSpecs.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">{tx('🏛️ 計算工具及部門 Spec (CEDD · ASD · Housing · BD)', '🏛️ Calculators & HK Dept Specs')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.matchSpecs.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 hover:border-indigo-300">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">{s.emoji} {lang === 'en' ? s.titleEn : s.titleZh}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.testStd}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.calcId && <button type="button" onClick={() => { onNavigate('tools', { toolMode: 'calc', calcId: s.calcId }); onClose(); }} className="rounded-lg bg-brand px-2 py-1 text-[10px] font-extrabold text-white cursor-pointer"><Calculator className="inline h-3 w-3" /></button>}
                      <button type="button" onClick={() => { onNavigate('tools', { toolMode: 'specs' }); onClose(); }} className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-extrabold text-white cursor-pointer"><Landmark className="inline h-3 w-3 mr-0.5" />Spec</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.matchJobs.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('📍 地盤 Sites', '📍 Sites')}</div>
              {results.matchJobs.map((j) => (
                <button key={j.no} type="button" onClick={() => { onNavigate('jobs'); onClose(); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-brand-wash/60 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0"><MapPin className="h-3.5 w-3.5 text-brand shrink-0" /><span className="font-mono font-extrabold text-slate-900">{j.no}</span><span className="font-bold text-slate-800 truncate">{j.shortName}</span></div>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">{j.companyProjNo}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchStp.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('📄 受控 STP 文件 (一按即開)', '📄 Controlled STPs')}</div>
              {results.matchStp.map((t) => (
                <button key={t.code} type="button" onClick={() => { setStpPreviewCode(t.code); onClose(); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-emerald-50 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0"><FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" /><span className="font-mono font-extrabold text-emerald-800">{t.code}</span><span className="font-bold text-slate-800 truncate">{t.name}</span></div>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">{t.stpDocCode}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchEq.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('🔧 Equipment 器材', '🔧 Equipment')}</div>
              {results.matchEq.map((e) => (
                <button key={e.code} type="button" onClick={() => { onNavigate('equipment'); onClose(); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-100 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0"><Wrench className="h-3.5 w-3.5 text-slate-500 shrink-0" /><span className="font-mono font-extrabold text-slate-900">{e.code}</span><span className="font-bold text-slate-800 truncate">{e.name}</span></div>
                  <span className="text-[11px] font-semibold text-brand-deep shrink-0">{e.currentLoan ? e.currentLoan.siteLocation : 'In Lab'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
