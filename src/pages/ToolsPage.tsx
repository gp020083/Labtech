import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { BleedingCalcTool } from '../components/tools/BleedingCalcTool';
import { PlateLoadCalcTool } from '../components/tools/PlateLoadCalcTool';
import { KodenVerticalityTool, FlowConeCalcTool, PointLoadCalcTool } from '../components/tools/KodenFlowPointTools';
import { InclinometerCalcTool } from '../components/tools/InclinometerCalcTool';
import { GovSpecMatrixView } from '../components/tools/GovSpecMatrixView';
import { JobRefSummaryView } from '../components/tools/JobRefSummaryView';
import { Calculator, Landmark, FolderKanban, Droplets, Timer, Radio, Layers, Hammer, Compass } from 'lucide-react';

export type CalcToolId = 'bleeding' | 'plt' | 'koden' | 'flowcone' | 'pointload' | 'inclinometer';

export const ToolsPage: React.FC<{
  forcedMode?: 'calc' | 'registry' | 'specs' | null;
  forcedTool?: CalcToolId | null;
  onConsumeJump?: () => void;
}> = ({ forcedMode, forcedTool, onConsumeJump }) => {
  const { calcRecords } = useApp();
  const { tx } = usePrefs();
  const [mode, setMode] = useState<'calc' | 'registry' | 'specs'>('calc');
  const [activeTool, setActiveTool] = useState<CalcToolId>('bleeding');

  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
    if (forcedTool) setActiveTool(forcedTool);
    if (forcedMode || forcedTool) onConsumeJump?.();
  }, [forcedMode, forcedTool, onConsumeJump]);

  const calcTools: { id: CalcToolId; Icon: React.ElementType; title: string; sub: string; code: string }[] = [
    { id: 'bleeding', Icon: Droplets, title: 'Grout Bleeding', sub: 'ASTM C940 · FST04', code: 'BL' },
    { id: 'flowcone', Icon: Timer, title: 'Flow Cone', sub: 'ASTM C939 · FST05', code: 'FC' },
    { id: 'koden', Icon: Radio, title: 'Koden Test', sub: 'HKCI TM3 · FST02', code: 'KD' },
    { id: 'plt', Icon: Layers, title: 'Plate Load Test', sub: 'STP07-PLT · App. B/C', code: 'PLT' },
    { id: 'pointload', Icon: Hammer, title: 'Point Load', sub: 'ASTM D5731 · FST06', code: 'PO' },
    { id: 'inclinometer', Icon: Compass, title: 'Inclinometer', sub: 'A0/A180 Drift · 1:N', code: 'VC' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-extrabold text-amber-800">
            <Calculator className="h-3.5 w-3.5" /> HOKLAS FIELD TEST · WORKSHEET &amp; REPORT GENERATOR
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {tx('現場測試計算、編號管理及報告生成系統', 'Field Test Calculators, Job Ref. Registry & Report Generator')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {tx(
              '左欄輸入測試讀數及樣本資料 (Sample Information)，右欄即時編配 Job Reference No. 並生成全英文官方 Excel (.xlsx)、工作紙 (Worksheet) 及正式報告 (Formal Report)。',
              'Enter test readings and Sample Information on the left; assign Job Reference No. and generate 100% English Official Excel (.xlsx), Worksheet & Formal Report on the right.'
            )}
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200/80 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setMode('calc')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer ${mode === 'calc' ? 'bg-white text-brand-deep shadow-xs ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Calculator className="h-4 w-4" />
            <span>{tx('1. 測試計算及工作紙 (Test & Worksheet)', '1. Test & Worksheet (6)')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('registry')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer ${mode === 'registry' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>{tx(`2. Job Ref. 編號總表 (${calcRecords.length})`, `2. Job Ref. Summary (${calcRecords.length})`)}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('specs')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer ${mode === 'specs' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Landmark className="h-4 w-4" />
            <span>{tx('3. 政府部門驗收標準 (Gov Specs)', '3. HK Gov Specs (8)')}</span>
          </button>
        </div>
      </div>

      {mode === 'registry' ? (
        <JobRefSummaryView />
      ) : mode === 'specs' ? (
        <GovSpecMatrixView onJumpCalc={(cid) => { setActiveTool(cid); setMode('calc'); }} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {calcTools.map((t) => {
              const active = activeTool === t.id;
              const ToolIcon = t.Icon;
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
                    <span className={`rounded-lg p-1.5 ${active ? 'bg-brand/15 text-brand-deep' : 'bg-slate-100 text-slate-600'}`}>
                      <ToolIcon className="h-4 w-4" />
                    </span>
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
