import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { PltStructuredPayload } from '../../utils/completedWorksheetGenerator';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw, Eye, Sparkles } from 'lucide-react';

export interface PltStepRow {
  stepName: string;
  loadKn: string;
  g1: string;
  g2: string;
  g3: string;
  g4: string;
}

export function buildStandard3CycleSteps(workingKpa: number, areaM2: number, z0 = 0.5): PltStepRow[] {
  const stages: [string, number, number][] = [
    ['C1 · 0.5W', 0.5, 1.35],
    ['C1 · 1.0W Working', 1.0, 2.85],
    ['C1 · 0.5W Unload', 0.5, 2.15],
    ['C1 · 0W Unload', 0, 0.95],
    ['C2 · 1.0W Reload', 1.0, 3.05],
    ['C2 · 1.5W', 1.5, 4.65],
    ['C2 · 2.0W', 2.0, 6.45],
    ['C2 · 1.0W Unload', 1.0, 4.85],
    ['C2 · 0W Unload', 0, 1.85],
    ['C3 · 1.5W Reload', 1.5, 5.10],
    ['C3 · 2.0W', 2.0, 6.75],
    ['C3 · 2.5W', 2.5, 8.60],
    ['C3 · 3.0W ≥72h Hold', 3.0, 10.80],
    ['C3 · Final 0W Unload', 0, 3.20],
  ];

  return stages.map(([stepName, mult, nominalSettleMm]) => {
    const loadKn = (mult * workingKpa * areaM2).toFixed(2);
    return {
      stepName,
      loadKn: mult === 0 ? '0' : Number(loadKn).toFixed(1),
      g1: (z0 + nominalSettleMm * 0.98).toFixed(2),
      g2: (z0 + nominalSettleMm * 1.03).toFixed(2),
      g3: (z0 + nominalSettleMm * 1.01).toFixed(2),
      g4: (z0 + nominalSettleMm * 0.98).toFixed(2),
    };
  });
}

