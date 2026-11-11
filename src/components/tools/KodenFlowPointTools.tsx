import React, { useState, useMemo } from 'react';
import { usePrefs } from '../../prefs';
import { getHkTodayIso } from '../../utils';
import {
  formatNearest02,
  roundToNearestStep,
  computePointLoadTrimmedMean,
} from '../../utils/limsRules';
import {
  KodenStructuredPayload,
  FlowConeStructuredPayload,
  PointLoadStructuredPayload,
} from '../../utils/completedWorksheetGenerator';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw, Calculator, AlertTriangle } from 'lucide-react';

function round4(val: number): number {
  return Math.round(val * 10000) / 10000;
}

export function formatSigFigs(val: number, sig: number): string {
  if (!Number.isFinite(val) || val <= 0) return '0';
  const n = Number(val.toPrecision(sig));
  if (n >= Math.pow(10, sig - 1)) return Math.round(n).toString();
  return val.toPrecision(sig);
}

interface KodenSectionRow {
  label: string;
  fromM: string;
  toM: string;
  dxMm: string;
  dyMm: string;
}

export const KodenVerticalityTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [pileDiaMm, setPileDiaMm] = useState('2500');
  const [tapeDepthM, setTapeDepthM] = useState('42.50');
  const [uesDepthM, setUesDepthM] = useState('42.42');
  const [d1M, setD1M] = useState('2.5');
  const [d2M, setD2M] = useState('42.5');
  const [offsetInputMode, setOffsetInputMode] = useState<'direct' | 'chart'>('direct');
  const [shX, setShX] = useState('0.0250');
  const [shY, setShY] = useState('0.0250');
  const [chartDrxMm, setChartDrxMm] = useState('4.60');
  const [chartDryMm, setChartDryMm] = useState('3.40');
  const [caliperDiaMm, setCaliperDiaMm] = useState('100.0');
  const [dxMm, setDxMm] = useState('115');
  const [dyMm, setDyMm] = useState('85');
  const [dirX, setDirX] = useState<'E' | 'W'>('E');
  const [dirY, setDirY] = useState<'N' | 'S'>('S');
  const [specDenom, setSpecDenom] = useState('75');
  const [showScaleHelper, setShowScaleHelper] = useState(false);
  const [sectionalEnabled, setSectionalEnabled] = useState(false);
  const [sections, setSections] = useState<KodenSectionRow[]>([
    { label: 'Sec 1', fromM: '2.5', toM: '12.5', dxMm: '28', dyMm: '20' },
    { label: 'Sec 2', fromM: '12.5', toM: '22.5', dxMm: '31', dyMm: '22' },
    { label: 'Sec 3', fromM: '22.5', toM: '32.5', dxMm: '29', dyMm: '23' },
    { label: 'Sec 4', fromM: '32.5', toM: '42.5', dxMm: '27', dyMm: '20' },
  ]);

  const tapeNum = Math.max(0.1, parseFloat(tapeDepthM) || 0);
  const uesNum = Math.max(0.1, parseFloat(uesDepthM) || 0);
  const depthDiffM = Math.abs(tapeNum - uesNum);
  const depthTolM = Math.min(0.3, 0.01 * tapeNum);
  const depthVerifyOk = tapeNum > 0 && depthDiffM <= depthTolM + 1e-9;

  const d1Num = Math.max(0, parseFloat(d1M) || 0);
  const d2Num = Math.max(d1Num + 0.5, parseFloat(d2M) || 42.5);
  const deltaDM = Number((d2Num - d1Num).toFixed(3));

  const shX4 = round4(Math.max(0.0001, parseFloat(shX) || 0.025));
  const shY4 = round4(Math.max(0.0001, parseFloat(shY) || 0.025));
  const shAvg4 = round4((shX4 + shY4) / 2);
  const convertedDiaM = Number(((parseFloat(caliperDiaMm) || 0) * shAvg4).toFixed(3));

  const absDxMm =
    offsetInputMode === 'chart'
      ? round4((Math.abs(parseFloat(chartDrxMm) || 0) * shX4)) * 1000
      : Math.abs(parseFloat(dxMm) || 0);
  const absDyMm =
    offsetInputMode === 'chart'
      ? round4((Math.abs(parseFloat(chartDryMm) || 0) * shY4)) * 1000
      : Math.abs(parseFloat(dyMm) || 0);

  const signedDxMm = dirX === 'E' ? absDxMm : -absDxMm;
  const signedDyMm = dirY === 'N' ? absDyMm : -absDyMm;

  const lxM = round4(absDxMm / 1000);
  const lyM = round4(absDyMm / 1000);
  const vxDenom = lxM > 0 ? deltaDM / lxM : 9999;
  const vyDenom = lyM > 0 ? deltaDM / lyM : 9999;

  const lrM = Math.hypot(lxM, lyM);
  const lrRound4 = round4(lrM);
  const offsetMm = lrM * 1000;
  const ratioDenom = lrRound4 > 0 ? deltaDM / lrRound4 : 9999;
  const vertPct = (lrM / deltaDM) * 100;
  const limitDenom = parseFloat(specDenom) || 75;
  const resultantDir = `Towards ${absDyMm > 0.1 ? dirY : ''}${absDxMm > 0.1 ? dirX : ''}`.trim() || 'Vertical';

  const computedSections = useMemo(() => {
    return sections.map((s) => {
      const f = parseFloat(s.fromM) || 0;
      const t = Math.max(f + 0.5, parseFloat(s.toM) || f + 10);
      const secLenM = t - f;
      const sx = round4(Math.abs(parseFloat(s.dxMm) || 0) / 1000);
      const sy = round4(Math.abs(parseFloat(s.dyMm) || 0) / 1000);
      const sLr = round4(Math.hypot(sx, sy));
      const secDenom = sLr > 0 ? secLenM / sLr : 9999;
      const secOk = secDenom >= limitDenom;
      return { ...s, secLenM, sLrMm: sLr * 1000, secDenom, secOk };
    });
  }, [sections, limitDenom]);

  const allSectionsPass = !sectionalEnabled || computedSections.every((s) => s.secOk);
  const overallVertOk = ratioDenom >= limitDenom;
  const isPass = overallVertOk && depthVerifyOk && allSectionsPass;

  const failTags: string[] = [];
  if (!overallVertOk) failTags.push(`EXCEED Overall 1:${limitDenom}`);
  if (!depthVerifyOk) failTags.push(`RE-CHECK Depth Diff ${depthDiffM.toFixed(2)}m > ${depthTolM.toFixed(2)}m`);
  if (!allSectionsPass) failTags.push(`EXCEED 10m Section 1:${limitDenom}`);

  const kdPayload: KodenStructuredPayload = {
    kind: 'KD',
    pileDiaMm: parseFloat(pileDiaMm) || 2500,
    depthM: deltaDM,
    dxMm: Number(signedDxMm.toFixed(1)),
    dyMm: Number(signedDyMm.toFixed(1)),
    offsetMm: Number(offsetMm.toFixed(1)),
    ratioDenom,
    vertPct,
    limitDenom,
    isPass,
    scaleFactorSh: shAvg4,
  };

  const copySummary = [
    `[KD Koden Ultrasonic Verticality — HKCI TM3 · STP02 Rev 7]`,
    `Pile Dia D = ${pileDiaMm} mm ｜ Depth Check: Tape ${tapeNum.toFixed(2)} m vs UES ${uesNum.toFixed(2)} m · |Δ| = ${depthDiffM.toFixed(2)} m ≤ ${depthTolM.toFixed(2)} m: ${depthVerifyOk ? 'OK' : 'RE-CHECK'}`,
    `Interval D1 = ${d1Num.toFixed(1)} m to D2 = ${d2Num.toFixed(1)} m · ΔD = ${deltaDM.toFixed(1)} m ｜ Scale SH = ${shAvg4.toFixed(4)} m/mm`,
    `X-Axis = ${absDxMm.toFixed(1)} mm Towards ${dirX} · 1:${vxDenom > 5000 ? '∞' : vxDenom.toFixed(0)} ｜ Y-Axis = ${absDyMm.toFixed(1)} mm Towards ${dirY} · 1:${vyDenom > 5000 ? '∞' : vyDenom.toFixed(0)}`,
    `Resultant Shift LR = ${offsetMm.toFixed(1)} mm ${resultantDir} → Verticality = 1 : ${ratioDenom > 5000 ? '∞' : ratioDenom.toFixed(0)} · Spec ≤ 1:${limitDenom} → ${isPass ? 'PASS' : failTags.join(' / ')}`,
  ].join('\n');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx(
                '📡 Step 1 · Koden 超聲波鑽孔垂直度計算器 · HKCI TM3 · STP02 Rev 7',
                '📡 Step 1 · Koden Ultrasonic Echo Sounder Calculator · HKCI TM3 · STP02 Rev 7'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tx(
                '整合測錘與圖譜深度核查、SH 橫向比例尺換算、D1–D2 區間單軸與合成垂直度及 10m 分段核查。',
                'Includes tape vs UES depth verification, SH scale factor conversion, D1–D2 per-axis & resultant verticality, and 10m sectional check.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSpecDenom('75')}
              className={`rounded-xl px-2.5 py-1.5 font-extrabold cursor-pointer ${specDenom === '75' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {tx('一般樁 ≤ 1:75', 'General Pile ≤ 1:75')}
            </button>
            <button
              type="button"
              onClick={() => setSpecDenom('100')}
              className={`rounded-xl px-2.5 py-1.5 font-extrabold cursor-pointer ${specDenom === '100' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {tx('Mini-pile 或指定樁 ≤ 1:100', 'Mini-pile / Spec ≤ 1:100')}
            </button>
          </div>
        </div>

        {/* Pile Depth Verification + Elevation Interval */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('設計樁徑 D · mm', 'Pile Dia D · mm')}</span>
            <input type="number" value={pileDiaMm} onChange={(e) => setPileDiaMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('測錘深度 D_tape · m', 'Tape Depth · m')}</span>
            <input type="number" step="0.01" value={tapeDepthM} onChange={(e) => setTapeDepthM(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('圖譜深度 D_UES · m', 'UES Depth · m')}</span>
            <input type="number" step="0.01" value={uesDepthM} onChange={(e) => setUesDepthM(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`mt-1 block font-mono text-[10px] font-bold ${depthVerifyOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {depthVerifyOk ? `✓ |Δ| ${depthDiffM.toFixed(2)} ≤ ${depthTolM.toFixed(2)}m` : `⚠️ |Δ| ${depthDiffM.toFixed(2)} > ${depthTolM.toFixed(2)}m`}
            </span>
          </label>
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('起算深度 D1 · m', 'Top Signal D1 · m')}</span>
            <input type="number" step="0.1" value={d1M} onChange={(e) => setD1M(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('樁身底 D2 · m', 'Shaft Base D2 · m')}</span>
            <input type="number" step="0.1" value={d2M} onChange={(e) => setD2M(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className="mt-1 block font-mono text-[10px] font-bold text-brand-deep">ΔD = {deltaDM.toFixed(1)} m</span>
          </label>
        </div>

        {/* Input Mode & SH Scale Helper */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-3.5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1 font-extrabold">
              <button
                type="button"
                onClick={() => setOffsetInputMode('direct')}
                className={`rounded-lg px-2.5 py-1 cursor-pointer ${offsetInputMode === 'direct' ? 'bg-brand text-white' : 'text-slate-600'}`}
              >
                {tx('直接輸入偏移 dx / dy · mm', 'Direct Shift dx / dy · mm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOffsetInputMode('chart');
                  setShowScaleHelper(true);
                }}
                className={`rounded-lg px-2.5 py-1 cursor-pointer ${offsetInputMode === 'chart' ? 'bg-brand text-white' : 'text-slate-600'}`}
              >
                {tx('圖譜卡尺 Δrx / Δry × SH', 'Chart Caliper Δrx / Δry × SH')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowScaleHelper(!showScaleHelper)}
              className="inline-flex items-center gap-1 rounded-xl border border-indigo-300 bg-white px-2.5 py-1 font-extrabold text-indigo-800 cursor-pointer"
            >
              <Calculator className="h-3.5 w-3.5" />
              {tx('SH 橫向比例尺及孔徑換算 L = r × SH', 'SH Scale & Borehole Dia L = r × SH')}
            </button>
          </div>

          {(showScaleHelper || offsetInputMode === 'chart') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl bg-white p-3 border border-indigo-100">
              <label className="block">
                <span className="font-bold text-slate-600">SH,x · m/mm · 4 d.p.</span>
                <input type="number" step="0.0001" value={shX} onChange={(e) => setShX(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold" />
              </label>
              <label className="block">
                <span className="font-bold text-slate-600">SH,y · m/mm · 4 d.p.</span>
                <input type="number" step="0.0001" value={shY} onChange={(e) => setShY(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold" />
              </label>
              <label className="block">
                <span className="font-bold text-slate-600">{tx('圖譜孔徑卡尺 r · mm', 'Chart Dia r · mm')}</span>
                <input type="number" step="0.1" value={caliperDiaMm} onChange={(e) => setCaliperDiaMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold" />
              </label>
              <div className="rounded-lg bg-brand-wash/50 border border-brand/20 px-2.5 py-1.5 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500">{tx('換算實測孔徑 L = r × SH', 'Converted Borehole Dia L')}</span>
                <span className="font-mono text-sm font-black text-brand-deep">{convertedDiaM.toFixed(3)} m</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {offsetInputMode === 'direct' ? (
              <>
                <label className="rounded-xl bg-white p-2.5 border border-slate-200 block">
                  <span className="font-bold text-slate-600">{tx('X 軸偏移 |dx| · mm', 'X Shift |dx| · mm')}</span>
                  <input type="number" min="0" step="1" value={dxMm} onChange={(e) => setDxMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-sm font-bold" />
                </label>
                <label className="rounded-xl bg-white p-2.5 border border-slate-200 block">
                  <span className="font-bold text-slate-600">{tx('Y 軸偏移 |dy| · mm', 'Y Shift |dy| · mm')}</span>
                  <input type="number" min="0" step="1" value={dyMm} onChange={(e) => setDyMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-sm font-bold" />
                </label>
              </>
            ) : (
              <>
                <label className="rounded-xl bg-white p-2.5 border border-slate-200 block">
                  <span className="font-bold text-slate-600">{tx('圖譜 Δrx · mm', 'Chart Δrx · mm')}</span>
                  <input type="number" min="0" step="0.05" value={chartDrxMm} onChange={(e) => setChartDrxMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-sm font-bold" />
                  <span className="font-mono text-[10px] text-brand-deep">Lx = {absDxMm.toFixed(1)} mm</span>
                </label>
                <label className="rounded-xl bg-white p-2.5 border border-slate-200 block">
                  <span className="font-bold text-slate-600">{tx('圖譜 Δry · mm', 'Chart Δry · mm')}</span>
                  <input type="number" min="0" step="0.05" value={chartDryMm} onChange={(e) => setChartDryMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-sm font-bold" />
                  <span className="font-mono text-[10px] text-brand-deep">Ly = {absDyMm.toFixed(1)} mm</span>
                </label>
              </>
            )}

            <label className="rounded-xl bg-white p-2.5 border border-slate-200 block">
              <span className="font-bold text-slate-600">{tx('X 傾斜方向', 'X Direction')}</span>
              <select value={dirX} onChange={(e) => setDirX(e.target.value as 'E' | 'W')} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold">
                <option value="E">Towards E</option>
                <option value="W">Towards W</option>
              </select>
            </label>

            <label className="rounded-xl bg-white p-2.5 border border-slate-200 block">
              <span className="font-bold text-slate-600">{tx('Y 傾斜方向', 'Y Direction')}</span>
              <select value={dirY} onChange={(e) => setDirY(e.target.value as 'N' | 'S')} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold">
                <option value="N">Towards N</option>
                <option value="S">Towards S</option>
              </select>
            </label>

            <label className="col-span-2 sm:col-span-1 rounded-xl bg-white p-2.5 border border-slate-200 block">
              <span className="font-bold text-slate-600">{tx('驗收限值 1:N', 'Spec Limit 1:N')}</span>
              <select value={specDenom} onChange={(e) => setSpecDenom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono font-bold">
                <option value="75">1 : 75</option>
                <option value="100">1 : 100</option>
                <option value="120">1 : 120</option>
                <option value="150">1 : 150</option>
              </select>
            </label>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl p-4 border ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="text-xs font-bold text-slate-600">{tx('合成垂直度 VR', 'Resultant Verticality VR')}</div>
            <div className={`mt-1 font-mono text-2xl font-extrabold ${isPass ? 'text-emerald-700' : 'text-rose-700'}`}>
              1 : {ratioDenom > 5000 ? '∞' : ratioDenom.toFixed(0)}
            </div>
            <div className="text-[11px] font-bold">
              {isPass ? `✓ PASS · ≤ 1:${limitDenom}` : `⚠️ ${failTags.join(' · ')}`}
            </div>
          </div>
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-4">
            <div className="text-xs font-bold text-slate-600">{tx('合成偏移量 LR 及方位', 'Resultant Shift LR & Bearing')}</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{offsetMm.toFixed(1)} mm</div>
            <div className="text-[11px] font-semibold text-slate-600">{resultantDir} · {vertPct.toFixed(3)}%</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold text-slate-600">{tx('單軸垂直度 Vx / Vy', 'Per-Axis Verticality Vx / Vy')}</div>
            <div className="mt-1 font-mono text-base font-extrabold text-slate-900">
              Vx 1:{vxDenom > 5000 ? '∞' : vxDenom.toFixed(0)} · Vy 1:{vyDenom > 5000 ? '∞' : vyDenom.toFixed(0)}
            </div>
            <div className="text-[11px] text-slate-500">
              X: {absDxMm.toFixed(0)}mm {dirX} ｜ Y: {absDyMm.toFixed(0)}mm {dirY}
            </div>
          </div>
        </div>

        {/* Optional 10 m Sectional Check */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 font-extrabold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={sectionalEnabled}
                onChange={(e) => setSectionalEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand"
              />
              <span>{tx('啟用 FST02 每 10 m 分段垂直度核查', 'Enable FST02 10 m Sectional Verticality Check')}</span>
            </label>
            {sectionalEnabled && (
              <button
                type="button"
                onClick={() => {
                  const last = sections[sections.length - 1];
                  const f = parseFloat(last?.toM || '42.5') || 42.5;
                  setSections([...sections, { label: `Sec ${sections.length + 1}`, fromM: f.toFixed(1), toM: (f + 10).toFixed(1), dxMm: '25', dyMm: '18' }]);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> {tx('新增 10m 段', 'Add Section')}
              </button>
            )}
          </div>

          {sectionalEnabled && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans font-extrabold">
                  <tr>
                    <th className="px-2.5 py-2">{tx('分段', 'Section')}</th>
                    <th className="px-2 py-2">From · m</th>
                    <th className="px-2 py-2">To · m</th>
                    <th className="px-2 py-2">|Δx| · mm</th>
                    <th className="px-2 py-2">|Δy| · mm</th>
                    <th className="px-2 py-2">LR · mm</th>
                    <th className="px-2.5 py-2">1 : V_sec</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {computedSections.map((s, idx) => (
                    <tr key={idx} className={s.secOk ? '' : 'bg-rose-50/60'}>
                      <td className="px-2.5 py-1.5 font-sans font-bold text-slate-800">{s.label}</td>
                      <td className="px-2 py-1.5"><input type="number" step="0.5" value={s.fromM} onChange={(e) => setSections((p) => p.map((r, i) => (i === idx ? { ...r, fromM: e.target.value } : r)))} className="w-16 rounded border border-slate-200 px-1.5 py-0.5" /></td>
                      <td className="px-2 py-1.5"><input type="number" step="0.5" value={s.toM} onChange={(e) => setSections((p) => p.map((r, i) => (i === idx ? { ...r, toM: e.target.value } : r)))} className="w-16 rounded border border-slate-200 px-1.5 py-0.5" /></td>
                      <td className="px-2 py-1.5"><input type="number" step="1" value={s.dxMm} onChange={(e) => setSections((p) => p.map((r, i) => (i === idx ? { ...r, dxMm: e.target.value } : r)))} className="w-16 rounded border border-slate-200 px-1.5 py-0.5" /></td>
                      <td className="px-2 py-1.5"><input type="number" step="1" value={s.dyMm} onChange={(e) => setSections((p) => p.map((r, i) => (i === idx ? { ...r, dyMm: e.target.value } : r)))} className="w-16 rounded border border-slate-200 px-1.5 py-0.5" /></td>
                      <td className="px-2 py-1.5 font-bold text-brand-deep">{s.sLrMm.toFixed(1)}</td>
                      <td className={`px-2.5 py-1.5 font-extrabold ${s.secOk ? 'text-emerald-700' : 'text-rose-700'}`}>
                        1 : {s.secDenom > 5000 ? '∞' : s.secDenom.toFixed(0)} {s.secOk ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="KD"
          standardRef="HKCI TM3 Issue 2 · STP02-FDT-TM3 rev 7 · FST02"
          formulaText="T = |D_tape − D_UES| ≤ min(0.3 m, 1% D_tape) ｜ L = r × ROUND(SH, 4) ｜ LR = √(Lx² + Ly²) ｜ VR = 1 : (ΔD / ROUND(LR, 4)) ｜ U95 = ± 1 mm"
          copyText={copySummary}
          structuredData={kdPayload}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            {
              title: tx('量度 NS / WE 護筒內徑及泥漿溫度深度', 'Measure NS / WE Casing ID & Fluid Temp / Depth'),
              detail: tx(
                '按 STP02 Rev 7 Cl. 6.6–6.8，以經校準捲尺沿 NS 及 WE 兩正交方向量度鋼護筒內徑，以測錘捲尺實測孔深 D_tape 並記錄孔內液體溫度，工作環境須為 -10°C 至 50°C。',
                'Per STP02 Rev 7 Cl. 6.6–6.8, measure steel casing ID along perpendicular NS & WE axes, plumb actual depth D_tape with weighted tape, and record borehole fluid temperature.'
              ),
            },
            {
              title: tx('設定走紙比例及控制絞車速度 5–11 m/min', 'Set Chart Feed Rate & Winch Speed 5–11 m/min'),
              detail: tx(
                '按 Cl. 6.17 設定圖譜走紙比例 — 孔深 < 15 m 用 1:50、15–40 m 用 1:100、> 40 m 用 1:200；按 Cl. 6.18 控制探頭升降絞車速率於 5 至 11 m/min，並核對 |D_tape − D_UES| ≤ min(0.3 m, 1%)。',
                'Select chart feed rate 1:50 (<15 m), 1:100 (15–40 m), or 1:200 (>40 m) per Cl. 6.17; maintain probe winch speed at 5–11 m/min per Cl. 6.18 and verify |D_tape − D_UES| ≤ min(0.3 m, 1%).'
              ),
            },
            {
              title: tx('計算 SH 橫向比例尺及合成垂直度 VR', 'Compute SH Scale Factor & Resultant Verticality VR'),
              detail: tx(
                '取 3 組已知內徑與圖譜卡尺讀數計算 SH 並四捨五入至 4 位小數；計算整體 D1–D2 及每 10 m 分段之單軸 Vx、Vy 與合成垂直度 VR，擴展不確定度 U95 = ± 1 mm。',
                'Average 3 rounded 4-d.p. scale ratios SH = L/r, then compute overall D1–D2 and 10 m sectional verticality Vx, Vy, and VR with expanded uncertainty U95 = ± 1 mm.'
              ),
            },
          ]}
          pitfalls={[
            tx(
              '膨潤土泥漿過濃或懸浮砂粒過多會嚴重衰減超聲波反射訊號，按 STP02 Cl. 4.3 測試前須確保泥漿潔淨穩定。',
              'Thick or sandy bentonite slurry strongly attenuates ultrasonic echoes per STP02 Cl. 4.3; ensure clean stabilized fluid before profiling.'
            ),
            tx(
              'BD CoP Foundations Table 7.4 規定大型鑽孔樁及壁樁垂直度 ≤ 1:75，Mini-pile 則須符合更嚴格之 ≤ 1:100 及樁頂平面偏差 ± 15 mm。',
              'BD CoP Table 7.4 requires ≤ 1:75 for bored piles/barrettes, whereas mini-piles require ≤ 1:100 verticality and ± 15 mm plan tolerance.'
            ),
          ]}
        />
      </div>
    </div>
  );
};

interface FcDeptPreset {
  id: string;
  labelZh: string;
  labelEn: string;
  min: number;
  max: number;
}

const FC_DEPT_PRESETS: FcDeptPreset[] = [
  { id: 'piling', labelZh: '一般樁基 11–30 s', labelEn: 'General Piling 11–30 s', min: 11, max: 30 },
  { id: 'cedd_nail', labelZh: 'CEDD 泥釘 15–30 s', labelEn: 'CEDD Soil Nail 15–30 s', min: 15, max: 30 },
  { id: 'bd', labelZh: 'BD 10–30 s', labelEn: 'BD 10–30 s', min: 10, max: 30 },
  { id: 'hkha', labelZh: 'HKHA 12–30 s', labelEn: 'HKHA 12–30 s', min: 12, max: 30 },
];

export const FlowConeCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [deptPresetId, setDeptPresetId] = useState<string>('piling');
  const [waterSec, setWaterSec] = useState('8.0');
  const [t1Sec, setT1Sec] = useState('16.4');
  const [t2Sec, setT2Sec] = useState('16.8');
  const [groutTemp, setGroutTemp] = useState('23.0');
  const [cementBrand, setCementBrand] = useState('Green Island OPC · BS EN 197-1 CEM I 52.5N');
  const [cementQty, setCementQty] = useState('50 kg · 1 Bag');
  const [admixtureBrand, setAdmixtureBrand] = useState('Sika Grout Aid / Cebex 100');
  const [admixtureQty, setAdmixtureQty] = useState('0.225 kg');
  const [waterSource, setWaterSource] = useState('Mains Potable Water · WSD');
  const [waterQty, setWaterQty] = useState('21.0 L');
  const [wcRatio, setWcRatio] = useState('0.42');
  const [ambientTempText, setAmbientTempText] = useState('23.0 °C');
  const [waterTempText, setWaterTempText] = useState('23.0 °C');
  const [testDateIso, setTestDateIso] = useState(() => getHkTodayIso());
  const [batchNo, setBatchNo] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [timeWaterAdded, setTimeWaterAdded] = useState('09:45');
  const [timeDrawingGrout, setTimeDrawingGrout] = useState('09:52');

  const activePreset = FC_DEPT_PRESETS.find((p) => p.id === deptPresetId) || FC_DEPT_PRESETS[0];

  const wNum = parseFloat(waterSec) || 0;
  const waterOk = wNum >= 7.8 && wNum <= 8.2;
  const n1 = parseFloat(t1Sec) || 0;
  const n2 = parseFloat(t2Sec) || 0;
  const rawAvg = (n1 + n2) / 2;
  const avgRounded02 = roundToNearestStep(rawAvg, 0.2);
  const avgFormatted02 = formatNearest02(rawAvg);
  const diffSec = Math.abs(n1 - n2);
  const diffToAvgSec = diffSec / 2;
  const repeatOk = n1 > 0 && n2 > 0 && diffSec <= 1.8 + 1e-9;

  const tempNum = parseFloat(groutTemp);
  const tempOk = Number.isFinite(tempNum) && tempNum >= 21.0 && tempNum <= 25.0;
  const ceilingOk = n1 > 0 && n2 > 0 && rawAvg <= 35.0 && n1 <= 35.0 && n2 <= 35.0;
  const specOk = avgRounded02 >= activePreset.min && avgRounded02 <= activePreset.max;
  const allPass = waterOk && repeatOk && tempOk && ceilingOk && specOk;

  const failReasons: string[] = [];
  if (!waterOk) failReasons.push('RE-CHECK Nozzle Water Cal');
  if (!repeatOk) failReasons.push('RE-TEST Repeatability > 1.8s');
  if (!tempOk) failReasons.push('RE-TEST Specimen Temp outside 23±2°C');
  if (!ceilingOk) failReasons.push('EXCEED ASTM C939 35s Ceiling');
  if (!specOk) failReasons.push(`EXCEED Dept Range ${activePreset.min}–${activePreset.max}s`);

  const copySummary = [
    `[FC Flow Cone Efflux Time — ASTM C939 · STP05 Rev 2]`,
    `Water Check 1725 mL = ${wNum.toFixed(1)} s (${waterOk ? 'OK 8.0±0.2s' : 'RE-CHECK'}) ｜ Specimen Grout Temp = ${groutTemp} °C (${tempOk ? 'OK 23±2°C' : 'RE-TEST'})`,
    `Efflux T1 = ${n1.toFixed(1)} s, T2 = ${n2.toFixed(1)} s → Average Efflux Time = ${avgFormatted02} s · Nearest 0.2 s`,
    `Repeatability |T1−T2| = ${diffSec.toFixed(1)} s · |Ti−Avg| = ${diffToAvgSec.toFixed(2)} s (${repeatOk ? 'OK ≤1.8s' : 'RE-TEST'}) ｜ Spec ${activePreset.min}–${activePreset.max} s · Ceiling ≤35 s → ${allPass ? 'PASS' : failReasons.join(' / ')}`,
  ].join('\n');

  const fcPayload: FlowConeStructuredPayload = {
    kind: 'FC',
    waterCheckSec: wNum,
    waterOk,
    groutTempC: Number.isFinite(tempNum) ? tempNum : 23.0,
    t1Sec: n1,
    t2Sec: n2,
    meanSec: avgRounded02,
    diffSec,
    repeatOk,
    specRangeText: `${activePreset.min}–${activePreset.max} s`,
    cementBrand,
    cementQty,
    admixtureBrand,
    admixtureQty,
    waterSource,
    waterQty,
    wcRatio,
    ambientTempText,
    waterTempText,
    testDateIso,
    batchNo,
    sampleId,
    timeWaterAdded,
    timeDrawingGrout,
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-200/80 pb-3.5 space-y-2.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx(
                '⏱️ Step 1 · 水泥漿流錐流動度測試 · ASTM C939 · STP05 Rev 2',
                '⏱️ Step 1 · Flow Cone Efflux Test · ASTM C939 · STP05 Rev 2'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tx(
                '1725 mL 清水校準 8.0 ± 0.2 s、試樣漿溫 23.0 ± 2.0°C、ASTM C939 ≤ 35 s 適用上限及平均流出時間進位至 0.2 s。',
                '1725 mL water check 8.0 ± 0.2 s, specimen temp 23.0 ± 2.0°C, ASTM C939 ≤ 35 s ceiling, and mean efflux rounded to nearest 0.2 s.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-extrabold text-slate-700">{tx('部門驗收範圍：', 'Dept Spec Range:')}</span>
            {FC_DEPT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDeptPresetId(p.id)}
                className={`rounded-xl px-2.5 py-1 font-extrabold transition cursor-pointer ${
                  deptPresetId === p.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tx(p.labelZh, p.labelEn)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('清水校準 · s', 'Water Check · s')}</span>
            <input type="number" step="0.1" value={waterSec} onChange={(e) => setWaterSec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`mt-1 block text-[10px] font-bold ${waterOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {waterOk ? '✓ OK · 7.8–8.2 s' : tx('⚠️ 超出 7.8–8.2 s 須檢查流嘴', '⚠️ Out of 7.8–8.2 s')}
            </span>
          </label>
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('第 1 次流出 T1 · s', 'Grout Run 1 T1 · s')}</span>
            <input type="number" step="0.1" value={t1Sec} onChange={(e) => setT1Sec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className="mt-1 block text-[10px] text-slate-500">ASTM C939 ≤ 35.0 s</span>
          </label>
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('第 2 次流出 T2 · s', 'Grout Run 2 T2 · s')}</span>
            <input type="number" step="0.1" value={t2Sec} onChange={(e) => setT2Sec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className="mt-1 block text-[10px] text-slate-500">|T1 − T2| ≤ 1.8 s</span>
          </label>
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('試樣漿溫 · °C', 'Specimen Temp · °C')}</span>
            <input type="number" step="0.1" value={groutTemp} onChange={(e) => setGroutTemp(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`mt-1 block text-[10px] font-bold ${tempOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {tempOk ? '✓ Cl. 5.7 · 21.0–25.0°C' : tx('⚠️ 須為 23.0 ± 2.0°C', '⚠️ Must be 21.0–25.0°C')}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl border p-4 ${allPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600">{tx('平均流出時間 · 進位至 0.2 s', 'Mean Efflux · Nearest 0.2 s')}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white ${allPass ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {allPass ? 'PASS' : 'RE-TEST'}
              </span>
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{avgFormatted02} s</div>
            <div className="text-[11px] font-semibold text-slate-600">
              {ceilingOk
                ? `${tx('標準範圍', 'Spec')} ${activePreset.min}–${activePreset.max} s · Raw ${rawAvg.toFixed(2)} s`
                : tx('🚨 超出 ASTM C939 35.0 s 方法上限', '🚨 Exceeds ASTM C939 35.0 s ceiling')}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${repeatOk ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="text-xs font-bold text-slate-600">{tx('重複性核查 Cl. 5.6 / FST05', 'Repeatability Check')}</div>
            <div className={`mt-1 font-mono text-2xl font-extrabold ${repeatOk ? 'text-emerald-700' : 'text-rose-700'}`}>
              |T1 − T2| = {diffSec.toFixed(1)} s
            </div>
            <div className="text-[11px] font-mono font-semibold text-slate-600">
              FST05 |Ti − Avg| = {diffToAvgSec.toFixed(2)} s · {repeatOk ? '≤ 1.8 s OK' : 'RE-TEST'}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${waterOk && tempOk ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="text-xs font-bold text-slate-600">{tx('流嘴校準及漿溫狀態', 'Nozzle Cal & Temp Status')}</div>
            <div className="mt-1 font-mono text-lg font-extrabold text-slate-900">
              {waterOk ? '✓ Nozzle 8.0±0.2s' : '✗ Check Nozzle'}
            </div>
            <div className={`text-[11px] font-bold ${tempOk ? 'text-emerald-700' : 'text-rose-700'}`}>
              {tx(`試樣漿溫 ${groutTemp}°C`, `Specimen ${groutTemp}°C`)} · {tempOk ? '✓ 23±2°C' : '✗ Out of 21–25°C'}
            </div>
          </div>
        </div>

        {/* Editable Sample Information (FST05-GTT-C939) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5 text-xs">
          <div className="font-extrabold text-slate-900">
            {tx('🧪 FST05 工作紙樣本資料 · 匯出前可修改', '🧪 FST05 Sample Information · Editable before Export')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label className="font-bold text-slate-600">Brand of Cement</label><input value={cementBrand} onChange={(e) => setCementBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold" /></div>
            <div><label className="font-bold text-slate-600">Cement Quantity</label><input value={cementQty} onChange={(e) => setCementQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Brand of Admixture</label><input value={admixtureBrand} onChange={(e) => setAdmixtureBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold" /></div>
            <div><label className="font-bold text-slate-600">Admixture Quantity</label><input value={admixtureQty} onChange={(e) => setAdmixtureQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Water</label><input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold" /></div>
            <div><label className="font-bold text-slate-600">Water Quantity</label><input value={waterQty} onChange={(e) => setWaterQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><label className="font-bold text-slate-600">W/C Ratio</label><input value={wcRatio} onChange={(e) => setWcRatio(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold" /></div>
            <div><label className="font-bold text-slate-600">Ambient Temp</label><input value={ambientTempText} onChange={(e) => setAmbientTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Water Temp</label><input value={waterTempText} onChange={(e) => setWaterTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Date of Testing</label><input type="date" value={testDateIso} onChange={(e) => setTestDateIso(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-amber-900">Batch No. · 手動輸入</label><input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. B-01" className="mt-0.5 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono font-bold" /></div>
            <div><label className="font-bold text-amber-900">Sample ID No. · 手動輸入</label><input value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="e.g. FC-01" className="mt-0.5 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono font-bold" /></div>
            <div><label className="font-bold text-slate-600">Time Water Added</label><input value={timeWaterAdded} onChange={(e) => setTimeWaterAdded(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Time Drawing Grout</label><input value={timeDrawingGrout} onChange={(e) => setTimeDrawingGrout(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="FC"
          standardRef="ASTM C939/C939M-22 · STP05-GTT-C939 rev 2 · FST05"
          formulaText="Water Cal = 8.0 ± 0.2 s · 1725 mL ｜ Specimen Temp = 23.0 ± 2.0°C ｜ Mean = ROUND((T1 + T2)/2, 0.2 s) ≤ 35 s ｜ |T1 − T2| ≤ 1.8 s"
          copyText={copySummary}
          structuredData={fcPayload}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            {
              title: tx('每日最少兩次 1725 mL 清水校準', 'Water Calibration Check Twice Daily'),
              detail: tx('調平流錐並封閉底口，注入 1725 ± 5 mL 清水後開啟底塞同步計時至首次斷流，標準須為 8.0 ± 0.2 s，工地每日最少核查兩次。', 'Level the cone, fill 1725 ± 5 mL water, and time to first break in continuous flow — must be 8.0 ± 0.2 s, checked prior to use and at least twice daily on site.'),
            },
            {
              title: tx('核對漿溫 23.0 ± 2.0°C 及預濕內壁', 'Verify 23.0 ± 2.0°C Grout Temp & Pre-wet Cone'),
              detail: tx('測試前 1 分鐘潤濕流錐內壁並排清積水；量度新拌水泥漿溫度須為 23.0 ± 2.0°C，經篩網注入流錐直至接觸針尖。', 'Moisten inside surface 1 min prior and drain; verify freshly mixed grout temperature is 23.0 ± 2.0°C and pour until touching the point gauge.'),
            },
            {
              title: tx('取樣 1 分鐘內開塞並按 0.2 s 進位報告', 'Release Within 1 Min & Report to Nearest 0.2 s'),
              detail: tx('由拌漿機取樣後 1 分鐘內開塞計時至首次斷流透光；連續兩次測試 |T1 − T2| ≤ 1.8 s，平均值按 STP05 Cl. 7.5 進位至最接近 0.2 秒，且本法僅適用於 ≤ 35 s 之水泥漿。', 'Open stopper within 1 min of drawing grout; stop at first break, verify |T1 − T2| ≤ 1.8 s, and report average to nearest 0.2 s per STP05 Cl. 7.5 (applicable only to efflux ≤ 35 s).'),
            },
          ]}
          pitfalls={[
            tx('CEDD GS Sec. 7 泥釘灌漿要求流出時間 ≥ 15 s，一般介乎 15–30 s；11–14.9 s 之稀漿雖符合一般樁基卻不符合泥釘規格。', 'CEDD GS Sec. 7 soil-nail grout requires efflux ≥ 15 s (typically 15–30 s); 11–14.9 s grout fails soil-nail criteria.'),
            tx('進行第二次測試 T2 前必須徹底沖洗流錐殘漿並排清積水；若清水校準或重複性不合規，系統會自動標記 RE-TEST 防止誤發合格報告。', 'Wash and drain the cone completely before T2; failed water check or repeatability automatically flags RE-TEST.'),
          ]}
        />
      </div>
    </div>
  );
};

const SAMPLE_BATCH_IS50 = '3.42, 3.18, 4.15, 2.85, 3.60, 3.51, 1.92, 3.33, 4.68, 3.29';

export const PointLoadCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [mode, setMode] = useState<'diametral' | 'axial'>('diametral');
  const [dMm, setDMm] = useState('52.0');
  const [dPrimeMm, setDPrimeMm] = useState('');
  const [wMm, setWMm] = useState('52.0');
  const [freeEndLMm, setFreeEndLMm] = useState('35.0');
  const [loadKn, setLoadKn] = useState('11.8');
  const [failSec, setFailSec] = useState('24');
  const [batchText, setBatchText] = useState(SAMPLE_BATCH_IS50);

  const switchMode = (next: 'diametral' | 'axial') => {
    setMode(next);
    if (next === 'axial' && Math.abs((parseFloat(dMm) || 52) - (parseFloat(wMm) || 52)) < 0.01) {
      setDMm('36.0');
      setWMm('52.0');
    } else if (next === 'diametral' && (parseFloat(dMm) || 36) < 40) {
      setDMm('52.0');
    }
  };

  const d = Math.max(1, parseFloat(dMm) || 50);
  const parsedDPrime = parseFloat(dPrimeMm);
  const hasDPrime = dPrimeMm.trim() !== '' && Number.isFinite(parsedDPrime) && parsedDPrime > 0;
  const dEff = hasDPrime ? parsedDPrime : d;
  const dPrimeValid = !hasDPrime || parsedDPrime <= d + 1e-6;

  const w = Math.max(1, parseFloat(wMm) || 50);
  const freeL = Math.max(0, parseFloat(freeEndLMm) || 0);
  const ratioDW = d / w;

  const geomOk =
    dPrimeValid &&
    (mode === 'diametral' ? freeL >= 0.5 * d - 1e-6 : ratioDW >= 0.33 - 1e-6 && ratioDW <= 1.0 + 1e-6);

  const pN = Math.max(0, (parseFloat(loadKn) || 0) * 1000);
  const de2 = mode === 'diametral' ? d * dEff : (4 * w * dEff) / Math.PI;
  const de = Math.sqrt(Math.max(1e-6, de2));
  const isUncorrRaw = pN / Math.max(1e-6, de2);
  const fFactor = Math.pow(de / 50, 0.45);
  const is50Raw = isUncorrRaw * fFactor;

  const isUncorr3Sig = Number(isUncorrRaw.toPrecision(3));
  const is50_3Sig = Number(is50Raw.toPrecision(3));
  const estUcs = is50Raw * 22;

  const secNum = parseFloat(failSec) || 0;
  const timeOk = secNum >= 10 && secNum <= 60;
  const specimenValid = timeOk && geomOk && pN > 0;

  const parsedBatchValues = useMemo(() => {
    return batchText
      .split(/[\s,;]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [batchText]);

  const trimmedBatch = useMemo(
    () => computePointLoadTrimmedMean(parsedBatchValues),
    [parsedBatchValues]
  );

  const batchMean2Sig = trimmedBatch.mean > 0 ? Number(trimmedBatch.mean.toPrecision(2)) : 0;

  const classifyBdRock = (valMpa: number) => {
    if (valMpa >= 3.0) return 'BD Cat 1(a) · Grade I · qa 10,000 kPa';
    if (valMpa >= 2.0) return 'BD Cat 1(b) · Grade II · qa 7,500 kPa';
    if (valMpa >= 1.0) return 'BD Cat 1(c) · Grade III · qa 5,000 kPa';
    return tx('低於 Cat 1(c) 1.0 MPa 門檻', 'Below Cat 1(c) 1.0 MPa');
  };

  const appendCurrentToBatch = () => {
    const valStr = formatSigFigs(is50Raw, 3);
    setBatchText((prev) => (prev.trim() ? `${prev.trim()}, ${valStr}` : valStr));
  };

  const invalidReasons: string[] = [];
  if (!timeOk) invalidReasons.push(`Fail Time ${failSec}s outside 10–60s`);
  if (!geomOk) {
    invalidReasons.push(
      !dPrimeValid
        ? `D' > D`
        : mode === 'diametral'
        ? `Free-end L ${freeL}mm < 0.5D`
        : `Axial D/W ${ratioDW.toFixed(2)} outside 0.33–1.0`
    );
  }

  const copySummary = [
    `[PO Point Load Strength Index — ASTM D5731 · STP06 Rev 2 · Core Only]`,
    `Mode = ${mode === 'diametral' ? 'Diametral Core' : 'Axial Core Only'} ｜ D = ${d} mm${hasDPrime ? `, D' = ${dEff} mm` : ''}${mode === 'axial' ? `, W = ${w} mm · D/W = ${ratioDW.toFixed(2)}` : `, Free-end L = ${freeL} mm`}`,
    `De = ${de.toFixed(2)} mm ｜ Load P = ${loadKn} kN · Time = ${failSec} s (${timeOk ? 'OK 10–60s' : 'INVALID'})`,
    `Is = ${formatSigFigs(isUncorrRaw, 3)} MPa ｜ F = ${fFactor.toFixed(3)} → Is(50) = ${formatSigFigs(is50Raw, 3)} MPa · 3 sig. figs${parsedBatchValues.length > 0 ? ` ｜ Batch Mean n=${parsedBatchValues.length}: ${formatSigFigs(trimmedBatch.mean, 2)} MPa` : ''}`,
    `Status: ${specimenValid ? `PASS · ${classifyBdRock(is50_3Sig)}` : `INVALID / RE-TEST — ${invalidReasons.join('; ')}`}`,
  ].join('\n');

  const poPayload: PointLoadStructuredPayload = {
    kind: 'PO',
    mode,
    dMm: d,
    wMm: w,
    dPrimeMm: hasDPrime ? dEff : undefined,
    loadKn: parseFloat(loadKn) || 0,
    failSec: secNum,
    deMm: Number(de.toFixed(2)),
    isUncorrMpa: isUncorr3Sig,
    fFactor: Number(fFactor.toFixed(4)),
    is50Mpa: is50_3Sig,
    estUcsMpa: Number(estUcs.toFixed(1)),
    timeOk: specimenValid,
    batchTrimmedMeanMpa: batchMean2Sig > 0 ? batchMean2Sig : undefined,
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx(
                '🪨 Step 1 · 點荷載強度指數測試 · ASTM D5731 · STP06 Rev 2',
                '🪨 Step 1 · Point Load Strength Index Test · ASTM D5731 · STP06 Rev 2'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tx(
                '支援壓頭貫入深度 D\'、幾何長徑比核查、3 位有效數字修約及 ≥10 組試件批次截尾平均數計算。',
                'Supports platen penetration D\', geometry checks, 3-sig-fig rounding, and ≥10 specimen trimmed mean.'
              )}
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 border border-slate-200 p-1 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => switchMode('diametral')}
              className={`rounded-lg px-3 py-1.5 cursor-pointer ${mode === 'diametral' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {tx('徑向測試 Diametral', 'Diametral')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('axial')}
              className={`rounded-lg px-3 py-1.5 cursor-pointer ${mode === 'axial' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {tx('軸向測試 Axial · 僅限岩芯', 'Axial · Core Only')}
            </button>
          </div>
        </div>

        {/* Mandatory HOKLAS 298 Scope Restriction Banner */}
        <div className="rounded-2xl border border-amber-300/90 bg-amber-50/75 px-3.5 py-2.5 flex items-start gap-2 text-xs text-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="font-semibold leading-snug">
            {tx(
              'HOKLAS 298 認可範圍及 STP06 Rev 2 Cl. 2.1 規定：本實驗室嚴禁進行不規則岩塊或方塊測試，僅認可規則岩芯之徑向測試及軸向測試。',
              'HOKLAS 298 & STP06 Rev 2 Cl. 2.1 Scope Restriction: Irregular lump tests are strictly prohibited; only rock core Diametral and Axial tests are accredited.'
            )}
          </div>
        </div>

        {/* Specimen Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('初始壓頭距 D · mm', 'Platen Dist D · mm')}</span>
            <input type="number" step="0.1" value={dMm} onChange={(e) => setDMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>

          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('破壞貫入距 D\' · mm', 'Failure Dist D\' · mm')}</span>
            <input
              type="number"
              step="0.1"
              value={dPrimeMm}
              onChange={(e) => setDPrimeMm(e.target.value)}
              placeholder={tx('選填 · 預設=D', 'Opt · =D')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold"
            />
            <span className={`mt-1 block text-[10px] font-bold ${dPrimeValid ? 'text-slate-500' : 'text-rose-600'}`}>
              {hasDPrime ? (dPrimeValid ? `De² uses D×D'` : `⚠️ D' 不可大於 D`) : tx('無貫入時留空', 'Blank if no penetration')}
            </span>
          </label>

          {mode === 'diametral' ? (
            <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
              <span className="font-bold text-slate-600">{tx('壓頭至端面距 L · mm', 'Free-End L · mm')}</span>
              <input type="number" step="0.5" value={freeEndLMm} onChange={(e) => setFreeEndLMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
              <span className={`mt-1 block text-[10px] font-bold ${geomOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                {geomOk ? `✓ L ≥ 0.5D · ${(0.5 * d).toFixed(1)}mm` : `⚠️ 須 L ≥ ${(0.5 * d).toFixed(1)}mm`}
              </span>
            </label>
          ) : (
            <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
              <span className="font-bold text-slate-600">{tx('岩芯直徑 W · mm', 'Core Width W · mm')}</span>
              <input type="number" step="0.1" value={wMm} onChange={(e) => setWMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
              <span className={`mt-1 block text-[10px] font-bold ${geomOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                {geomOk ? `✓ D/W = ${ratioDW.toFixed(2)} · 0.33–1.0` : `⚠️ D/W ${ratioDW.toFixed(2)} 超出 0.33–1.0`}
              </span>
            </label>
          )}

          <label className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('破壞荷載 P · kN', 'Failure Load P · kN')}</span>
            <input type="number" step="0.05" value={loadKn} onChange={(e) => setLoadKn(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className="mt-1 block font-mono text-[10px] text-slate-500">{pN.toFixed(0)} N</span>
          </label>

          <label className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-50 p-3 border border-slate-200/70 block">
            <span className="font-bold text-slate-600">{tx('加載秒數 · s', 'Fail Time · s')}</span>
            <input type="number" value={failSec} onChange={(e) => setFailSec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`mt-1 block text-[10px] font-bold ${timeOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {timeOk ? '✓ 10–60 s 有效' : tx('⚠️ 超出 10–60s 作廢重測', '⚠️ Invalid outside 10–60s')}
            </span>
          </label>
        </div>

        {/* Single-Specimen KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl border p-4 ${specimenValid ? 'border-brand/25 bg-brand-wash/40' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-600">{tx('單試件 Is(50) · 3 位有效數字', 'Specimen Is(50) · 3 sig. figs')}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${specimenValid ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {specimenValid ? 'VALID' : 'INVALID'}
              </span>
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">
              {formatSigFigs(is50Raw, 3)} MPa
            </div>
            <div className="text-[11px] font-bold text-violet-800">
              {specimenValid ? classifyBdRock(is50_3Sig) : invalidReasons.join(' · ')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold text-slate-600">{tx('等效直徑 De 及未修正 Is', 'Equivalent Dia De & Uncorr. Is')}</div>
            <div className="mt-1 font-mono text-xl font-extrabold text-slate-900">De = {de.toFixed(2)} mm</div>
            <div className="text-[11px] font-mono text-slate-600">
              F = {fFactor.toFixed(3)} · Is = {formatSigFigs(isUncorrRaw, 3)} MPa
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="text-xs font-bold text-slate-600">{tx('推算單軸抗壓強度 UCS', 'Estimated UCS · Ref Only')}</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-800">≈ {estUcs.toFixed(0)} MPa</div>
            <div className="text-[10px] text-slate-600">
              {tx('按 C≈22 估算 · STP06 Table 1 隨尺寸介乎 20–24 · 僅適用於 UCS > 15 MPa', 'C≈22 typical · STP06 Table 1 C=20–24 · Valid for UCS > 15 MPa')}
            </div>
          </div>
        </div>

        {/* Multi-Specimen Batch Trimmed Mean Row (STP06 Cl. 6.4.2) */}
        <div className="rounded-2xl border border-violet-200/90 bg-violet-50/45 p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-extrabold text-violet-950">
                {tx(
                  '📊 多試件批次 Trimmed Mean 計算列 · STP06 Cl. 4.1.10 & 6.4.2',
                  '📊 Multi-Specimen Batch Trimmed Mean · STP06 Cl. 4.1.10 & 6.4.2'
                )}
              </div>
              <div className="text-[11px] text-slate-600">
                {tx(
                  '當組數 n ≥ 10 時自動剔除最高 2 組及最低 2 組 Is(50)，平均值按 2 位有效數字報告並對應 BD Table 2.1。',
                  'Automatically drops 2 highest & 2 lowest Is(50) when n ≥ 10; reports mean to 2 sig. figs with BD Table 2.1 grade.'
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={appendCurrentToBatch}
                className="inline-flex items-center gap-1 rounded-xl bg-violet-700 px-2.5 py-1.5 font-extrabold text-white hover:bg-violet-800 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> {tx(`加入當前 ${formatSigFigs(is50Raw, 3)}`, `Add ${formatSigFigs(is50Raw, 3)}`)}
              </button>
              <button
                type="button"
                onClick={() => setBatchText(SAMPLE_BATCH_IS50)}
                className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-white px-2.5 py-1.5 font-bold text-violet-900 hover:bg-violet-50 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> {tx('10 組範例', '10-Spec Sample')}
              </button>
            </div>
          </div>

          <input
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={tx('輸入或貼上多組試件 Is(50) 數值，以逗號或空格分隔...', 'Paste specimen Is(50) values separated by commas or spaces...')}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900"
          />

          {parsedBatchValues.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-violet-200 bg-white p-3">
                <span className="text-[11px] font-bold text-slate-500">{tx('批次平均 Mean Is(50) · 2 sig. figs', 'Batch Mean Is(50) · 2 sig. figs')}</span>
                <div className="mt-0.5 font-mono text-xl font-black text-violet-950">
                  {formatSigFigs(trimmedBatch.mean, 2)} MPa
                </div>
                <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5">
                  {classifyBdRock(batchMean2Sig)}
                </div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-white p-3 sm:col-span-2 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-extrabold text-slate-800">
                    {tx(`輸入共 n = ${parsedBatchValues.length} 組`, `Total n = ${parsedBatchValues.length} specimens`)}
                    {parsedBatchValues.length < 10 && tx(' · 少於 STP06 建議 ≥10 組', ' · < 10 recommended by STP06')}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${trimmedBatch.trimmed ? 'bg-violet-100 text-violet-900' : 'bg-slate-100 text-slate-600'}`}>
                    {trimmedBatch.trimmed
                      ? tx(`已截尾保留 ${trimmedBatch.usedValues.length} 組`, `Trimmed · ${trimmedBatch.usedValues.length} used`)
                      : tx('直接算術平均', 'Untrimmed Mean')}
                  </span>
                </div>
                {trimmedBatch.trimmed && (
                  <div className="font-mono text-[11px] text-slate-600">
                    {tx('剔除最低：', 'Dropped Low: ')}
                    <span className="text-rose-700 font-bold">{trimmedBatch.droppedLow.join(', ')}</span>
                    {' ｜ '}
                    {tx('剔除最高：', 'Dropped High: ')}
                    <span className="text-amber-700 font-bold">{trimmedBatch.droppedHigh.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="PO"
          standardRef="ASTM D5731-16 · STP06-RKT-D5731 rev 2 · Core Only"
          formulaText="Diametral De² = D×D' ｜ Axial De² = 4WD'/π ｜ Is = P_N / De² ｜ F = (De/50)^0.45 ｜ Is(50) = F × Is · 3 sig. figs"
          copyText={copySummary}
          structuredData={poPayload}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            {
              title: tx('核查同軸度及以數碼卡尺量度 3 點平均尺寸', 'Check Coaxiality & Measure 3-Point Caliper Dimensions'),
              detail: tx(
                '開機前核查上下圓錐壓頭同軸度偏差 d_max − d_min < 0.20 mm；以校準數碼卡尺量度岩芯尺寸，徑向測試壓頭距自由端須 L ≥ 0.5D，軸向測試長徑比須 0.33 ≤ D/W ≤ 1.0。',
                'Verify platen coaxiality variance d_max − d_min < 0.20 mm; measure dimensions with calibrated digital caliper — Diametral free-end L ≥ 0.5D, Axial ratio 0.33 ≤ D/W ≤ 1.0.'
              ),
            },
            {
              title: tx('穩定加壓於 10 至 60 秒內達致破壞', 'Steady Loading to Failure in 10–60 Seconds'),
              detail: tx(
                '穩定泵壓使岩芯於 10 至 60 秒內破壞，記錄最大破壞荷載 P 及有明顯貫入時之壓頭間距 D\'；低於 10 秒或超過 60 秒之讀數一律屬無效須重測。',
                'Apply load steadily so failure occurs within 10–60 s, recording peak load P and platen separation D\' if penetration occurs; reject any run < 10 s or > 60 s.'
              ),
            },
            {
              title: tx('檢視貫穿破裂面及執行批次截尾平均', 'Verify Fracture Mode & Compute Trimmed Mean'),
              detail: tx(
                '破裂面須完整貫穿上下兩壓頭接觸點，局部崩角屬無效模式 I；同一岩樣測試 ≥ 10 組試件時剔除最高 2 組及最低 2 組計算平均 Is(50)。',
                'Fracture surface must pass through both platen contact points; when n ≥ 10 specimens are tested per sample, discard the 2 highest and 2 lowest values for mean Is(50).'
              ),
            },
          ]}
          pitfalls={[
            tx(
              'STP06 Rev 2 Cl. 2.1 及 HOKLAS 298 明確規定不得以本方法測試不規則岩塊或方塊試樣。',
              'STP06 Rev 2 Cl. 2.1 and HOKLAS 298 strictly prohibit testing irregular lumps or block specimens.'
            ),
            tx(
              'BD CoP Foundations Table 2.1 規定岩石地基須鑽探證實基岩以下最少 5 m 或 2 倍樁徑深度之岩質完整度。',
              'BD CoP Table 2.1 requires proving rock quality to at least 5 m depth below foundation level or 2 × pile diameter.'
            ),
          ]}
        />
      </div>
    </div>
  );
};
