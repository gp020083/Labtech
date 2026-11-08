import React, { useState, useEffect } from 'react';
import { usePrefs } from '../prefs';
import { BleedingCalcTool } from '../components/tools/BleedingCalcTool';
import { PlateLoadCalcTool } from '../components/tools/PlateLoadCalcTool';
import { KodenVerticalityTool, FlowConeCalcTool, PointLoadCalcTool } from '../components/tools/KodenFlowPointTools';
import { InclinometerCalcTool } from '../components/tools/InclinometerCalcTool';
import { GovSpecMatrixView } from '../components/tools/GovSpecMatrixView';
import { Calculator, Landmark } from 'lucide-react';

export type CalcToolId = 'bleeding' | 'plt' | 'koden' | 'flowcone' | 'pointload' | 'inclinometer';

export const ToolsPage: React.FC<{
  forcedMode?: 'calc' | 'specs' | null;
  forcedTool?: CalcToolId | null;
  onConsumeJump?: () => void;
}> = ({ forcedMode, forcedTool, onConsumeJump }) => {
  const { tx } = usePrefs();
  const [mode, setMode] = useState<'calc' | 'specs'>('calc');
  const [activeTool, setActiveTool] = useState<CalcToolId>('bleeding');

  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
    if (forcedTool) setActiveTool(forcedTool);
    if (forcedMode || forcedTool) onConsumeJump?.();
  }, [forcedMode, forcedTool, onConsumeJump]);

  const calcTools: { id: CalcToolId; emoji: string; title: string; sub: string; code: string }[] = [
    { id: 'bleeding', emoji: '💧', title: 'Grout Bleeding', sub: 'mL / mm · Bleed % + Exp %', code: 'BL' },
    { id: 'plt', emoji: '🏗️', title: 'Plate Load Test', sub: '3-Cycle + BD Cl.8.2 Es', code: 'PLT' },
    { id: 'koden', emoji: '📡', title: 'Koden Test', sub: 'Offset e + Verticality 1:N', code: 'KD' },
    { id: 'flowcone', emoji: '⏱️', title: 'Flow Cone', sub: 'Efflux Time + Repeatability', code: 'FC' },
    { id: 'pointload', emoji: '🪨', title: 'Point Load', sub: 'Is(50) + BD Cat 1(a–c)', code: 'PO' },
    { id: 'inclinometer', emoji: '📐', title: 'Verticality Check', sub: 'A0/A180 Drift + 1:N', code: 'VC' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-extrabold text-amber-800">
            <Calculator className="h-3.5 w-3.5" /> FIELD CALCULATORS · GUIDES · HK GOV SPECS
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {tx('TOOL — 自動計算工具、操作指南及 Spec 驗收要求', 'TOOL — Calculators, Guides & HK Dept Specs')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {tx(
              '提供現場測試自動計算、標準操作步驟指南，以及 CEDD、ASD、Housing 及 BD 各項測試核心驗收要求（Requirement）',
              'Field calculators, operating procedures, and concise CEDD, ASD, Housing Authority & BD testing requirements.'
            )}
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setMode('calc')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${mode === 'calc' ? 'bg-white text-brand-deep shadow-xs ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Calculator className="h-4 w-4" />
            <span>{tx('自動計算工具 + Guide (6)', 'Calculators + Guide (6)')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('specs')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${mode === 'specs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Landmark className="h-4 w-4" />
            <span>{tx('CEDD · ASD · Housing · BD Spec (8)', 'HK Gov & BD Specs (8)')}</span>
          </button>
        </div>
      </div>
      {mode === 'specs' ? (
        <GovSpecMatrixView onJumpCalc={(cid) => { setActiveTool(cid); setMode('calc'); }} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {calcTools.map((t) => {
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTool(t.id)}
                  className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    active ? 'border-brand bg-brand-wash/75 ring-2 ring-brand/25 shadow-xs' : 'border-slate-200/85 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg">{t.emoji}</span>
                    <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>{t.code}</span>
                  </div>
                  <div className="mt-2 text-xs font-extrabold text-slate-900">{t.title}</div>
                  <div className="text-[11px] text-slate-500">{t.sub}</div>
                </button>
              );
            })}
          </div>

          {activeTool === 'bleeding' && <BleedingCalcTool onViewAllSpecs={() => setMode('specs')} />}
          {activeTool === 'plt' && <PlateLoadCalcTool onViewAllSpecs={() => setMode('specs')} />}
          {activeTool === 'koden' && <KodenVerticalityTool onViewAllSpecs={() => setMode('specs')} />}
          {activeTool === 'flowcone' && <FlowConeCalcTool onViewAllSpecs={() => setMode('specs')} />}
          {activeTool === 'pointload' && <PointLoadCalcTool onViewAllSpecs={() => setMode('specs')} />}
          {activeTool === 'inclinometer' && <InclinometerCalcTool onViewAllSpecs={() => setMode('specs')} />}
        </>
      )}
    </div>
  );
};
