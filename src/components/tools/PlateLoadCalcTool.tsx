import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw, Eye, Sparkles } from 'lucide-react';

interface PltStepRow {
  stepName: string;
  loadKn: string;
  g1: string;
  g2: string;
  g3: string;
  g4: string;
}

const DEFAULT_PLT_STEPS: PltStepRow[] = [
  { stepName: '25% Design Load', loadKn: '50', g1: '1.12', g2: '1.18', g3: '1.15', g4: '1.11' },
  { stepName: '50% Design Load', loadKn: '100', g1: '2.45', g2: '2.56', g3: '2.50', g4: '2.41' },
  { stepName: '100% Design (1.0x)', loadKn: '200', g1: '5.18', g2: '5.42', g3: '5.30', g4: '5.10' },
  { stepName: '150% Test (1.5x)', loadKn: '300', g1: '8.35', g2: '8.72', g3: '8.55', g4: '8.26' },
  { stepName: 'Unload (0 kN)', loadKn: '0', g1: '2.10', g2: '2.22', g3: '2.16', g4: '2.08' },
];

export const PlateLoadCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { openPreviewDoc } = useApp();
  const { tx } = usePrefs();
  const [plateShape, setPlateShape] = useState<'circular' | 'square'>('circular');
  const [plateSizeMm, setPlateSizeMm] = useState('300');
  const [gaugeCount, setGaugeCount] = useState<3 | 4>(4);
  const [zeroG, setZeroG] = useState({ g1: '0.50', g2: '0.50', g3: '0.50', g4: '0.50' });
  const [prev15mAvg, setPrev15mAvg] = useState('8.44');
  const [curr15mAvg, setCurr15mAvg] = useState('8.47');
  const [workingKpa, setWorkingKpa] = useState('250');
  const [poissonNu, setPoissonNu] = useState('0.30');
  const [steps, setSteps] = useState<PltStepRow[]>(DEFAULT_PLT_STEPS);

  const sizeM = Math.max(0.05, (parseFloat(plateSizeMm) || 300) / 1000);
  const areaM2 = plateShape === 'circular' ? Math.PI * Math.pow(sizeM / 2, 2) : sizeM * sizeM;

  const apply3CycleSchedule = () => {
    const w = Math.max(10, parseFloat(workingKpa) || 250);
    const z = (parseFloat(zeroG.g1) || 0.5).toFixed(2);
    const mults: [string, number][] = [
      ['C1: 0.5W', 0.5], ['C1: 1.0W', 1.0], ['C1: Unload 0', 0],
      ['C2: 1.0W', 1.0], ['C2: 1.5W', 1.5], ['C2: 2.0W', 2.0], ['C2: Unload 0', 0],
      ['C3: 1.5W', 1.5], ['C3: 2.0W', 2.0], ['C3: 2.5W', 2.5], ['C3: 3.0W (≥72h)', 3.0], ['C3: Final 0', 0],
    ];
    setSteps(mults.map(([name, m]) => ({
      stepName: name,
      loadKn: (m * w * areaM2).toFixed(1),
      g1: z, g2: z, g3: z, g4: z,
    })));
  };

  const computed = useMemo(() => {
    const z1 = parseFloat(zeroG.g1) || 0;
    const z2 = parseFloat(zeroG.g2) || 0;
    const z3 = parseFloat(zeroG.g3) || 0;
    const z4 = parseFloat(zeroG.g4) || 0;

    return steps.map((st) => {
      const pKn = parseFloat(st.loadKn) || 0;
      const pressureKpa = pKn / areaM2;
      const d1 = (parseFloat(st.g1) || 0) - z1;
      const d2 = (parseFloat(st.g2) || 0) - z2;
      const d3 = (parseFloat(st.g3) || 0) - z3;
      const d4 = (parseFloat(st.g4) || 0) - z4;
      const arr = gaugeCount === 4 ? [d1, d2, d3, d4] : [d1, d2, d3];
      const meanMm = arr.reduce((a, b) => a + b, 0) / arr.length;
      const spreadMm = Math.max(...arr) - Math.min(...arr);
      const tiltWarn = meanMm > 1.0 && spreadMm / meanMm > 0.35;
      const ks = meanMm > 0.05 && pKn > 0 ? pressureKpa / meanMm : null;
      return { ...st, pKn, pressureKpa, d1, d2, d3, d4, meanMm, spreadMm, tiltWarn, ks };
    });
  }, [steps, zeroG, gaugeCount, areaM2]);

  const maxLoadRow = useMemo(() => {
    const pos = computed.filter((c) => c.pKn > 0);
    return pos.length ? pos.reduce((a, b) => (b.pKn >= a.pKn ? b : a), pos[0]) : computed[0];
  }, [computed]);

  const rate15m = Math.abs((parseFloat(curr15mAvg) || 0) - (parseFloat(prev15mAvg) || 0));
  const rateStable = rate15m <= 0.05;
  const nu = Math.min(0.49, Math.max(0, parseFloat(poissonNu) || 0.30));
  const limit015BMm = 0.15 * (parseFloat(plateSizeMm) || 300);
  const pass015B = (maxLoadRow?.meanMm ?? 0) <= limit015BMm;
  const esMpa = useMemo(() => {
    if (!maxLoadRow || maxLoadRow.meanMm <= 0.05 || maxLoadRow.pKn <= 0) return null;
    const shapeFactor = plateShape === 'circular' ? 1.0 : 1.13;
    return (maxLoadRow.pKn * (1 - nu * nu)) / (shapeFactor * maxLoadRow.meanMm * sizeM);
  }, [maxLoadRow, nu, plateShape, sizeM]);

  const updateStep = (idx: number, field: keyof PltStepRow, val: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));

  const platePresets = plateShape === 'circular' ? ['300', '450', '600', '762'] : ['300', '450', '500', '600', '1000'];
  const plateDesc = plateShape === 'circular'
    ? `Circular Steel Plate ØD = ${plateSizeMm} mm (Area A = ${areaM2.toFixed(4)} m²)`
    : `Square Steel Plate B × B = ${plateSizeMm} × ${plateSizeMm} mm (Area A = ${areaM2.toFixed(4)} m²)`;

  const copySummary = `[Labtech Calc — Plate Load Test (BS 1377-9 / BD CoP Cl. 8.2(2))]
${plateDesc}
Peak Load P = ${maxLoadRow?.pKn.toFixed(1)} kN (Bearing Pressure q = ${maxLoadRow?.pressureKpa.toFixed(1)} kPa)
Mean Settlement S = ${maxLoadRow?.meanMm.toFixed(2)} mm (Limit 0.15B = ${limit015BMm.toFixed(1)} mm → ${pass015B ? 'PASS' : 'EXCEED'})
Modulus ks = ${maxLoadRow?.ks ? maxLoadRow.ks.toFixed(1) : '—'} MN/m³ ｜ BD Cl. 8.2(2)(g) Es (ν=${nu.toFixed(2)}) = ${esMpa ? esMpa.toFixed(2) : '—'} MPa
Stage Stability Δs = ${rate15m.toFixed(2)} mm (${rateStable ? 'STABLE ≤0.05mm' : 'HOLD LOAD'})`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx('🏗️ Plate Load Test — Settlement 自動計算工具', '🏗️ Plate Load Test — Settlement & Modulus Calculator')}
            </h2>
            <p className="text-xs text-slate-500">
              {tx('支援圓形及正方形 Steel Plate，自動扣減 Dial Gauge 零位 G0，計算承載應力 q (kPa)、平均沉降量及地基反力模量 ks。', 'Supports Circular & Square Steel Plates; computes Bearing Pressure (kPa), Mean Settlement (mm), Subgrade Modulus ks, and 15-min stability.')}
            </p>
          </div>
          <button type="button" onClick={() => { setPlateShape('circular'); setPlateSizeMm('300'); setSteps(DEFAULT_PLT_STEPS); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設範例數據', 'Reset Sample')}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <label className="font-bold text-slate-700">{tx('1. Steel Plate 形狀及尺寸', '1. Steel Plate Shape & Size')}</label>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-extrabold">
                <button type="button" onClick={() => setPlateShape('circular')} className={`rounded-md px-2 py-0.5 cursor-pointer ${plateShape === 'circular' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>⭕ {tx('圓形', 'Round')}</button>
                <button type="button" onClick={() => { setPlateShape('square'); setGaugeCount(4); }} className={`rounded-md px-2 py-0.5 cursor-pointer ${plateShape === 'square' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>⬜ {tx('正方形', 'Square')}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {platePresets.map((d) => (
                <button key={d} type="button" onClick={() => setPlateSizeMm(d)} className={`rounded-lg px-2 py-1 font-mono text-[11px] font-bold cursor-pointer ${plateSizeMm === d ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {plateShape === 'circular' ? `Ø${d}` : `${d}×${d}`}
                </button>
              ))}
              <input type="number" min="50" step="10" value={plateSizeMm} onChange={(e) => setPlateSizeMm(e.target.value)} title={tx('自訂尺寸 (mm)', 'Custom size (mm)')} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-bold" />
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="font-mono text-[11px] text-slate-600">Area A = <b>{areaM2.toFixed(4)} m²</b></span>
              <select value={gaugeCount} onChange={(e) => setGaugeCount(Number(e.target.value) as 3 | 4)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold"><option value={4}>{plateShape === 'square' ? tx('4 Gauges (四角)', '4 Gauges (Corners)') : '4 Gauges (90°)'}</option><option value={3}>3 Gauges (120°)</option></select>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 space-y-1.5">
            <label className="font-bold text-slate-700">{tx('2. Seating Zero Reading G0 (mm)', '2. Initial Zero Reading G0 (mm)')}</label>
            <div className="grid grid-cols-4 gap-1.5 font-mono">
              {(['g1', 'g2', 'g3', 'g4'] as const).slice(0, gaugeCount).map((k, idx) => (
                <div key={k}><span className="text-[10px] text-slate-400">G{idx + 1},0</span><input type="number" step="0.01" value={zeroG[k]} onChange={(e) => setZeroG({ ...zeroG, [k]: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold" /></div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-3 border space-y-1.5 ${rateStable ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
            <label className="font-bold text-slate-700">{tx('3. 10/15-min Settlement Stability', '3. 10/15-min Settlement Stability')}</label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div><span className="text-[10px] text-slate-500">{tx('前次 Avg (mm)', 'Prev Avg (mm)')}</span><input type="number" step="0.01" value={prev15mAvg} onChange={(e) => setPrev15mAvg(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold" /></div>
              <div><span className="text-[10px] text-slate-500">{tx('現時 Avg (mm)', 'Current (mm)')}</span><input type="number" step="0.01" value={curr15mAvg} onChange={(e) => setCurr15mAvg(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold" /></div>
            </div>
            <div className={`text-[11px] font-extrabold ${rateStable ? 'text-emerald-800' : 'text-amber-800'}`}>Δs = {rate15m.toFixed(2)} mm → {rateStable ? tx('✓ 已達穩定 (≤0.05mm)，可進下一級', '✓ STABLE (≤0.05mm)') : tx('⏳ 未達穩定 (>0.05mm，維持荷載)', '⏳ HOLD LOAD (>0.05mm)')}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-indigo-950">{tx('3-Cycle 加載表生成器 (STP07-PLT)：', '3-Cycle Schedule (STP07-PLT):')}</span>
            <label className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
              W (kPa)
              <input type="number" min="20" step="10" value={workingKpa} onChange={(e) => setWorkingKpa(e.target.value)} className="w-18 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-extrabold" />
            </label>
            <button type="button" onClick={apply3CycleSchedule} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 font-extrabold text-white hover:bg-indigo-700 cursor-pointer">
              <Sparkles className="h-3.5 w-3.5" /> {tx(`套用 3-Cycle (3W=${((parseFloat(workingKpa) || 250) * 3).toFixed(0)}kPa)`, 'Generate 3-Cycle')}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
              ν
              <input type="number" min="0.1" max="0.49" step="0.05" value={poissonNu} onChange={(e) => setPoissonNu(e.target.value)} className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs font-extrabold" />
            </label>
            <button type="button" onClick={() => openPreviewDoc({ title: 'STP07-PLT — Plate Load Test Draft STP', url: '/server-docs/stp/STP07-PLT_Draft_rev0_261027.pdf' })} className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 font-bold text-indigo-900 hover:bg-indigo-50 cursor-pointer">
              <Eye className="h-3 w-3" /> STP07-PLT PDF
            </button>
            <button type="button" onClick={() => openPreviewDoc({ title: tx('Plate Load Test 750 kPa 反力架結構驗算書', 'Plate Load Test 750 kPa Reaction Frame Check'), url: '/server-docs/stp/PLT_Setup_Checking_750kPa_261021.pdf' })} className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 font-bold text-indigo-900 hover:bg-indigo-50 cursor-pointer">
              <Eye className="h-3 w-3" /> {tx('750kPa 架設計算書', '750kPa Setup PDF')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-3.5"><div className="text-xs font-bold text-slate-600">Peak Bearing Pressure (q)</div><div className="mt-1 font-mono text-xl sm:text-2xl font-extrabold text-brand-deep">{maxLoadRow?.pressureKpa.toFixed(1)} kPa</div><div className="text-[11px] text-slate-500">Load Wt = {maxLoadRow?.pKn.toFixed(1)} kN</div></div>
          <div className={`rounded-2xl border p-3.5 ${pass015B ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}><div className="text-xs font-bold text-slate-600">Mean Settlement (S)</div><div className={`mt-1 font-mono text-xl sm:text-2xl font-extrabold ${pass015B ? 'text-emerald-800' : 'text-rose-800'}`}>{maxLoadRow?.meanMm.toFixed(2)} mm</div><div className="text-[11px] font-bold text-slate-600">BD ≤0.15B ({limit015BMm.toFixed(0)}mm): {pass015B ? '✓ PASS' : '✗ EXCEED'}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"><div className="text-xs font-bold text-slate-600">Subgrade Modulus ks</div><div className="mt-1 font-mono text-xl sm:text-2xl font-extrabold text-slate-900">{maxLoadRow?.ks ? maxLoadRow.ks.toFixed(1) : '—'} MN/m³</div><div className="text-[11px] text-slate-500">q / S (kPa / mm)</div></div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3.5"><div className="text-xs font-bold text-indigo-900">BD Cl. 8.2(2) Es</div><div className="mt-1 font-mono text-xl sm:text-2xl font-extrabold text-indigo-950">{esMpa ? esMpa.toFixed(1) : '—'} MPa</div><div className="text-[11px] text-indigo-700">{plateShape === 'circular' ? 'Wt(1-ν²)/(S·B)' : 'Wt(1-ν²)/(1.13·S·B)'}</div></div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr><th className="px-2.5 py-2">Load Step</th><th className="px-2 py-2">Load (kN)</th><th className="px-2 py-2">q (kPa)</th><th className="px-2 py-2">G1</th><th className="px-2 py-2">G2</th><th className="px-2 py-2">G3</th>{gaugeCount === 4 && <th className="px-2 py-2">G4</th>}<th className="px-2.5 py-2">Mean Settlement (mm)</th><th className="px-2.5 py-2">ks (MN/m³)</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {computed.map((r, i) => (
                <tr key={i} className={r.tiltWarn ? 'bg-amber-50/60' : 'hover:bg-slate-50/70'}>
                  <td className="px-2.5 py-1.5"><input value={r.stepName} onChange={(e) => updateStep(i, 'stepName', e.target.value)} className="w-32 rounded border border-slate-200 px-1.5 py-1 font-sans text-xs font-bold" /></td>
                  <td className="px-2 py-1.5"><input type="number" value={r.loadKn} onChange={(e) => updateStep(i, 'loadKn', e.target.value)} className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5 font-bold text-slate-700">{r.pressureKpa.toFixed(0)}</td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g1} onChange={(e) => updateStep(i, 'g1', e.target.value)} className="w-14 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g2} onChange={(e) => updateStep(i, 'g2', e.target.value)} className="w-14 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g3} onChange={(e) => updateStep(i, 'g3', e.target.value)} className="w-14 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  {gaugeCount === 4 && <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.g4} onChange={(e) => updateStep(i, 'g4', e.target.value)} className="w-14 rounded border border-slate-200 px-1 py-1 text-xs" /></td>}
                  <td className="px-2.5 py-1.5 font-extrabold text-brand-deep">{r.meanMm.toFixed(2)} {r.tiltWarn && <span title="Excessive eccentric tilt across gauges">⚠️Tilt</span>}</td>
                  <td className="px-2.5 py-1.5 font-bold text-slate-700">{r.ks ? r.ks.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setSteps([...steps, { stepName: `Step ${steps.length + 1}`, loadKn: '250', g1: '6.50', g2: '6.60', g3: '6.55', g4: '6.48' }])} className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand cursor-pointer"><Plus className="h-3.5 w-3.5" /> {tx('新增荷載級別 Load Step', 'Add Load Step')}</button>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="PLT"
          standardRef="BS 1377-9 / Geospec 3 · STP07-PLT"
          formulaText={plateShape === 'circular' ? 'q = P / (π × (D/2)²) ｜ Δsi = Gi - Gi,0 ｜ savg = ΣΔsi / n ｜ ks = q / savg' : 'q = P / (B × B) ｜ Δsi = Gi - Gi,0 ｜ savg = ΣΔsi / n ｜ ks = q / savg'}
          copyText={copySummary}
          structuredData={{
            kind: 'PLT',
            plateShape,
            plateSizeMm: parseFloat(plateSizeMm) || 300,
            areaM2,
            gaugeCount,
            workingKpa: parseFloat(workingKpa) || 250,
            poissonNu: nu,
            zeroG: {
              g1: parseFloat(zeroG.g1) || 0,
              g2: parseFloat(zeroG.g2) || 0,
              g3: parseFloat(zeroG.g3) || 0,
              g4: parseFloat(zeroG.g4) || 0,
            },
            prev15mAvg: parseFloat(prev15mAvg) || 0,
            curr15mAvg: parseFloat(curr15mAvg) || 0,
            rate15m,
            rateStable,
            peakLoadKn: maxLoadRow?.pKn ?? 0,
            peakPressureKpa: maxLoadRow?.pressureKpa ?? 0,
            peakSettlementMm: maxLoadRow?.meanMm ?? 0,
            limit015BMm,
            ksPeak: maxLoadRow?.ks ?? null,
            esMpa,
            pass015B,
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
          }}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
          { title: tx('整平測試面及安放承載鋼板', 'Prepare Ground & Set Steel Bearing Plate'), detail: tx('清除表面鬆散泥土並鋪設薄層乾燥細砂找平，安放剛性圓形（ØD）或正方形（B × B）Steel Bearing Plate，Hydraulic Jack 及 Load Cell 必須對準鋼板正中心垂直架設。', 'Trim loose soil, level with thin dry sand layer, and center the Hydraulic Jack and Load Cell vertically on the rigid Circular or Square Steel Bearing Plate.') },
          { title: tx('架設獨立 Reference Beam 及 Dial Gauges', 'Set Reference Beam & Dial Gauges'), detail: tx('Reference Beam 兩端支點距離鋼板邊緣須 ≥ 2.5D（或 ≥ 2.5B）；正方形板於四角對稱安裝 4 隻 Dial Gauges，圓形板按 90° / 120° 對稱安裝 4 或 3 隻錶。', 'Reference Beam supports must be ≥ 2.5D (or 2.5B) away from plate edge; mount 4 Dial Gauges at corners for Square plates or 3/4 symmetrically for Circular plates.') },
          { title: tx('施加預壓 Seating Load 及記錄零位', 'Seating Load & Zeroing'), detail: tx('先施加預壓荷載使承載板底部緊密貼合，待讀數穩定後記錄初始讀數 G1,0 至 G4,0 並填入第 2 欄。', 'Apply seating load to ensure full contact, then record initial zero readings G1,0 ~ G4,0 in Box 2.') },
          { title: tx('分級加載及沉降穩定核對', 'Incremental Loading & Stability'), detail: tx('每級加載後於 1, 2, 4, 8, 15, 30, 60 min 記錄讀數並維持油壓恆定；確認連續 15 min 沉降變化 Δs ≤ 0.05 mm 方可施加下一級荷載。', 'Record readings at 1, 2, 4, 8, 15, 30, 60 min while maintaining load; verify Δs ≤ 0.05 mm per 15 min before next increment.') },
        ]}
        pitfalls={[
          tx('若出現「⚠️Tilt」（各錶讀數差距超過 35%），表示千斤頂偏心或地層不均勻，應暫停加載並檢查架設安全。', 'If ⚠️Tilt appears (>35% spread across gauges), stop and check jack eccentricity or uneven ground before increasing load!'),
          tx('陽光直射會導致鋼製 Reference Beam 熱脹變形影響讀數，現場必須架設遮陽帆布。', 'Direct sunlight causes thermal expansion of steel Reference Beams—always erect sunshades over the setup!'),
          tx('嚴禁人員或重型機械靠近 Reference Beam 支點 2m 範圍內，並隨時留意油壓有否下降以便即時補壓。', 'Keep personnel and heavy machinery >2m away from Reference Beam supports, and maintain constant Load Cell pressure.'),
        ]}
        />
      </div>
    </div>
  );
};
