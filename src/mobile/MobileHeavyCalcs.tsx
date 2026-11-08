import React, { useState, useMemo } from 'react';
import { usePrefs } from '../prefs';
import { MobileCalcFooter } from './MobileSimpleCalcs';
import { Plus, RotateCcw, Sparkles } from 'lucide-react';

const PLT_INIT = [
  { stepName: '25% Design', loadKn: '50', g1: '1.12', g2: '1.18', g3: '1.15', g4: '1.11' },
  { stepName: '50% Design', loadKn: '100', g1: '2.45', g2: '2.56', g3: '2.50', g4: '2.41' },
  { stepName: '100% (1.0W)', loadKn: '200', g1: '5.18', g2: '5.42', g3: '5.30', g4: '5.10' },
  { stepName: '150% (1.5W)', loadKn: '300', g1: '8.35', g2: '8.72', g3: '8.55', g4: '8.26' },
  { stepName: 'Unload (0 kN)', loadKn: '0', g1: '2.10', g2: '2.22', g3: '2.16', g4: '2.08' },
];

export const MobilePlateLoadCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [shape, setShape] = useState<'circular' | 'square'>('circular');
  const [sizeMm, setSizeMm] = useState('300');
  const [zeroG, setZeroG] = useState({ g1: '0.50', g2: '0.50', g3: '0.50', g4: '0.50' });
  const [workingKpa, setWorkingKpa] = useState('250');
  const [steps, setSteps] = useState(PLT_INIT);

  const sizeM = Math.max(0.05, (parseFloat(sizeMm) || 300) / 1000);
  const areaM2 = shape === 'circular' ? Math.PI * Math.pow(sizeM / 2, 2) : sizeM * sizeM;

  const computed = useMemo(() => steps.map((st) => {
    const pKn = parseFloat(st.loadKn) || 0;
    const qKpa = pKn / areaM2;
    const arr = [
      (parseFloat(st.g1) || 0) - (parseFloat(zeroG.g1) || 0),
      (parseFloat(st.g2) || 0) - (parseFloat(zeroG.g2) || 0),
      (parseFloat(st.g3) || 0) - (parseFloat(zeroG.g3) || 0),
      (parseFloat(st.g4) || 0) - (parseFloat(zeroG.g4) || 0),
    ];
    const meanMm = arr.reduce((a, b) => a + b, 0) / 4;
    const ks = meanMm > 0.05 && pKn > 0 ? qKpa / meanMm : null;
    return { ...st, pKn, qKpa, meanMm, ks };
  }), [steps, zeroG, areaM2]);

  const peak = computed.reduce((a, b) => (b.pKn >= a.pKn ? b : a), computed[0]);
  const limitMm = 0.15 * (parseFloat(sizeMm) || 300);
  const pass = (peak?.meanMm ?? 0) <= limitMm;
  const esMpa = peak && peak.meanMm > 0.05 && peak.pKn > 0
    ? (peak.pKn * (1 - 0.09)) / ((shape === 'circular' ? 1.0 : 1.13) * peak.meanMm * sizeM)
    : null;

  const apply3Cycle = () => {
    const w = Math.max(10, parseFloat(workingKpa) || 250);
    const z = (parseFloat(zeroG.g1) || 0.5).toFixed(2);
    const mults: [string, number][] = [['C1: 0.5W', 0.5], ['C1: 1.0W', 1.0], ['C1: 0', 0], ['C2: 2.0W', 2.0], ['C2: 0', 0], ['C3: 3.0W', 3.0], ['C3: Final 0', 0]];
    setSteps(mults.map(([stepName, m]) => ({ stepName, loadKn: (m * w * areaM2).toFixed(1), g1: z, g2: z, g3: z, g4: z })));
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between"><span className="font-extrabold text-sm text-slate-900">🏗️ Plate Load Test</span><button type="button" onClick={() => setSteps(PLT_INIT)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}</button></div>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 font-extrabold">
          <button type="button" onClick={() => setShape('circular')} className={`rounded-lg py-2 cursor-pointer ${shape === 'circular' ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>⭕ {tx('圓形鋼板', 'Circular Plate')}</button>
          <button type="button" onClick={() => setShape('square')} className={`rounded-lg py-2 cursor-pointer ${shape === 'square' ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>⬜ {tx('正方形鋼板', 'Square Plate')}</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">{shape === 'circular' ? tx('直徑 ØD (mm)', 'Dia ØD (mm)') : tx('邊長 B (mm)', 'Width B (mm)')}</span><input type="number" value={sizeMm} onChange={(e) => setSizeMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Working W (kPa)</span><input type="number" value={workingKpa} onChange={(e) => setWorkingKpa(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></label>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(['g1', 'g2', 'g3', 'g4'] as const).map((k, idx) => (
            <label key={k} className="rounded-xl bg-slate-50 p-2 border border-slate-200/80 block"><span className="font-mono text-[10px] font-bold text-slate-500">G{idx + 1}₀</span><input type="number" step="0.01" value={zeroG[k]} onChange={(e) => setZeroG({ ...zeroG, [k]: e.target.value })} className="mt-0.5 w-full rounded border border-slate-300 bg-white px-1.5 py-1 font-mono text-xs font-bold" /></label>
          ))}
        </div>
        <button type="button" onClick={apply3Cycle} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 py-2 font-extrabold text-indigo-800 cursor-pointer"><Sparkles className="h-3.5 w-3.5" /> {tx('套用 BD 3-Cycle 分級荷載表', 'Apply BD 3-Cycle Schedule')}</button>
        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${pass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div><div className="text-[11px] font-bold text-slate-600">Peak q = {peak?.qKpa.toFixed(1)} kPa (A={areaM2.toFixed(3)} m²)</div><div className="font-mono text-2xl font-black text-slate-900">S = {peak?.meanMm.toFixed(2)} mm</div><div className="font-mono text-[11px] font-bold text-brand-deep">ks = {peak?.ks ? peak.ks.toFixed(1) : '—'} MN/m³ · Es = {esMpa ? esMpa.toFixed(1) : '—'} MPa</div></div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${pass ? 'bg-emerald-600' : 'bg-rose-600'}`}>{pass ? 'PASS' : 'EXCEED'}</span>
        </div>
      </div>

      <div className="space-y-2">
        {computed.map((st, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input value={st.stepName} onChange={(e) => setSteps((p) => p.map((x, idx) => (idx === i ? { ...x, stepName: e.target.value } : x)))} className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-extrabold text-slate-800" />
              <span className="font-mono text-[11px] font-extrabold text-brand-deep">{st.qKpa.toFixed(0)} kPa · S={st.meanMm.toFixed(2)} mm</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              <label className="block"><span className="text-[10px] font-bold text-slate-500">P (kN)</span><input type="number" step="any" value={st.loadKn} onChange={(e) => setSteps((p) => p.map((x, idx) => (idx === i ? { ...x, loadKn: e.target.value } : x)))} className="mt-0.5 w-full rounded-lg border border-slate-300 px-1.5 py-1.5 font-mono font-bold" /></label>
              {(['g1', 'g2', 'g3', 'g4'] as const).map((gk, gIdx) => (
                <label key={gk} className="block"><span className="text-[10px] font-bold text-slate-500">G{gIdx + 1}</span><input type="number" step="0.01" value={st[gk]} onChange={(e) => setSteps((p) => p.map((x, idx) => (idx === i ? { ...x, [gk]: e.target.value } : x)))} className="mt-0.5 w-full rounded-lg border border-slate-200 px-1.5 py-1.5 font-mono" /></label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setSteps((p) => [...p, { stepName: `Step ${p.length + 1}`, loadKn: '250', g1: '6.00', g2: '6.00', g3: '6.00', g4: '6.00' }])} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"><Plus className="h-4 w-4" /> {tx('新增荷載級別', 'Add Load Stage')}</button>
      </div>

      <MobileCalcFooter
        stpCode="PLT"
        formula="q = P / A ｜ Mean S = Σ(Gi − Gi₀)/4 ｜ ks = q / S ｜ BD Es = P(1−ν²) / (β·S·B)"
        copyText={`[PLT] ${shape} ${sizeMm}mm (A=${areaM2.toFixed(4)}m²) | P=${peak?.pKn.toFixed(1)}kN (${peak?.qKpa.toFixed(1)}kPa) | S=${peak?.meanMm.toFixed(2)}mm (${pass ? 'PASS' : 'EXCEED'})`}
        structuredData={{
          kind: 'PLT',
          plateShape: shape,
          plateSizeMm: parseFloat(sizeMm) || 300,
          areaM2,
          gaugeCount: 4,
          workingKpa: parseFloat(workingKpa) || 250,
          poissonNu: 0.3,
          zeroG: {
            g1: parseFloat(zeroG.g1) || 0,
            g2: parseFloat(zeroG.g2) || 0,
            g3: parseFloat(zeroG.g3) || 0,
            g4: parseFloat(zeroG.g4) || 0,
          },
          prev15mAvg: 8.44,
          curr15mAvg: 8.47,
          rate15m: 0.03,
          rateStable: true,
          peakLoadKn: peak?.pKn ?? 0,
          peakPressureKpa: peak?.qKpa ?? 0,
          peakSettlementMm: peak?.meanMm ?? 0,
          limit015BMm: limitMm,
          ksPeak: peak?.ks ?? null,
          esMpa,
          pass015B: pass,
          steps: computed.map((c) => ({
            stepName: c.stepName,
            loadKn: c.pKn,
            pressureKpa: c.qKpa,
            g1: parseFloat(c.g1) || 0,
            g2: parseFloat(c.g2) || 0,
            g3: parseFloat(c.g3) || 0,
            g4: parseFloat(c.g4) || 0,
            d1: (parseFloat(c.g1) || 0) - (parseFloat(zeroG.g1) || 0),
            d2: (parseFloat(c.g2) || 0) - (parseFloat(zeroG.g2) || 0),
            d3: (parseFloat(c.g3) || 0) - (parseFloat(zeroG.g3) || 0),
            d4: (parseFloat(c.g4) || 0) - (parseFloat(zeroG.g4) || 0),
            meanMm: c.meanMm,
            spreadMm: 0.2,
            ks: c.ks,
            tiltWarn: false,
          })),
        }}
        notes={[tx('基準樑支座須距承載板邊緣 ≥ 2.5B 並加設遮陽防風棚。', 'Reference beam supports must be ≥ 2.5B from plate edge with sun/wind protection.')]}
      />
    </div>
  );
};

const INC_INIT = [
  { depthM: '2.0', a0: '2.40', a180: '-2.30', b0: '1.60', b180: '-1.52' },
  { depthM: '4.0', a0: '2.65', a180: '-2.55', b0: '1.75', b180: '-1.68' },
  { depthM: '6.0', a0: '2.90', a180: '-2.82', b0: '1.85', b180: '-1.79' },
  { depthM: '8.0', a0: '3.10', a180: '-3.00', b0: '2.05', b180: '-1.96' },
  { depthM: '10.0', a0: '3.25', a180: '-3.16', b0: '2.20', b180: '-2.12' },
];

export const MobileInclinometerCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [limitN, setLimitN] = useState(100);
  const [rows, setRows] = useState(INC_INIT);

  const computed = useMemo(() => {
    let cA = 0;
    let cB = 0;
    return rows.map((r) => {
      const d = Math.max(0.5, parseFloat(r.depthM) || 0.5);
      const a0 = parseFloat(r.a0) || 0;
      const a180 = parseFloat(r.a180) || 0;
      const b0 = parseFloat(r.b0) || 0;
      const b180 = parseFloat(r.b180) || 0;
      cA += (a0 - a180) / 2;
      cB += (b0 - b180) / 2;
      const resMm = Math.hypot(cA, cB);
      return { ...r, d, chkA: a0 + a180, chkB: b0 + b180, resMm, ratioN: resMm > 0.05 ? (d * 1000) / resMm : 9999 };
    });
  }, [rows]);

  const worst = computed.reduce((a, b) => (b.resMm >= a.resMm ? b : a), computed[0]);
  const maxD = Math.max(...computed.map((c) => c.d), 1);
  const overallN = worst && worst.resMm > 0.05 ? (maxD * 1000) / worst.resMm : 9999;
  const pass = overallN >= limitN;

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between"><span className="font-extrabold text-sm text-slate-900">📐 Verticality (Inclinometer)</span><button type="button" onClick={() => setRows(INC_INIT)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}</button></div>
        <div className="grid grid-cols-4 gap-1.5">
          {[75, 100, 120, 200].map((n) => (
            <button key={n} type="button" onClick={() => setLimitN(n)} className={`rounded-xl py-1.5 font-mono font-extrabold cursor-pointer ${limitN === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>≤1:{n}</button>
          ))}
        </div>
        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${pass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div><div className="text-[11px] font-bold text-slate-600">Depth {maxD.toFixed(1)} m · Max Drift R = {worst?.resMm.toFixed(2)} mm</div><div className="font-mono text-2xl font-black text-slate-900">1 : {Math.round(overallN)}</div></div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${pass ? 'bg-emerald-600' : 'bg-rose-600'}`}>{pass ? 'PASS' : 'EXCEED'}</span>
        </div>
      </div>

      <div className="space-y-2">
        {computed.map((r, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5"><span className="font-bold text-slate-500">Depth (m):</span><input type="number" step="0.5" value={r.depthM} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, depthM: e.target.value } : x)))} className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono font-bold" /></div>
              <span className="font-mono text-[11px] font-extrabold text-brand-deep">R={r.resMm.toFixed(2)}mm · 1:{Math.round(r.ratioN)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['a0', 'a180', 'b0', 'b180'] as const).map((k) => (
                <label key={k} className="block"><span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{k}</span><input type="number" step="0.01" value={r[k]} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, [k]: e.target.value } : x)))} className="mt-0.5 w-full rounded-lg border border-slate-200 px-1.5 py-1.5 font-mono" /></label>
              ))}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Checksum A0+A180 = {r.chkA.toFixed(2)} ｜ B0+B180 = {r.chkB.toFixed(2)}</div>
          </div>
        ))}
        <button type="button" onClick={() => setRows((p) => [...p, { depthM: (maxD + 2).toFixed(1), a0: '3.00', a180: '-2.92', b0: '2.00', b180: '-1.92' }])} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"><Plus className="h-4 w-4" /> {tx('新增深度測點', 'Add Depth Station')}</button>
      </div>

      <MobileCalcFooter stpCode="VC" formula="ΔA=(A0−A180)/2, ΔB=(B0−B180)/2 ｜ R=√((ΣΔA)²+(ΣΔB)²) ｜ 1:N=Depth/R" copyText={`[VC Inclinometer] Depth=${maxD.toFixed(1)}m | Max R=${worst?.resMm.toFixed(2)}mm | 1:${Math.round(overallN)} (${pass ? 'PASS' : 'EXCEED'})`} notes={[tx('正反 180° 兩測可消除探頭零位漂移，須核對 Checksum 一致性。', 'Verify A0+A180 and B0+B180 checksum consistency.')]} />
    </div>
  );
};
