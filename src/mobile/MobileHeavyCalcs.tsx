import React, { useState, useMemo } from 'react';
import { usePrefs } from '../prefs';
import { MobileCalcFooter } from './MobileSimpleCalcs';
import {
  buildStandard3CycleSteps,
  PltStepRow,
} from '../components/tools/PlateLoadCalcTool';
import {
  VcSurveyMode,
  PeeWeeRow,
  BiaxialRow,
  DEFAULT_PEEWEE_ROWS,
  DEFAULT_BIAXIAL_ROWS,
} from '../components/tools/InclinometerCalcTool';
import {
  PltStructuredPayload,
  InclinometerStructuredPayload,
} from '../utils/completedWorksheetGenerator';
import { Plus, RotateCcw, Sparkles, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const MobilePlateLoadCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [shape, setShape] = useState<'square' | 'circular'>('square');
  const [sizeMm, setSizeMm] = useState('300');
  const [zeroG, setZeroG] = useState({ g1: '0.50', g2: '0.50', g3: '0.50', g4: '0.50' });
  const [workingKpa, setWorkingKpa] = useState('250');
  const [poissonNu, setPoissonNu] = useState('0.30');
  const [limitMode, setLimitMode] = useState<'015B' | 'asd25'>('015B');
  const [prev10mAvg, setPrev10mAvg] = useState('11.27');
  const [curr10mAvg, setCurr10mAvg] = useState('11.30');
  const [steps, setSteps] = useState<PltStepRow[]>(() => buildStandard3CycleSteps(250, 0.09, 0.5));

  const sizeMmNum = Math.max(50, parseFloat(sizeMm) || 300);
  const sizeM = sizeMmNum / 1000;
  const areaM2 = shape === 'circular' ? (Math.PI * sizeM * sizeM) / 4 : sizeM * sizeM;
  const workKpaNum = Math.max(10, parseFloat(workingKpa) || 250);
  const nu = Math.min(0.49, Math.max(0, parseFloat(poissonNu) || 0.3));

  const handleShapeSwitch = (nextShape: 'square' | 'circular') => {
    if (nextShape === shape) return;
    const nextArea = nextShape === 'circular' ? (Math.PI * sizeM * sizeM) / 4 : sizeM * sizeM;
    const ratio = areaM2 > 0 ? nextArea / areaM2 : 1;
    setShape(nextShape);
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

  const apply3Cycle = () => {
    const z0 = parseFloat(zeroG.g1) || 0.5;
    setSteps(buildStandard3CycleSteps(workKpaNum, areaM2, z0));
  };

  const computed = useMemo(() => {
    const z1 = parseFloat(zeroG.g1) || 0;
    const z2 = parseFloat(zeroG.g2) || 0;
    const z3 = parseFloat(zeroG.g3) || 0;
    const z4 = parseFloat(zeroG.g4) || 0;

    return steps.map((st, idx) => {
      const pKn = Math.max(0, parseFloat(st.loadKn) || 0);
      const qKpa = areaM2 > 0 ? pKn / areaM2 : 0;
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
      const ks = meanMm > 0.05 && pKn > 0 ? qKpa / meanMm : null;
      return { ...st, idx, pKn, qKpa, isLoadingOrPeak, d1, d2, d3, d4, meanMm, spreadMm, tiltWarn, ks };
    });
  }, [steps, zeroG, areaM2]);

  const peakLoadRow = useMemo(() => {
    const pos = computed.filter((c) => c.qKpa > 0);
    return pos.length ? pos.reduce((a, b) => (b.qKpa >= a.qKpa ? b : a), pos[0]) : computed[0];
  }, [computed]);

  const maxSettleMm = useMemo(
    () => (computed.length ? Math.max(0, ...computed.map((c) => c.meanMm)) : 0),
    [computed]
  );

  const workRow = useMemo(() => {
    const loadingPos = computed.filter((c) => c.qKpa > 0 && c.isLoadingOrPeak && c.meanMm > 0);
    const pool = loadingPos.length > 0 ? loadingPos : computed.filter((c) => c.qKpa > 0);
    if (pool.length === 0) return null;
    return pool.reduce((best, cur) =>
      Math.abs(cur.qKpa - workKpaNum) < Math.abs(best.qKpa - workKpaNum) ? cur : best
    );
  }, [computed, workKpaNum]);

  const limitMm = limitMode === '015B' ? 0.15 * sizeMmNum : 25.0;
  const passSettlement = maxSettleMm <= limitMm + 1e-9;
  const rate10m = Math.abs((parseFloat(curr10mAvg) || 0) - (parseFloat(prev10mAvg) || 0));
  const rateStable = rate10m < 0.05 - 1e-9;
  const isPass = passSettlement && rateStable;

  const esMpa = useMemo(() => {
    if (!workRow || workRow.meanMm <= 0.02 || workRow.pKn <= 0) return null;
    const shapeFactor = shape === 'circular' ? 1.0 : 1.13;
    return (workRow.pKn * (1 - nu * nu)) / (shapeFactor * workRow.meanMm * sizeM);
  }, [workRow, nu, shape, sizeM]);

  const updateStep = (idx: number, field: keyof PltStepRow, val: string) =>
    setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, [field]: val } : x)));

  const statusLabel = !passSettlement
    ? 'EXCEED'
    : !rateStable
    ? 'HOLD LOAD / RE-CHECK'
    : 'PASS';

  const copySummary = [
    `[PLT Plate Load Test — STP07-PLT · 4 Orthogonal Gauges]`,
    `${shape === 'square' ? `Square B×B ${sizeMmNum}×${sizeMmNum}mm` : `Circular ØB ${sizeMmNum}mm`} · A=${areaM2.toFixed(4)}m² ｜ Working W=${workKpaNum.toFixed(0)}kPa`,
    `Working Step ${workRow ? `${workRow.stepName} · Wt=${workRow.pKn.toFixed(1)}kN · Sw=${workRow.meanMm.toFixed(2)}mm` : 'N/A'} ｜ Es=${esMpa !== null ? `${esMpa.toFixed(1)}MPa` : 'N/A'}`,
    `Peak P=${(peakLoadRow?.pKn ?? 0).toFixed(1)}kN · q=${(peakLoadRow?.qKpa ?? 0).toFixed(1)}kPa ｜ Smax=${maxSettleMm.toFixed(2)}mm vs ≤${limitMm.toFixed(1)}mm ｜ 10m Rate=${rate10m.toFixed(2)}mm → ${statusLabel}`,
  ].join('\n');

  const pltPayload: PltStructuredPayload = {
    kind: 'PLT',
    plateShape: shape,
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
    peakPressureKpa: peakLoadRow?.qKpa ?? 0,
    peakSettlementMm: maxSettleMm,
    limit015BMm: limitMm,
    ksPeak: peakLoadRow?.ks ?? null,
    esMpa,
    pass015B: isPass,
    steps: computed.map((c) => ({
      stepName: c.stepName,
      loadKn: c.pKn,
      pressureKpa: c.qKpa,
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
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-extrabold text-sm text-slate-900">
              {tx('🏗️ 平板載荷測試 · STP07-PLT', '🏗️ Plate Load Test · STP07-PLT')}
            </div>
            <div className="text-[11px] text-slate-500">
              {tx('4 隻正交千分錶 DG1–DG4 · 3 循環荷載及 Es 計算', '4 Orthogonal Dial Gauges DG1–DG4 · 3-Cycle & Es')}
            </div>
          </div>
          <button
            type="button"
            onClick={apply3Cycle}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}
          </button>
        </div>

        {/* Plate Shape Selector */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 font-extrabold">
          <button
            type="button"
            onClick={() => handleShapeSwitch('square')}
            className={`min-h-[40px] rounded-lg py-1.5 px-2 cursor-pointer transition ${
              shape === 'square' ? 'bg-brand text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            ⬜ {tx('方形承載板 B×B', 'Square Plate B×B')}
          </button>
          <button
            type="button"
            onClick={() => handleShapeSwitch('circular')}
            className={`min-h-[40px] rounded-lg py-1.5 px-2 cursor-pointer transition ${
              shape === 'circular' ? 'bg-brand text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            ⭕ {tx('圓形承載板 πB²/4', 'Circular Plate πB²/4')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">
              {shape === 'square' ? tx('邊長 B · mm', 'Width B · mm') : tx('直徑 ØB · mm', 'Dia ØB · mm')}
            </span>
            <input
              type="number"
              value={sizeMm}
              onChange={(e) => setSizeMm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold"
            />
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('設計 W · kPa', 'Working W · kPa')}</span>
            <input
              type="number"
              value={workingKpa}
              onChange={(e) => setWorkingKpa(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold"
            />
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">Poisson ν</span>
            <input
              type="number"
              step="0.05"
              value={poissonNu}
              onChange={(e) => setPoissonNu(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold"
            />
          </label>
        </div>

        {/* Settlement Limit Toggle + 10-min Hold Stability */}
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-700">{tx('沉降驗收上限', 'Settlement Limit')}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setLimitMode('015B')}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-extrabold cursor-pointer ${
                  limitMode === '015B' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                0.15B · {(0.15 * sizeMmNum).toFixed(1)}mm
              </button>
              <button
                type="button"
                onClick={() => setLimitMode('asd25')}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-extrabold cursor-pointer ${
                  limitMode === 'asd25' ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                ASD · 25.0mm
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500">
                {tx('前 10 min 均值 · mm', 'Prev 10m Mean · mm')}
              </span>
              <input
                type="number"
                step="0.01"
                value={prev10mAvg}
                onChange={(e) => setPrev10mAvg(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono font-bold"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500">
                {tx('本 10 min 均值 · mm', 'Curr 10m Mean · mm')}
              </span>
              <input
                type="number"
                step="0.01"
                value={curr10mAvg}
                onChange={(e) => setCurr10mAvg(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono font-bold"
              />
            </label>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600">
              {tx('10 min 沉降速率 · 須 < 0.05 mm', '10-min Rate · Req < 0.05 mm')}
            </span>
            <span className={`font-mono font-extrabold ${rateStable ? 'text-emerald-700' : 'text-amber-700'}`}>
              {rate10m.toFixed(2)} mm / 10m · {rateStable ? 'STABLE' : 'HOLD LOAD'}
            </span>
          </div>
        </div>

        {/* Zero Datum Gauges DG1₀..DG4₀ in 2x2 Touch Grid */}
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">
              {tx('初始基準讀數 DG1₀ – DG4₀ · mm', 'Datum Zero Readings DG1₀ – DG4₀ · mm')}
            </span>
            <span className="font-mono text-[10px] text-slate-500">A = {areaM2.toFixed(4)} m²</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['g1', 'g2', 'g3', 'g4'] as const).map((k, idx) => (
              <label key={k} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-slate-200">
                <span className="font-mono text-[11px] font-extrabold text-slate-600">DG{idx + 1}₀</span>
                <input
                  type="number"
                  step="0.01"
                  value={zeroG[k]}
                  onChange={(e) => setZeroG({ ...zeroG, [k]: e.target.value })}
                  className="w-20 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-right font-mono text-xs font-bold"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={apply3Cycle}
          className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 py-2 px-3 font-extrabold text-indigo-800 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{tx('載入 3 循環標準階段 · 1W / 2W / 3W', 'Load Standard 3-Cycle Schedule · 1W / 2W / 3W')}</span>
        </button>

        {/* Live Result Banner */}
        <div
          className={`rounded-2xl border p-3.5 space-y-2 ${
            isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-slate-600">
                Peak q = {(peakLoadRow?.qKpa ?? 0).toFixed(1)} kPa · P = {(peakLoadRow?.pKn ?? 0).toFixed(1)} kN
              </div>
              <div className="font-mono text-2xl font-black text-slate-900">
                Smax = {maxSettleMm.toFixed(2)} mm
              </div>
            </div>
            <span
              className={`rounded-xl px-3 py-1.5 font-extrabold text-white shrink-0 ${
                isPass ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 font-mono text-[11px] font-bold text-brand-deep">
            <span>
              1W Sw = {workRow ? `${workRow.meanMm.toFixed(2)} mm` : '—'} · Es ={' '}
              {esMpa !== null ? `${esMpa.toFixed(1)} MPa` : '—'}
            </span>
            <span>
              {shape === 'square' ? 'β = 1.13 Square' : 'β = 1.00 Circular'} · ≤ {limitMm.toFixed(1)} mm
            </span>
          </div>
        </div>
      </div>

      {/* Touch-Friendly Load Step Cards with 2x2 Grid for DG1..DG4 */}
      <div className="space-y-2.5">
        {computed.map((st, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <input
                value={st.stepName}
                onChange={(e) => updateStep(i, 'stepName', e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-extrabold text-slate-800"
              />
              <span className="font-mono text-[11px] font-extrabold text-brand-deep shrink-0">
                {st.qKpa.toFixed(0)} kPa · S={st.meanMm.toFixed(2)} mm
              </span>
              {steps.length > 2 && (
                <button
                  type="button"
                  onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  aria-label="Delete stage"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <label className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/80">
              <span className="font-bold text-slate-700">
                {tx('千斤頂荷載 P · kN', 'Applied Jack Force P · kN')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-500">= {st.qKpa.toFixed(1)} kPa</span>
                <input
                  type="number"
                  step="any"
                  value={st.loadKn}
                  onChange={(e) => updateStep(i, 'loadKn', e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-sm font-bold"
                />
              </div>
            </label>

            {/* 2x2 Orthogonal Dial Gauge Grid */}
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['g1', 'DG1', st.d1],
                  ['g2', 'DG2', st.d2],
                  ['g3', 'DG3', st.d3],
                  ['g4', 'DG4', st.d4],
                ] as const
              ).map(([gk, label, delta]) => (
                <label
                  key={gk}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 block"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-extrabold text-slate-700">{label} · mm</span>
                    <span className="font-bold text-brand-deep">Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={st[gk]}
                    onChange={(e) => updateStep(i, gk, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold"
                  />
                </label>
              ))}
            </div>

            {st.tiltWarn && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {tx(
                    `四角沉降極差 ${st.spreadMm.toFixed(2)} mm 偏大，請檢查承載板偏心或基準樑擾動`,
                    `Corner gauge spread ${st.spreadMm.toFixed(2)} mm — check eccentric loading or reference beam`
                  )}
                </span>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setSteps((p) => [
              ...p,
              {
                stepName: `Stage ${p.length + 1}`,
                loadKn: (workKpaNum * areaM2).toFixed(1),
                g1: zeroG.g1,
                g2: zeroG.g2,
                g3: zeroG.g3,
                g4: zeroG.g4,
              },
            ])
          }
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> {tx('新增荷載級別', 'Add Load Stage')}
        </button>
      </div>

      <MobileCalcFooter
        stpCode="PLT"
        formula="q = P / A ｜ Mean S = Σ(DGi − DGi₀)/4 ｜ Circular Es = Wt(1−ν²)/(S·B) ｜ Square Es = Wt(1−ν²)/(1.13·S·B)"
        copyText={copySummary}
        structuredData={pltPayload}
        notes={[
          tx(
            '每級維持 ≥ 10 分鐘且沉降率 < 0.05 mm / 10 min；3W 頂載維持 ≥ 72 小時。',
            'Hold each increment ≥ 10 min until settlement rate < 0.05 mm / 10 min; hold 3W peak load ≥ 72 hours.'
          ),
          tx(
            '基準樑支座須距承載板邊緣 ≥ 2.5B 並加設遮陽防風棚；千斤頂與承載板嚴禁使用球鉸連接。',
            'Reference beam supports ≥ 2.5B from plate edge with sun/wind shelter; NO ball seating between jack and plate.'
          ),
        ]}
      />
    </div>
  );
};

export const MobileInclinometerCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [surveyMode, setSurveyMode] = useState<VcSurveyMode>('peewee');
  const [limitN, setLimitN] = useState(100);
  const [gaugeLengthM, setGaugeLengthM] = useState(0.5);
  const [peeweeRows, setPeeweeRows] = useState<PeeWeeRow[]>(DEFAULT_PEEWEE_ROWS);
  const [biaxialRows, setBiaxialRows] = useState<BiaxialRow[]>(DEFAULT_BIAXIAL_ROWS);

  const isPeewee = surveyMode === 'peewee';

  const resetCurrent = () => {
    if (isPeewee) {
      setPeeweeRows(DEFAULT_PEEWEE_ROWS);
    } else {
      setBiaxialRows(DEFAULT_BIAXIAL_ROWS);
      setGaugeLengthM(0.5);
    }
  };

  const computedPeewee = useMemo(() => {
    let cumEMm = 0;
    let cumNMm = 0;
    let prevDepth = 0;
    return peeweeRows.map((r) => {
      const d = Math.max(0.1, parseFloat(r.depthM) || 0.5);
      const deltaLM = Math.max(0.1, d - prevDepth);
      prevDepth = d;
      const inclDeg = Math.max(0, parseFloat(r.inclDeg) || 0);
      const azimDeg = (((parseFloat(r.azimDeg) || 0) % 360) + 360) % 360;
      const iRad = (inclDeg * Math.PI) / 180;
      const aRad = (azimDeg * Math.PI) / 180;
      const dEMm = deltaLM * 1000 * Math.sin(iRad) * Math.sin(aRad);
      const dNMm = deltaLM * 1000 * Math.sin(iRad) * Math.cos(aRad);
      cumEMm += dEMm;
      cumNMm += dNMm;
      const resMm = Math.hypot(cumEMm, cumNMm);
      const bearingDeg = ((Math.atan2(cumEMm, cumNMm) * 180) / Math.PI + 360) % 360;
      const ratioN = resMm > 0.05 ? (d * 1000) / resMm : 9999;
      return { ...r, d, deltaLM, inclDeg, azimDeg, dEMm, dNMm, cumEMm, cumNMm, resMm, bearingDeg, ratioN };
    });
  }, [peeweeRows]);

  const computedBiaxial = useMemo(() => {
    let cumA = 0;
    let cumB = 0;
    let prevDepth = 0;
    const raw = biaxialRows.map((r) => {
      const d = Math.max(0.1, parseFloat(r.depthM) || 0.5);
      const deltaDepth = Math.max(0.1, d - prevDepth);
      prevDepth = d;
      const a0 = parseFloat(r.a0) || 0;
      const a180 = parseFloat(r.a180) || 0;
      const b0 = parseFloat(r.b0) || 0;
      const b180 = parseFloat(r.b180) || 0;
      const scale = deltaDepth / Math.max(0.1, gaugeLengthM);
      const incA = ((a0 - a180) / 2) * scale;
      const incB = ((b0 - b180) / 2) * scale;
      cumA += incA;
      cumB += incB;
      const resMm = Math.hypot(cumA, cumB);
      const ratioN = resMm > 0.05 ? (d * 1000) / resMm : 9999;
      return {
        ...r,
        d,
        deltaDepth,
        a0Num: a0,
        a180Num: a180,
        b0Num: b0,
        b180Num: b180,
        chkA: a0 + a180,
        chkB: b0 + b180,
        incA,
        incB,
        cumA,
        cumB,
        resMm,
        ratioN,
      };
    });

    const n = Math.max(1, raw.length);
    const meanChkA = raw.reduce((s, x) => s + x.chkA, 0) / n;
    const meanChkB = raw.reduce((s, x) => s + x.chkB, 0) / n;

    return raw.map((x) => ({
      ...x,
      chkWarn:
        raw.length >= 2 &&
        (Math.abs(x.chkA - meanChkA) > 0.3 || Math.abs(x.chkB - meanChkB) > 0.3),
    }));
  }, [biaxialRows, gaugeLengthM]);

  const maxD = isPeewee
    ? Math.max(0.5, ...computedPeewee.map((c) => c.d))
    : Math.max(0.5, ...computedBiaxial.map((c) => c.d));

  const maxDriftMm = isPeewee
    ? Math.max(0, ...computedPeewee.map((c) => c.resMm))
    : Math.max(0, ...computedBiaxial.map((c) => c.resMm));

  const criticalStation = isPeewee
    ? computedPeewee.reduce((a, b) => (b.ratioN <= a.ratioN ? b : a), computedPeewee[0])
    : computedBiaxial.reduce((a, b) => (b.ratioN <= a.ratioN ? b : a), computedBiaxial[0]);

  const overallN = criticalStation ? criticalStation.ratioN : 9999;
  const anyChkWarn = !isPeewee && computedBiaxial.some((c) => c.chkWarn);
  const gradOk = overallN >= limitN;
  const isPass = gradOk && !anyChkWarn;

  const statusText = !gradOk ? 'EXCEED' : anyChkWarn ? 'RE-CHECK' : 'PASS';

  const copySummary = isPeewee
    ? `[VC Verticality — PeeWee / Devishot] Depth=${maxD.toFixed(1)}m | Max R=${maxDriftMm.toFixed(2)}mm | Critical 1:${
        overallN > 5000 ? '∞' : Math.round(overallN)
      } at ${criticalStation?.d.toFixed(1) ?? '0'}m vs ≤1:${limitN} → ${statusText}`
    : `[VC Verticality — Biaxial Lg=${gaugeLengthM.toFixed(1)}m] Depth=${maxD.toFixed(1)}m | Max R=${maxDriftMm.toFixed(
        2
      )}mm | Checksum=${anyChkWarn ? 'RE-CHECK' : 'OK'} | Critical 1:${
        overallN > 5000 ? '∞' : Math.round(overallN)
      } at ${criticalStation?.d.toFixed(1) ?? '0'}m vs ≤1:${limitN} → ${statusText}`;

  const vcPayload: InclinometerStructuredPayload = {
    kind: 'VC',
    surveyMode: isPeewee ? 'peewee' : 'inclinometer',
    gaugeLengthM: isPeewee ? undefined : gaugeLengthM,
    limitN,
    maxDepthM: maxD,
    maxDriftMm,
    overallN,
    isPass,
    rows: isPeewee
      ? computedPeewee.map((c) => ({
          depthM: c.d,
          a0: c.inclDeg,
          a180: 0,
          b0: c.azimDeg,
          b180: 0,
          chkA: Number(c.cumEMm.toFixed(2)),
          chkB: Number(c.cumNMm.toFixed(2)),
          resMm: Number(c.resMm.toFixed(2)),
          ratioN: c.ratioN,
        }))
      : computedBiaxial.map((c) => ({
          depthM: c.d,
          a0: c.a0Num,
          a180: c.a180Num,
          b0: c.b0Num,
          b180: c.b180Num,
          chkA: Number(c.chkA.toFixed(2)),
          chkB: Number(c.chkB.toFixed(2)),
          resMm: Number(c.resMm.toFixed(2)),
          ratioN: c.ratioN,
        })),
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-extrabold text-sm text-slate-900">
              {tx('📐 鑽孔垂直度測斜 · VC', '📐 Borehole Verticality · VC')}
            </div>
            <div className="text-[11px] text-slate-500">
              {tx('PeeWee / Devishot 鑽孔測斜及雙軸測斜管', 'PeeWee / Devishot & Biaxial Casing Mode')}
            </div>
          </div>
          <button
            type="button"
            onClick={resetCurrent}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}
          </button>
        </div>

        {/* Survey Mode Toggle */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 font-extrabold">
          <button
            type="button"
            onClick={() => setSurveyMode('peewee')}
            className={`min-h-[40px] rounded-lg py-1.5 px-2 cursor-pointer transition ${
              isPeewee ? 'bg-brand text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            {tx('PeeWee / Devishot 鑽孔測斜', 'PeeWee / Devishot Mode')}
          </button>
          <button
            type="button"
            onClick={() => setSurveyMode('biaxial')}
            className={`min-h-[40px] rounded-lg py-1.5 px-2 cursor-pointer transition ${
              !isPeewee ? 'bg-brand text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            {tx('雙軸測斜管 A0/A180', 'Biaxial A0/A180 Mode')}
          </button>
        </div>

        {/* Tolerance Preset & Gauge Length */}
        <div className="grid grid-cols-4 gap-1.5">
          {[75, 100, 120, 200].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLimitN(n)}
              className={`min-h-[38px] rounded-xl py-1.5 font-mono font-extrabold cursor-pointer ${
                limitN === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              ≤1:{n}
            </button>
          ))}
        </div>

        {!isPeewee && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/80">
            <span className="font-bold text-slate-700">
              {tx('探頭軸距 Lg · Δdepth / Lg 倍率換算', 'Gauge Length Lg · Δdepth / Lg scaling')}
            </span>
            <div className="flex gap-1.5">
              {[0.5, 1.0].map((lg) => (
                <button
                  key={lg}
                  type="button"
                  onClick={() => setGaugeLengthM(lg)}
                  className={`rounded-lg px-2.5 py-1 font-mono font-extrabold cursor-pointer ${
                    gaugeLengthM === lg
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {lg.toFixed(1)} m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result Banner */}
        <div
          className={`rounded-2xl border p-3.5 space-y-1.5 ${
            isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-slate-600">
                Depth {maxD.toFixed(1)} m · Max Drift R = {maxDriftMm.toFixed(2)} mm
              </div>
              <div className="font-mono text-2xl font-black text-slate-900">
                1 : {overallN > 5000 ? '∞' : Math.round(overallN)}
              </div>
            </div>
            <span
              className={`rounded-xl px-3 py-1.5 font-extrabold text-white shrink-0 ${
                isPass ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {statusText}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200/70">
            <span>
              {tx('控制深度', 'Governing at')} {criticalStation?.d.toFixed(1) ?? '0'} m
            </span>
            {!isPeewee ? (
              <span className={`inline-flex items-center gap-1 font-bold ${anyChkWarn ? 'text-rose-700' : 'text-emerald-700'}`}>
                {anyChkWarn ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Checksum {anyChkWarn ? 'Drift >0.30mm' : 'Consistent'}
              </span>
            ) : (
              <span className="font-bold text-brand-deep">
                Bearing {criticalStation && 'bearingDeg' in criticalStation ? `${criticalStation.bearingDeg.toFixed(0)}°` : '—'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Station Cards */}
      {isPeewee ? (
        <div className="space-y-2">
          {computedPeewee.map((r, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600">Depth · m</span>
                  <input
                    type="number"
                    step="0.5"
                    value={r.depthM}
                    onChange={(e) =>
                      setPeeweeRows((p) => p.map((x, idx) => (idx === i ? { ...x, depthM: e.target.value } : x)))
                    }
                    className="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-mono font-bold"
                  />
                </label>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-[11px] font-extrabold ${
                      r.ratioN >= limitN ? 'text-brand-deep' : 'text-rose-600'
                    }`}
                  >
                    R={r.resMm.toFixed(2)}mm · 1:{r.ratioN > 5000 ? '∞' : Math.round(r.ratioN)}
                  </span>
                  {peeweeRows.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPeeweeRows((p) => p.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 block">
                  <span className="font-mono text-[10px] font-bold text-slate-600">
                    {tx('傾角 Inclination I · °', 'Inclination I · °')}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={r.inclDeg}
                    onChange={(e) =>
                      setPeeweeRows((p) => p.map((x, idx) => (idx === i ? { ...x, inclDeg: e.target.value } : x)))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold"
                  />
                </label>
                <label className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 block">
                  <span className="font-mono text-[10px] font-bold text-slate-600">
                    {tx('方位角 Azimuth α · °', 'Azimuth α · °')}
                  </span>
                  <input
                    type="number"
                    step="1"
                    value={r.azimDeg}
                    onChange={(e) =>
                      setPeeweeRows((p) => p.map((x, idx) => (idx === i ? { ...x, azimDeg: e.target.value } : x)))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold"
                  />
                </label>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                ΔL={r.deltaLM.toFixed(1)}m ｜ ΣE={r.cumEMm.toFixed(2)}mm ｜ ΣN={r.cumNMm.toFixed(2)}mm ｜ Dir={r.bearingDeg.toFixed(0)}°
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setPeeweeRows((p) => [
                ...p,
                { depthM: (maxD + 2).toFixed(1), inclDeg: '0.35', azimDeg: '130' },
              ])
            }
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {tx('新增 PeeWee 測站', 'Add PeeWee Station')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {computedBiaxial.map((r, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600">Depth · m</span>
                  <input
                    type="number"
                    step="0.5"
                    value={r.depthM}
                    onChange={(e) =>
                      setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, depthM: e.target.value } : x)))
                    }
                    className="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-mono font-bold"
                  />
                </label>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-[11px] font-extrabold ${
                      r.ratioN >= limitN ? 'text-brand-deep' : 'text-rose-600'
                    }`}
                  >
                    R={r.resMm.toFixed(2)}mm · 1:{r.ratioN > 5000 ? '∞' : Math.round(r.ratioN)}
                  </span>
                  {biaxialRows.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setBiaxialRows((p) => p.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['a0', 'a180', 'b0', 'b180'] as const).map((k) => (
                  <label key={k} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 block">
                    <span className="font-mono text-[10px] font-extrabold text-slate-600 uppercase">{k} · mm/Lg</span>
                    <input
                      type="number"
                      step="0.01"
                      value={r[k]}
                      onChange={(e) =>
                        setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, [k]: e.target.value } : x)))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold"
                    />
                  </label>
                ))}
              </div>
              <div
                className={`text-[10px] font-mono ${
                  r.chkWarn ? 'font-bold text-rose-700' : 'text-slate-500'
                }`}
              >
                Δd/Lg={(r.deltaDepth / gaugeLengthM).toFixed(1)}× ｜ Checksum A={r.chkA.toFixed(2)} · B={r.chkB.toFixed(2)}
                {r.chkWarn ? ' · DRIFT >0.30mm' : ''}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setBiaxialRows((p) => [
                ...p,
                { depthM: (maxD + 2).toFixed(1), a0: '1.30', a180: '-1.22', b0: '0.88', b180: '-0.80' },
              ])
            }
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {tx('新增深度測站', 'Add Depth Station')}
          </button>
        </div>
      )}

      <MobileCalcFooter
        stpCode="VC"
        formula={
          isPeewee
            ? 'ΔE = ΔL·sin I·sin α, ΔN = ΔL·sin I·cos α ｜ R = √((ΣΔE)²+(ΣΔN)²) ｜ 1:N = d / R(d)'
            : 'ΔA = ((A0−A180)/2)·(Δd/Lg), ΔB = ((B0−B180)/2)·(Δd/Lg) ｜ R = √((ΣΔA)²+(ΣΔB)²) ｜ 1:N = d / R(d)'
        }
        copyText={copySummary}
        structuredData={vcPayload}
        notes={[
          tx(
            'PeeWee / Devishot 模式採用鑽孔傾角及方位角分段積分；雙軸模式須乘以站距倍率 Δdepth / Lg。',
            'PeeWee / Devishot mode uses borehole inclination-azimuth integration; biaxial mode scales by Δdepth / Lg.'
          ),
          tx(
            '各測站垂直度按該站深度 d / R(d) 逐點檢核，並核對正反 180° Checksum 漂移 ≤ 0.30 mm。',
            'Verticality 1:N is evaluated at each station depth d / R(d), with A0+A180 and B0+B180 checksum constancy ≤ 0.30 mm.'
          ),
        ]}
      />
    </div>
  );
};