export const PlateLoadCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { openPreviewDoc } = useApp();
  const { tx } = usePrefs();
  const [plateShape, setPlateShape] = useState<'square' | 'circular'>('square');
  const [plateSizeMm, setPlateSizeMm] = useState('300');
  const [zeroG, setZeroG] = useState({ g1: '0.50', g2: '0.50', g3: '0.50', g4: '0.50' });
  const [prev10mAvg, setPrev10mAvg] = useState('11.27');
  const [curr10mAvg, setCurr10mAvg] = useState('11.30');
  const [workingKpa, setWorkingKpa] = useState('250');
  const [poissonNu, setPoissonNu] = useState('0.30');
  const [limitMode, setLimitMode] = useState<'015B' | 'asd25' | 'custom'>('015B');
  const [customLimitMm, setCustomLimitMm] = useState('45.0');
  const [steps, setSteps] = useState<PltStepRow[]>(() => buildStandard3CycleSteps(250, 0.09, 0.5));

  const sizeMmNum = Math.max(50, parseFloat(plateSizeMm) || 300);
  const sizeM = sizeMmNum / 1000;
  const areaM2 = plateShape === 'circular' ? (Math.PI * sizeM * sizeM) / 4 : sizeM * sizeM;
  const workKpaNum = Math.max(10, parseFloat(workingKpa) || 250);

  const apply3CycleSchedule = (nextShape = plateShape, nextSizeMm = sizeMmNum, nextWorkKpa = workKpaNum) => {
    const sM = Math.max(0.05, nextSizeMm / 1000);
    const nextArea = nextShape === 'circular' ? (Math.PI * sM * sM) / 4 : sM * sM;
    const z0 = parseFloat(zeroG.g1) || 0.5;
    setSteps(buildStandard3CycleSteps(nextWorkKpa, nextArea, z0));
  };

  const zeroAllStepGauges = () => {
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        g1: zeroG.g1,
        g2: zeroG.g2,
        g3: zeroG.g3,
        g4: zeroG.g4,
      }))
    );
  };

  const handleShapeSwitch = (nextShape: 'square' | 'circular') => {
    if (nextShape === plateShape) return;
    const sM = sizeMmNum / 1000;
    const nextArea = nextShape === 'circular' ? (Math.PI * sM * sM) / 4 : sM * sM;
    const ratio = nextArea / areaM2;
    setPlateShape(nextShape);
    setSteps((prev) =>
      prev.map((st) => {
        const curKn = parseFloat(st.loadKn) || 0;
        return {
          ...st,
          loadKn: curKn > 0 ? (curKn * ratio).toFixed(1) : '0',
        };
      })
    );
  };

  const computed = useMemo(() => {
    const z1 = parseFloat(zeroG.g1) || 0;
    const z2 = parseFloat(zeroG.g2) || 0;
    const z3 = parseFloat(zeroG.g3) || 0;
    const z4 = parseFloat(zeroG.g4) || 0;

    return steps.map((st, idx) => {
      const pKn = Math.max(0, parseFloat(st.loadKn) || 0);
      const pressureKpa = areaM2 > 0 ? pKn / areaM2 : 0;
      const prevKn = idx > 0 ? Math.max(0, parseFloat(steps[idx - 1].loadKn) || 0) : 0;
      const isLoadingOrPeak = pKn > 0 && pKn >= prevKn - 1e-6;
      const d1 = (parseFloat(st.g1) || 0) - z1;
      const d2 = (parseFloat(st.g2) || 0) - z2;
      const d3 = (parseFloat(st.g3) || 0) - z3;
      const d4 = (parseFloat(st.g4) || 0) - z4;
      const arr = [d1, d2, d3, d4];
      const meanMm = (d1 + d2 + d3 + d4) / 4;
      const spreadMm = Math.max(...arr) - Math.min(...arr);
      const tiltWarn = meanMm > 1.0 && spreadMm / meanMm > 0.35;
      const ks = meanMm > 0.05 && pKn > 0 ? pressureKpa / meanMm : null;
      return { ...st, idx, pKn, pressureKpa, isLoadingOrPeak, d1, d2, d3, d4, meanMm, spreadMm, tiltWarn, ks };
    });
  }, [steps, zeroG, areaM2]);

  const peakLoadRow = useMemo(() => {
    const pos = computed.filter((c) => c.pressureKpa > 0);
    return pos.length ? pos.reduce((a, b) => (b.pressureKpa >= a.pressureKpa ? b : a), pos[0]) : computed[0];
  }, [computed]);

  const maxSettleMm = useMemo(() => {
    return computed.length ? Math.max(0, ...computed.map((c) => c.meanMm)) : 0;
  }, [computed]);

  const workRow = useMemo(() => {
    const loadingPos = computed.filter((c) => c.pressureKpa > 0 && c.isLoadingOrPeak && c.meanMm > 0);
    const pool = loadingPos.length > 0 ? loadingPos : computed.filter((c) => c.pressureKpa > 0);
    if (pool.length === 0) return null;
    return pool.reduce((best, cur) =>
      Math.abs(cur.pressureKpa - workKpaNum) < Math.abs(best.pressureKpa - workKpaNum) ? cur : best
    );
  }, [computed, workKpaNum]);

  const rate10m = Math.abs((parseFloat(curr10mAvg) || 0) - (parseFloat(prev10mAvg) || 0));
  const rateStable = rate10m < 0.05 - 1e-9 || Math.abs(rate10m - 0.05) < 1e-9 && rate10m < 0.05;
  const nu = Math.min(0.49, Math.max(0, parseFloat(poissonNu) || 0.3));

  const allowLimitMm =
    limitMode === '015B'
      ? 0.15 * sizeMmNum
      : limitMode === 'asd25'
      ? 25.0
      : Math.max(1, parseFloat(customLimitMm) || 45.0);

  const passSettlement = maxSettleMm <= allowLimitMm + 1e-9;

  const esMpa = useMemo(() => {
    if (!workRow || workRow.meanMm <= 0.02 || workRow.pKn <= 0) return null;
    const shapeFactor = plateShape === 'circular' ? 1.0 : 1.13;
    return (workRow.pKn * (1 - nu * nu)) / (shapeFactor * workRow.meanMm * sizeM);
  }, [workRow, nu, plateShape, sizeM]);

  const updateStep = (idx: number, field: keyof PltStepRow, val: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));

  const platePresets = plateShape === 'circular' ? ['300', '450', '600', '762'] : ['300', '450', '500', '600', '1000'];
  const plateDesc =
    plateShape === 'square'
      ? `Square Plate B×B = ${sizeMmNum}×${sizeMmNum} mm · A = ${areaM2.toFixed(4)} m²`
      : `Circular Plate ØB = ${sizeMmNum} mm · A = ${areaM2.toFixed(4)} m²`;

  const copySummary = [
    `[PLT Plate Load Test — STP07-PLT · BD Cl. 8.2 · HA EXC.T910.1 · 4 Orthogonal Gauges]`,
    `${plateDesc} ｜ Working W = ${workKpaNum.toFixed(0)} kPa`,
    `Peak Test Load = ${peakLoadRow?.pKn.toFixed(1) ?? '0'} kN · q_max = ${peakLoadRow?.pressureKpa.toFixed(1) ?? '0'} kPa`,
    `Max Settlement S_max = ${maxSettleMm.toFixed(2)} mm vs Limit ${allowLimitMm.toFixed(1)} mm → ${passSettlement ? 'PASS' : 'EXCEED'}`,
    `Working Step ${workRow?.stepName || '1.0W'}: Wt = ${workRow?.pKn.toFixed(1) ?? '0'} kN, Sw = ${workRow?.meanMm.toFixed(2) ?? '0'} mm → Es = ${esMpa ? esMpa.toFixed(2) : '—'} MPa · ks = ${workRow?.ks ? workRow.ks.toFixed(1) : '—'} MN/m³`,
    `10-min Settlement Rate = ${rate10m.toFixed(3)} mm / 10 min → ${rateStable ? 'STABLE <0.05mm/10min' : 'HOLD LOAD'}`,
  ].join('\n');

  const pltPayload: PltStructuredPayload = {
    kind: 'PLT',
    plateShape,
    plateSizeMm: sizeMmNum,
    areaM2,
    gaugeCount: 4,
    workingKpa: workKpaNum,
    poissonNu: nu,
    zeroG: {
      g1: parseFloat(zeroG.g1) || 0,
      g2: parseFloat(zeroG.g2) || 0,
      g3: parseFloat(zeroG.g3) || 0,
      g4: parseFloat(zeroG.g4) || 0,
    },
    prev15mAvg: parseFloat(prev10mAvg) || 0,
    curr15mAvg: parseFloat(curr10mAvg) || 0,
    rate15m: rate10m,
    rateStable,
    peakLoadKn: peakLoadRow?.pKn ?? 0,
    peakPressureKpa: peakLoadRow?.pressureKpa ?? 0,
    peakSettlementMm: maxSettleMm,
    limit015BMm: allowLimitMm,
    ksPeak: workRow?.ks ?? peakLoadRow?.ks ?? null,
    esMpa,
    pass015B: passSettlement,
    steps: computed.map((c) => ({
      stepName: c.stepName,
      loadKn: c.pKn,
      pressureKpa: c.pressureKpa,
      g1: parseFloat(c.g1) || 0,
      g2: parseFloat(c.g2) || 0,
      g3: parseFloat(c.g3) || 0,
      g4: parseFloat(c.g4) || 0,
      d1: c.d1,
      d2: c.d2,
      d3: c.d3,
      d4: c.d4,
      meanMm: c.meanMm,
      spreadMm: c.spreadMm,
      ks: c.ks,
      tiltWarn: c.tiltWarn,
    })),
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx(
                '🏗️ Step 1 · 平板載荷試驗計算器 · STP07-PLT · 4 正交錶標準',
                '🏗️ Step 1 · Plate Load Test Calculator · STP07-PLT · 4 Orthogonal Gauges'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tx(
                '全面採用 DG1–DG4 四正交千分錶，支援方形板 B×B 與圓形板 πB²/4 面積及 1.13 形狀修正模量 Es。',
                'Uses 4 orthogonal dial gauges DG1–DG4 with Square B×B vs Circular πB²/4 area and 1.13 Es shape factor.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlateShape('square');
              setPlateSizeMm('300');
              setLimitMode('015B');
              setSteps(buildStandard3CycleSteps(250, 0.09, 0.5));
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設範例', 'Reset')}
          </button>
        </div>

        {/* Setup Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 space-y-2">
            <label className="font-extrabold text-slate-700 block">
              {tx('1. 承載板形狀及尺寸 B · mm', '1. Plate Shape & Size B · mm')}
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => handleShapeSwitch('square')}
                className={`rounded-lg py-1.5 cursor-pointer ${plateShape === 'square' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                ⬜ {tx('方形板 B×B', 'Square B×B')}
              </button>
              <button
                type="button"
                onClick={() => handleShapeSwitch('circular')}
                className={`rounded-lg py-1.5 cursor-pointer ${plateShape === 'circular' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                ⭕ {tx('圓形板 πB²/4', 'Circular πB²/4')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {platePresets.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPlateSizeMm(d)}
                  className={`rounded-lg px-2 py-1 font-mono text-[11px] font-bold cursor-pointer ${plateSizeMm === d ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  {plateShape === 'square' ? `${d}×${d}` : `Ø${d}`}
                </button>
              ))}
              <input
                type="number"
                min="50"
                step="10"
                value={plateSizeMm}
                onChange={(e) => setPlateSizeMm(e.target.value)}
                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-bold"
              />
            </div>
            <div className="flex items-center justify-between pt-0.5 font-mono text-[11px] text-slate-700">
              <span>Area A = <b>{areaM2.toFixed(4)} m²</b></span>
              <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-deep">4 Gauges DG1–DG4</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-700">{tx('2. 四正交錶初始零位 DG0 · mm', '2. Datum Zero DG0 · mm')}</label>
              <button type="button" onClick={zeroAllStepGauges} className="text-[10px] font-bold text-brand-deep hover:underline cursor-pointer">
                {tx('清空階段讀數', 'Zero Steps')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 font-mono">
              {(['g1', 'g2', 'g3', 'g4'] as const).map((k, idx) => (
                <div key={k}>
                  <span className="text-[10px] font-bold text-slate-500">DG{idx + 1},0</span>
                  <input
                    type="number"
                    step="0.01"
                    value={zeroG[k]}
                    onChange={(e) => setZeroG({ ...zeroG, [k]: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-bold text-slate-500 block">{tx('最大容許沉降上限 S_allow', 'Settlement Limit S_allow')}</span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLimitMode('015B')}
                  className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold cursor-pointer ${limitMode === '015B' ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                >
                  0.15B · {(0.15 * sizeMmNum).toFixed(1)}mm
                </button>
                <button
                  type="button"
                  onClick={() => setLimitMode('asd25')}
                  className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold cursor-pointer ${limitMode === 'asd25' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                >
                  ASD · 25.0mm
                </button>
                {limitMode === 'custom' && (
                  <input type="number" step="0.5" value={customLimitMm} onChange={(e) => setCustomLimitMm(e.target.value)} className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold" />
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-3 border space-y-1.5 ${rateStable ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
            <label className="font-extrabold text-slate-700 block">
              {tx('3. 10 分鐘沉降穩定率 STP07 Cl. 4.3', '3. 10-Min Settlement Rate Cl. 4.3')}
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <span className="text-[10px] text-slate-500">{tx('10m 前均值 · mm', '10m Ago · mm')}</span>
                <input type="number" step="0.01" value={prev10mAvg} onChange={(e) => setPrev10mAvg(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">{tx('當前均值 · mm', 'Current · mm')}</span>
                <input type="number" step="0.01" value={curr10mAvg} onChange={(e) => setCurr10mAvg(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold" />
              </div>
            </div>
            <div className={`text-[11px] font-extrabold ${rateStable ? 'text-emerald-800' : 'text-amber-900'}`}>
              Δs = {rate10m.toFixed(2)} mm / 10 min →{' '}
              {rateStable
                ? tx('✓ 穩定 < 0.05 mm / 10 min', '✓ STABLE < 0.05 mm / 10 min')
                : tx('⏳ 維持荷載 ≥ 0.05 mm / 10 min', '⏳ HOLD LOAD ≥ 0.05 mm / 10 min')}
            </div>
            <div className="text-[10px] text-slate-600">
              {tx('每級維持 ≥ 10 分鐘；3W 頂載維持 ≥ 72 小時', 'Hold each step ≥ 10 min; hold 3W peak ≥ 72 hrs')}
            </div>
          </div>
        </div>

        {/* 3-Cycle Preset & Document Links */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-700">
              <span>Working W · kPa</span>
              <input
                type="number"
                min="20"
                step="10"
                value={workingKpa}
                onChange={(e) => setWorkingKpa(e.target.value)}
                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-extrabold"
              />
            </label>
            <label className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
              <span>ν</span>
              <input
                type="number"
                min="0.1"
                max="0.49"
                step="0.05"
                value={poissonNu}
                onChange={(e) => setPoissonNu(e.target.value)}
                className="w-15 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs font-extrabold"
              />
            </label>
            <button
              type="button"
              onClick={() => apply3CycleSchedule()}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 font-extrabold text-white hover:bg-indigo-700 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {tx(
                `載入 3 循環標準階段 · 1W / 2W / 3W=${(workKpaNum * 3).toFixed(0)}kPa`,
                `Load 3-Cycle Schedule · 1W / 2W / 3W=${(workKpaNum * 3).toFixed(0)}kPa`
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => openPreviewDoc({ title: 'FQS08-FDT-PLT-1 — Plate Load Test Order Form', url: '/server-docs/forms/FQS08-FDT-PLT_Test_Order_Form_261028.pdf' })} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 font-bold text-emerald-900 hover:bg-emerald-50 cursor-pointer">
              <Eye className="h-3 w-3" /> {tx('FQS08 委託單', 'FQS08 Order')}
            </button>
            <button type="button" onClick={() => openPreviewDoc({ title: 'FST07-FDT-PLT-1-261028 — Plate Load Test Worksheet', url: '/server-docs/worksheets/FST07-FDT-PLT-1-261028_Worksheet_template.xlsx' })} className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-white px-2.5 py-1 font-bold text-brand-deep hover:bg-brand-wash/40 cursor-pointer">
              <Eye className="h-3 w-3" /> FST07 XLSX
            </button>
            <button type="button" onClick={() => openPreviewDoc({ title: 'FDT-PLT-RT-1-261028 — Plate Load Test Report Master Template', url: '/server-docs/reports/FDT-PLT-RT-1-261028_Report_template.xlsx' })} className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 font-bold text-amber-900 hover:bg-amber-50 cursor-pointer">
              <Eye className="h-3 w-3" /> {tx('報告範本 XLSX', 'Report XLSX')}
            </button>
            <button type="button" onClick={() => openPreviewDoc({ title: 'STP07-PLT — Plate Load Test Draft STP', url: '/server-docs/stp/STP07-PLT_Draft_rev0_261027.pdf' })} className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 font-bold text-indigo-900 hover:bg-indigo-50 cursor-pointer">
              <Eye className="h-3 w-3" /> STP07 PDF
            </button>
            <button type="button" onClick={() => openPreviewDoc({ title: tx('Plate Load Test 750 kPa 反力架結構驗算書', 'Plate Load Test 750 kPa Reaction Frame Check'), url: '/server-docs/stp/PLT_Setup_Checking_750kPa_261021.pdf' })} className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 font-bold text-indigo-900 hover:bg-indigo-50 cursor-pointer">
              <Eye className="h-3 w-3" /> 750kPa PDF
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-3.5">
            <div className="text-xs font-bold text-slate-600">{tx('最高測試應力 q_max', 'Peak Bearing Pressure')}</div>
            <div className="mt-1 font-mono text-xl sm:text-2xl font-extrabold text-brand-deep">
              {peakLoadRow?.pressureKpa.toFixed(1) ?? '0.0'} kPa
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              P_max = {peakLoadRow?.pKn.toFixed(1) ?? '0.0'} kN
            </div>
          </div>

          <div className={`rounded-2xl border p-3.5 ${passSettlement ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
            <div className="text-xs font-bold text-slate-600">{tx('最大平均沉降 S_max', 'Max Settlement S_max')}</div>
            <div className={`mt-1 font-mono text-xl sm:text-2xl font-extrabold ${passSettlement ? 'text-emerald-800' : 'text-rose-800'}`}>
              {maxSettleMm.toFixed(2)} mm
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              ≤ {allowLimitMm.toFixed(1)} mm: {passSettlement ? '✓ PASS' : '✗ EXCEED'}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3.5">
            <div className="text-xs font-bold text-indigo-900">{tx('土壤楊氏模量 Es · 1W', 'Soil Modulus Es · 1W')}</div>
            <div className="mt-1 font-mono text-xl sm:text-2xl font-extrabold text-indigo-950">
              {esMpa ? `${esMpa.toFixed(2)} MPa` : '—'}
            </div>
            <div className="text-[10px] font-mono text-indigo-800">
              {plateShape === 'square' ? 'Wt(1−ν²)/(1.13·S·B)' : 'Wt(1−ν²)/(S·B)'} · Sw={workRow?.meanMm.toFixed(2) ?? '—'}mm
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-bold text-slate-600">{tx('基床反力模量 ks · 1W', 'Subgrade Modulus ks')}</div>
            <div className="mt-1 font-mono text-xl sm:text-2xl font-extrabold text-slate-900">
              {workRow?.ks ? `${workRow.ks.toFixed(1)} MN/m³` : '—'}
            </div>
            <div className="text-[10px] font-mono text-slate-600">
              {workRow ? `${workRow.stepName} · ${workRow.pressureKpa.toFixed(0)} kPa` : 'q / S'}
            </div>
          </div>
        </div>

        {/* 4-Gauge Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 whitespace-nowrap">
              <tr>
                <th className="px-2.5 py-2">{tx('荷載階段 Stage', 'Load Stage')}</th>
                <th className="px-2 py-2">P · kN</th>
                <th className="px-2 py-2">q · kPa</th>
                <th className="px-2 py-2">DG1</th>
                <th className="px-2 py-2">DG2</th>
                <th className="px-2 py-2">DG3</th>
                <th className="px-2 py-2">DG4</th>
                <th className="px-2.5 py-2">{tx('平均沉降 S · mm', 'Mean S · mm')}</th>
                <th className="px-2.5 py-2">ks · MN/m³</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {computed.map((r, i) => {
                const isWork = workRow?.idx === i;
                return (
                  <tr
                    key={i}
                    className={
                      r.tiltWarn
                        ? 'bg-amber-50/65'
                        : isWork
                        ? 'bg-indigo-50/45'
                        : 'hover:bg-slate-50/70'
                    }
                  >
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.stepName}
                        onChange={(e) => updateStep(i, 'stepName', e.target.value)}
                        className="w-36 rounded border border-slate-200 bg-white px-1.5 py-1 font-sans text-xs font-bold"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={r.loadKn}
                        onChange={(e) => updateStep(i, 'loadKn', e.target.value)}
                        className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="px-2 py-1.5 font-bold text-slate-700">{r.pressureKpa.toFixed(0)}</td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g1} onChange={(e) => updateStep(i, 'g1', e.target.value)} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g2} onChange={(e) => updateStep(i, 'g2', e.target.value)} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g3} onChange={(e) => updateStep(i, 'g3', e.target.value)} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g4} onChange={(e) => updateStep(i, 'g4', e.target.value)} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2.5 py-1.5 font-extrabold text-brand-deep whitespace-nowrap">
                      {r.meanMm.toFixed(2)} {r.tiltWarn && <span title="Gauge spread > 35% of mean">⚠️Tilt</span>}
                      {isWork && <span className="ml-1 rounded bg-indigo-600 px-1 py-0.5 font-sans text-[9px] text-white">Es</span>}
                    </td>
                    <td className="px-2.5 py-1.5 font-bold text-slate-700">{r.ks ? r.ks.toFixed(1) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() =>
            setSteps([
              ...steps,
              {
                stepName: `Stage ${steps.length + 1}`,
                loadKn: (workKpaNum * areaM2).toFixed(1),
                g1: '4.20',
                g2: '4.28',
                g3: '4.24',
                g4: '4.20',
              },
            ])
          }
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> {tx('新增荷載級別', 'Add Load Stage')}
        </button>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="PLT"
          standardRef="BS 1377: Part 9: 1990 Cl. 4.1 · BD CoP Cl. 8.2 · HA EXC.T910.1 · STP07-PLT"
          formulaText={
            plateShape === 'square'
              ? 'A = B² ｜ S = Σ(DGi − DGi,0)/4 ｜ Es = Wt(1−ν²) / (1.13 · S · B) ｜ S_max ≤ 0.15B'
              : 'A = πB²/4 ｜ S = Σ(DGi − DGi,0)/4 ｜ Es = Wt(1−ν²) / (S · B) ｜ S_max ≤ 0.15B'
          }
          copyText={copySummary}
          structuredData={pltPayload}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            {
              title: tx('鋪設薄層細砂及安裝剛性承載板', 'Prepare Sand Bedding & Rigid Bearing Plate'),
              detail: tx(
                '整平土面並鋪設 ≤ 15 mm 乾燥細砂找平，安放厚度 ≥ 25 mm 之方形或圓形剛性承載鋼板；千斤頂與鋼板之間嚴禁使用球鉸座，Load Cell 須按 HOKLAS SC-16 於每次工地測試系列前完成校準。',
                'Level with ≤ 15 mm dry sand bedding, place ≥ 25 mm rigid square or circular steel plate with NO ball seating at jack-to-plate connection, and verify Load Cell calibration per HOKLAS SC-16.'
              ),
            },
            {
              title: tx('架設獨立基準樑及四角正交 DG1–DG4', 'Set Reference Beam & 4 Orthogonal Dial Gauges'),
              detail: tx(
                '基準樑支座距承載板邊緣須 ≥ 2.5B 並架設防曬防風棚；於四正交方位對稱安裝 4 隻 0.01 mm 精度千分錶 DG1–DG4，初始預壓應力 ≤ 25% 原有覆土壓力並記錄零位。',
                'Keep reference beam supports ≥ 2.5B from plate edge under sun/wind shelter; mount 4 orthogonal 0.01 mm dial gauges DG1–DG4 and apply seating pressure ≤ 25% initial overburden.'
              ),
            },
            {
              title: tx('3 循環分級維持及 3W 頂載 72 小時保壓', '3-Cycle Holding & 72-Hour Peak Hold at 3W'),
              detail: tx(
                '按 0.5W 級距執行 1W、2W、3W 三循環加卸載：每級維持 ≥ 10 分鐘且沉降率 < 0.05 mm / 10 min；3W 頂載維持 ≥ 72 小時，全過程最大沉降 S_max ≤ 0.15B。',
                'Run 3 loading cycles to 1W, 2W, and 3W in 0.5W increments: hold each step ≥ 10 min until settlement rate < 0.05 mm / 10 min; hold 3W peak load ≥ 72 hours, verifying S_max ≤ 0.15B.'
              ),
            },
          ]}
          pitfalls={[
            tx(
              '方形承載板之模量計算必須除以 1.13 形狀係數，而 300×300 mm 方板面積為 0.0900 m²，切勿誤套圓板 0.0707 m² 面積導致千斤頂推力偏差 27%。',
              'Square plates require the 1.13 denominator in Es and A = 0.0900 m² for 300×300 mm — never apply circular area 0.0707 m² to a square plate.'
            ),
            tx(
              '若四錶讀數差超過平均沉降 35% 觸發 ⚠️Tilt，代表反力偏心或土層軟硬不均，須立即暫停增壓檢查架設安全。',
              'If gauge spread exceeds 35% of mean settlement (⚠️Tilt), pause loading immediately and inspect reaction eccentricity.'
            ),
          ]}
        />
      </div>
    </div>
  );
};
