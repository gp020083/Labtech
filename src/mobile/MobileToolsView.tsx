import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { CalcToolId } from '../pages/ToolsPage';
import { HK_GOV_SPECS, GOV_DEPTS, GovDeptId, BD_ROCK_TABLE_2_1 } from '../data/hkGovSpecs';
import {
  MobileSonicCalc,
  MobileBleedingCalc,
  MobileKodenCalc,
  MobileFlowConeCalc,
  MobilePointLoadCalc,
} from './MobileSimpleCalcs';
import { MobilePlateLoadCalc, MobileInclinometerCalc } from './MobileHeavyCalcs';
import { JobRefSummaryView } from '../components/tools/JobRefSummaryView';
import {
  Calculator,
  Landmark,
  FolderKanban,
  Droplets,
  Layers,
  Radio,
  Activity,
  Timer,
  Hammer,
  Compass,
} from 'lucide-react';

type SpecMetricTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'violet';

interface CompatDeptCriterion {
  clauseZh: string;
  clauseEn: string;
  criteriaZh: string;
  criteriaEn: string;
  highlightBadge?: string;
  keyLimitBadge?: string;
  metrics?: { label: string; value: string; tone?: SpecMetricTone }[];
}

const METRIC_TONE_CLASSES: Record<SpecMetricTone, string> = {
  brand: 'border-sky-200 bg-sky-50 text-sky-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  violet: 'border-violet-200 bg-violet-50 text-violet-900',
};

const STP_TO_CALC_ID: Record<string, CalcToolId> = {
  KD: 'koden',
  SO: 'sonic',
  FC: 'flowcone',
  BL: 'bleeding',
  PO: 'pointload',
  PLT: 'plt',
  VC: 'inclinometer',
};

