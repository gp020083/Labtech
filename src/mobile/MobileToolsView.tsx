import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { CalcToolId } from '../pages/ToolsPage';
import { HK_GOV_SPECS, GOV_DEPTS, GovDeptId, BD_ROCK_TABLE_2_1 } from '../data/hkGovSpecs';
import { MobileBleedingCalc, MobileKodenCalc, MobileFlowConeCalc, MobilePointLoadCalc } from './MobileSimpleCalcs';
import { MobilePlateLoadCalc, MobileInclinometerCalc } from './MobileHeavyCalcs';
import { JobRefSummaryView } from '../components/tools/JobRefSummaryView';
import { Calculator, Landmark, FolderKanban, Droplets, Layers, Radio, Timer, Hammer, Compass } from 'lucide-react';

export const MobileToolsView: React.FC<{
  forcedMode?: 'calc' | 'specs' | null;
  forcedTool?: CalcToolId | null;
  onConsumeJump?: () => void;
}> = ({ forcedMode, forcedTool, onConsumeJump }) => {
  const { setStpPreviewCode, calcRecords } = useApp();
  const { lang, tx } = usePrefs();
  const [mode, setMode] = useState<'calc' | 'registry' | 'specs'>('calc');
  const [activeTool, setActiveTool] = useState<CalcToolId>('bleeding');
  const [deptFilter, setDeptFilter] = useState<'ALL' | GovDeptId>('ALL');

  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
    if (forcedTool) setActiveTool(forcedTool);
    if (forcedMode || forcedTool) onConsumeJump?.();
  }, [forcedMode, forcedTool, onConsumeJump]);

  const tools: { id: CalcToolId; Icon: React.ElementType; title: string; sub: string; code: string }[] = [
    { id: 'bleeding', Icon: Droplets, title: 'Bleeding', sub: 'mL / mm · %', code: 'BL' },
    { id: 'plt', Icon: Layers, title: 'Plate Load', sub: '3-Cycle · Es', code: 'PLT' },
    { id: 'koden', Icon: Radio, title: 'Koden', sub: 'Offset · 1:N', code: 'KD' },
    { id: 'flowcone', Icon: Timer, title: 'Flow Cone', sub: 'Efflux (s)', code: 'FC' },
    { id: 'pointload', Icon: Hammer, title: 'Point Load', sub: 'Is(50) MPa', code: 'PO' },
    { id: 'inclinometer', Icon: Compass, title: 'Verticality', sub: 'A0/A180 · 1:N', code: 'VC' },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-extrabold text-slate-900">{tx('現場計算、編號及部門標準', 'Field Calculators, Job Ref. & Specs')}</h1>
          <p className="text-[11px] text-slate-500">{tx('直向單手操作計算器、Job Ref. No. 總表及 CEDD / ASD / Housing / BD 驗收要求', 'Mobile calculators, Job Ref. registry and HK Dept acceptance criteria')}</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-extrabold">
          <button type="button" onClick={() => setMode('calc')} className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${mode === 'calc' ? 'bg-white text-brand-deep shadow-xs' : 'text-slate-600'}`}><Calculator className="h-3.5 w-3.5" /> {tx('計算 (6)', 'Calc (6)')}</button>
          <button type="button" onClick={() => setMode('registry')} className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${mode === 'registry' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'}`}><FolderKanban className="h-3.5 w-3.5" /> {tx(`編號 (${calcRecords.length})`, `Ref. (${calcRecords.length})`)}</button>
          <button type="button" onClick={() => setMode('specs')} className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${mode === 'specs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}><Landmark className="h-3.5 w-3.5" /> {tx('標準 (8)', 'Specs (8)')}</button>
        </div>
      </div>

      {mode === 'registry' ? (
        <div className="-mx-3 overflow-x-auto px-3">
          <JobRefSummaryView />
        </div>
      ) : mode === 'calc' ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {tools.map((t) => {
              const active = activeTool === t.id;
              const ToolIcon = t.Icon;
              return (
                <button key={t.id} type="button" onClick={() => setActiveTool(t.id)} className={`rounded-2xl border p-2.5 text-left transition cursor-pointer ${active ? 'border-brand bg-brand-wash ring-2 ring-brand/25' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between"><ToolIcon className={`h-4 w-4 ${active ? 'text-brand' : 'text-slate-500'}`} /><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>{t.code}</span></div>
                  <div className="mt-1.5 font-extrabold text-slate-900 truncate">{t.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{t.sub}</div>
                </button>
              );
            })}
          </div>
          {activeTool === 'bleeding' && <MobileBleedingCalc />}
          {activeTool === 'plt' && <MobilePlateLoadCalc />}
          {activeTool === 'koden' && <MobileKodenCalc />}
          {activeTool === 'flowcone' && <MobileFlowConeCalc />}
          {activeTool === 'pointload' && <MobilePointLoadCalc />}
          {activeTool === 'inclinometer' && <MobileInclinometerCalc />}
        </>
      ) : (
        <div className="space-y-2.5 text-xs">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {(['ALL', 'CEDD', 'ASD', 'HOUSING', 'BD'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDeptFilter(d)} className={`rounded-xl px-3 py-1.5 font-extrabold shrink-0 cursor-pointer ${deptFilter === d ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{d === 'ALL' ? tx('全部部門', 'All Depts') : d}</button>
            ))}
          </div>
          {HK_GOV_SPECS.map((sp) => {
            const depts = deptFilter === 'ALL' ? GOV_DEPTS : GOV_DEPTS.filter((d) => d.id === deptFilter);
            return (
              <div key={sp.id} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold text-sm text-slate-900">{sp.emoji} {lang === 'en' ? sp.titleEn : sp.titleZh}</div>
                  {sp.calcId && <button type="button" onClick={() => { setActiveTool(sp.calcId!); setMode('calc'); }} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white shrink-0 cursor-pointer">{tx('計算器', 'Calc')}</button>}
                </div>
                <div className="text-[11px] text-slate-500">{sp.testStd} {sp.stpCode ? `· STP: ${sp.stpCode}` : ''}</div>
                <div className="space-y-1.5">
                  {depts.map((d) => {
                    const req = sp.depts[d.id];
                    return (
                      <div key={d.id} className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold border ${d.badgeCls}`}>{d.short}</span>
                          <span className="font-mono text-[10px] font-bold text-slate-500">{lang === 'en' ? req.clauseEn : req.clauseZh}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-800 whitespace-pre-line">{lang === 'en' ? req.criteriaEn : req.criteriaZh}</div>
                      </div>
                    );
                  })}
                </div>
                {sp.stpCode && <button type="button" onClick={() => setStpPreviewCode(sp.stpCode!)} className="w-full rounded-xl border border-slate-200 py-1.5 font-bold text-brand-deep cursor-pointer">{tx(`檢視 ${sp.stpCode} 受控 STP`, `Open ${sp.stpCode} STP`)}</button>}
              </div>
            );
          })}
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5 space-y-2">
            <div className="font-extrabold text-violet-900">🪨 BD CoP Foundations Table 2.1 (Rock Cat 1)</div>
            {BD_ROCK_TABLE_2_1.map((r) => (
              <div key={r.cat} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-violet-100 text-[11px]">
                <div><span className="font-extrabold text-violet-900">{r.cat}</span> · {r.grade} (TCR {r.tcr})</div>
                <div className="font-mono font-bold text-slate-800">Is50 {r.is50} · {r.qa}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