export const MobileToolsView: React.FC<{
  forcedMode?: 'calc' | 'registry' | 'specs' | null;
  forcedTool?: CalcToolId | null;
  onConsumeJump?: () => void;
}> = ({ forcedMode, forcedTool, onConsumeJump }) => {
  const { setStpPreviewCode, calcRecords } = useApp();
  const { lang, tx } = usePrefs();
  const [mode, setMode] = useState<'calc' | 'registry' | 'specs'>('calc');
  const [activeTool, setActiveTool] = useState<CalcToolId>('koden');
  const [deptFilter, setDeptFilter] = useState<'ALL' | GovDeptId>('ALL');

  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
    if (forcedTool) setActiveTool(forcedTool);
    if (forcedMode || forcedTool) onConsumeJump?.();
  }, [forcedMode, forcedTool, onConsumeJump]);

  const tools: { id: CalcToolId; Icon: React.ElementType; title: string; sub: string; code: string }[] = [
    { id: 'koden', Icon: Radio, title: 'Koden', sub: 'TM3 · 1:N', code: 'KD' },
    { id: 'sonic', Icon: Activity, title: 'Sonic CSL', sub: 'D6760 · FAT', code: 'SO' },
    { id: 'flowcone', Icon: Timer, title: 'Flow Cone', sub: 'C939 · 0.2s', code: 'FC' },
    { id: 'bleeding', Icon: Droplets, title: 'Bleeding', sub: 'C940 · 0.2%', code: 'BL' },
    { id: 'pointload', Icon: Hammer, title: 'Point Load', sub: 'Is(50) MPa', code: 'PO' },
    { id: 'plt', Icon: Layers, title: 'Plate Load', sub: '4-DG · Es', code: 'PLT' },
    { id: 'inclinometer', Icon: Compass, title: 'Verticality', sub: 'PeeWee · VC', code: 'VC' },
  ];

  return (
    <div
      className="space-y-3 w-full min-w-0"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-extrabold text-slate-900">
            {tx('現場計算、編號總表及部門標準', 'Field Calculators, Job Ref. & Specs')}
          </h1>
          <p className="text-[11px] text-slate-500">
            {tx(
              '全 7 項測試單手計算器、Job Ref. 總表及四大政府部門驗收要求',
              'All 7 mobile calculators, Job Ref. registry and HK Dept acceptance criteria'
            )}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-extrabold">
          <button
            type="button"
            onClick={() => setMode('calc')}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${
              mode === 'calc' ? 'bg-white text-brand-deep shadow-xs' : 'text-slate-600'
            }`}
          >
            <Calculator className="h-3.5 w-3.5 shrink-0" /> {tx(`計算 · ${tools.length}`, `Calc · ${tools.length}`)}
          </button>
          <button
            type="button"
            onClick={() => setMode('registry')}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${
              mode === 'registry' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5 shrink-0" /> {tx(`編號 · ${calcRecords.length}`, `Ref. · ${calcRecords.length}`)}
          </button>
          <button
            type="button"
            onClick={() => setMode('specs')}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${
              mode === 'specs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Landmark className="h-3.5 w-3.5 shrink-0" /> {tx(`標準 · ${HK_GOV_SPECS.length}`, `Specs · ${HK_GOV_SPECS.length}`)}
          </button>
        </div>
      </div>

      {mode === 'registry' ? (
        <JobRefSummaryView />
      ) : mode === 'calc' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {tools.map((t) => {
              const active = activeTool === t.id;
              const ToolIcon = t.Icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTool(t.id)}
                  className={`min-h-[56px] rounded-2xl border p-2.5 text-left transition cursor-pointer ${
                    active
                      ? 'border-brand bg-brand-wash ring-2 ring-brand/25'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ToolIcon className={`h-4 w-4 ${active ? 'text-brand' : 'text-slate-500'}`} />
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${
                        active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.code}
                    </span>
                  </div>
                  <div className="mt-1.5 font-extrabold text-slate-900 leading-snug">{t.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{t.sub}</div>
                </button>
              );
            })}
          </div>
          {activeTool === 'koden' && <MobileKodenCalc />}
          {activeTool === 'sonic' && <MobileSonicCalc />}
          {activeTool === 'flowcone' && <MobileFlowConeCalc />}
          {activeTool === 'bleeding' && <MobileBleedingCalc />}
          {activeTool === 'pointload' && <MobilePointLoadCalc />}
          {activeTool === 'plt' && <MobilePlateLoadCalc />}
          {activeTool === 'inclinometer' && <MobileInclinometerCalc />}
        </>
      ) : (
        <div className="space-y-2.5 text-xs">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pr-4">
            {(['ALL', 'CEDD', 'ASD', 'HOUSING', 'BD'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeptFilter(d)}
                className={`min-h-[44px] rounded-xl px-3.5 py-1.5 font-extrabold shrink-0 cursor-pointer ${
                  deptFilter === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {d === 'ALL' ? tx('全部部門', 'All Depts') : d}
              </button>
            ))}
            <div className="w-2 shrink-0" aria-hidden="true" />
          </div>

          {HK_GOV_SPECS.map((sp) => {
            const depts =
              deptFilter === 'ALL' ? GOV_DEPTS : GOV_DEPTS.filter((d) => d.id === deptFilter);
            const targetCalcId: CalcToolId | undefined =
              (sp.calcId as CalcToolId | undefined) ||
              (sp.stpCode ? STP_TO_CALC_ID[sp.stpCode.toUpperCase()] : undefined);

            return (
              <div
                key={sp.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold text-sm text-slate-900">
                    {sp.emoji} {lang === 'en' ? sp.titleEn : sp.titleZh}
                  </div>
                  {targetCalcId && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool(targetCalcId);
                        setMode('calc');
                      }}
                      className="min-h-[36px] rounded-xl bg-brand px-3 py-1.5 text-[11px] font-extrabold text-white shrink-0 cursor-pointer"
                    >
                      {tx('開啟計算器', 'Open Calc')}
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  {sp.testStd}
                  {sp.stpCode ? ` · STP: ${sp.stpCode}` : ''}
                </div>

                <div className="space-y-2">
                  {depts.map((d) => {
                    const req = sp.depts[d.id] as unknown as CompatDeptCriterion;
                    const badgeText = req.highlightBadge || req.keyLimitBadge;
                    const metrics = req.metrics || [];
                    return (
                      <div
                        key={d.id}
                        className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/70 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold border ${d.badgeCls}`}
                            >
                              {d.short}
                            </span>
                            {badgeText && (
                              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-extrabold text-white">
                                {badgeText}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {lang === 'en' ? req.clauseEn : req.clauseZh}
                          </span>
                        </div>

                        {metrics.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            {metrics.map((m, mIdx) => {
                              const toneCls =
                                METRIC_TONE_CLASSES[m.tone || 'brand'] || METRIC_TONE_CLASSES.brand;
                              return (
                                <div
                                  key={`${m.label}-${mIdx}`}
                                  className={`rounded-lg border px-2 py-1 ${toneCls}`}
                                >
                                  <div className="text-[10px] font-bold opacity-80 leading-tight">
                                    {m.label}
                                  </div>
                                  <div className="font-mono text-[11px] font-extrabold leading-snug">
                                    {m.value}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                            {lang === 'en' ? req.criteriaEn : req.criteriaZh}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {sp.stpCode && (
                  <button
                    type="button"
                    onClick={() => setStpPreviewCode(sp.stpCode!)}
                    className="min-h-[40px] w-full rounded-xl border border-slate-200 py-2 font-bold text-brand-deep cursor-pointer"
                  >
                    {tx(`檢視 ${sp.stpCode} 受控 STP`, `Open ${sp.stpCode} Controlled STP`)}
                  </button>
                )}
              </div>
            );
          })}

          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5 space-y-2">
            <div className="font-extrabold text-violet-900">
              🪨 BD CoP Foundations Table 2.1 · Category 1 Rock
            </div>
            {BD_ROCK_TABLE_2_1.map((r) => (
              <div
                key={r.cat}
                className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-violet-100 text-[11px]"
              >
                <div>
                  <span className="font-extrabold text-violet-900">{r.cat}</span> · {r.grade} · TCR {r.tcr}
                </div>
                <div className="font-mono font-bold text-slate-800">
                  Is(50) {r.is50} · {r.qa}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
