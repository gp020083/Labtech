import React, { useState, useMemo } from 'react';
import { usePrefs } from '../../prefs';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw } from 'lucide-react';

interface IncRow {
  depthM: string;
  a0: string;
  a180: string;
  b0: string;
  b180: string;
}

const DEFAULT_INC_ROWS: IncRow[] = [
  { depthM: '2.0', a0: '2.40', a180: '-2.30', b0: '1.60', b180: '-1.52' },
  { depthM: '4.0', a0: '2.65', a180: '-2.55', b0: '1.75', b180: '-1.68' },
  { depthM: '6.0', a0: '2.90', a180: '-2.82', b0: '1.85', b180: '-1.79' },
  { depthM: '8.0', a0: '3.10', a180: '-3.00', b0: '2.05', b180: '-1.96' },
  { depthM: '10.0', a0: '3.25', a180: '-3.16', b0: '2.20', b180: '-2.12' },
];

export const InclinometerCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [limitDenom, setLimitDenom] = useState<number>(100);
  const [rows, setRows] = useState<IncRow[]>(DEFAULT_INC_ROWS);

  const computed = useMemo(() => {
    let cumA = 0;
    let cumB = 0;
    return rows.map((r) => {
      const d = Math.max(0.5, parseFloat(r.depthM) || 0.5);
      const a0 = parseFloat(r.a0) || 0;
      const a180 = parseFloat(r.a180) || 0;
      const b0 = parseFloat(r.b0) || 0;
      const b180 = parseFloat(r.b180) || 0;
      const dA = (a0 - a180) / 2;
      const dB = (b0 - b180) / 2;
      const chkA = a0 + a180;
      const chkB = b0 + b180;
      cumA += dA;
      cumB += dB;
      const resMm = Math.hypot(cumA, cumB);
      const ratioN = resMm > 0.05 ? (d * 1000) / resMm : 9999;
      return { ...r, d, dA, dB, chkA, chkB, cumA, cumB, resMm, ratioN };
    });
  }, [rows]);

  const worst = useMemo(() => {
    return computed.reduce((a, b) => (b.resMm >= a.resMm ? b : a), computed[0]);
  }, [computed]);

  const maxDepthM = Math.max(...computed.map((c) => c.d), 1);
  const overallN = worst && worst.resMm > 0.05 ? (maxDepthM * 1000) / worst.resMm : 9999;
  const isPass = overallN >= limitDenom;

  const updateRow = (idx: number, field: keyof IncRow, val: string) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));

  const copySummary = `[Labtech Calc — Verticality Check (Biaxial Inclinometer LT-IN-01)]
Max Depth = ${maxDepthM.toFixed(1)} m ｜ Peak Resultant Drift R = ${worst?.resMm.toFixed(2)} mm (ΣΔA=${worst?.cumA.toFixed(2)}, ΣΔB=${worst?.cumB.toFixed(2)})
Verticality Gradient = 1 : ${Math.round(overallN)} (Spec Limit ≤ 1:${limitDenom} → ${isPass ? 'PASS' : 'EXCEED'})`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx('📐 Verticality Check (Inclinometer) — 雙軸垂直度計算工具', '📐 Verticality Check (Biaxial Inclinometer) Calculator')}
            </h2>
            <p className="text-xs text-slate-500">
              {tx('支援 Geokon GK-604D (LT-IN-01) 正反兩測 A0/A180 及 B0/B180 Checksum 核查、累積偏移量 R 及 1:N 垂直度判定。', 'Computes A0/A180 & B0/B180 Checksums, Cumulative Drift R (mm), and 1:N Verticality against BD / CEDD tolerances.')}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setRows(DEFAULT_INC_ROWS)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設範例', 'Reset')}</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-200/70 text-xs">
          <span className="font-bold text-slate-700">{tx('驗收容許傾斜度 Spec Limit：', 'Verticality Tolerance:')}</span>
          {[75, 100, 120, 200].map((n) => (
            <button key={n} type="button" onClick={() => setLimitDenom(n)} className={`rounded-lg px-2.5 py-1 font-mono font-extrabold cursor-pointer ${limitDenom === n ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>≤ 1:{n}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-3.5"><div className="text-xs font-bold text-slate-600">Max Resultant Drift (R)</div><div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{worst?.resMm.toFixed(2)} mm</div><div className="text-[11px] text-slate-500">ΣΔA={worst?.cumA.toFixed(1)} · ΣΔB={worst?.cumB.toFixed(1)} mm</div></div>
          <div className={`rounded-2xl border p-3.5 ${isPass ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}><div className="text-xs font-bold text-slate-600">Verticality (1 : N)</div><div className={`mt-1 font-mono text-2xl font-extrabold ${isPass ? 'text-emerald-800' : 'text-rose-800'}`}>1 : {Math.round(overallN)}</div><div className="text-[11px] font-bold text-slate-600">Limit ≤ 1:{limitDenom} → {isPass ? '✓ PASS' : '✗ EXCEED'}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"><div className="text-xs font-bold text-slate-600">Surveyed Depth</div><div className="mt-1 font-mono text-2xl font-extrabold text-slate-900">{maxDepthM.toFixed(1)} m</div><div className="text-[11px] text-slate-500">{rows.length} stations</div></div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr><th className="px-2 py-2">Depth(m)</th><th className="px-2 py-2">A0</th><th className="px-2 py-2">A180</th><th className="px-2 py-2">B0</th><th className="px-2 py-2">B180</th><th className="px-2 py-2">Chk A/B</th><th className="px-2 py-2">R (mm)</th><th className="px-2 py-2">1:N</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {computed.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/70">
                  <td className="px-2 py-1.5"><input type="number" step="0.5" value={r.depthM} onChange={(e) => updateRow(i, 'depthM', e.target.value)} className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs font-bold" /></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.a0} onChange={(e) => updateRow(i, 'a0', e.target.value)} className="w-15 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.a180} onChange={(e) => updateRow(i, 'a180', e.target.value)} className="w-15 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.b0} onChange={(e) => updateRow(i, 'b0', e.target.value)} className="w-15 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.b180} onChange={(e) => updateRow(i, 'b180', e.target.value)} className="w-15 rounded border border-slate-200 px-1 py-1 text-xs" /></td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600">{r.chkA.toFixed(2)} / {r.chkB.toFixed(2)}</td>
                  <td className="px-2 py-1.5 font-extrabold text-brand-deep">{r.resMm.toFixed(2)}</td>
                  <td className="px-2 py-1.5 font-bold text-slate-800">1:{Math.round(r.ratioN)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setRows([...rows, { depthM: (maxDepthM + 2).toFixed(1), a0: '3.00', a180: '-2.92', b0: '2.00', b180: '-1.92' }])} className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand cursor-pointer"><Plus className="h-3.5 w-3.5" /> {tx('新增深度測點 Depth Row', 'Add Depth Row')}</button>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="VC"
          standardRef="BD CoP Foundations / CEDD GS · LT-IN-01"
          formulaText="ΔA = (A0 - A180)/2 ｜ ΔB = (B0 - B180)/2 ｜ R = √((ΣΔA)² + (ΣΔB)²) ｜ 1:N = Depth / R"
          copyText={copySummary}
          structuredData={{
            kind: 'VC',
            limitN: limitDenom,
            maxDepthM,
            maxDriftMm: worst?.resMm ?? 0,
            overallN,
            isPass,
            rows: computed.map((c) => ({
              depthM: c.d,
              a0: parseFloat(c.a0) || 0,
              a180: parseFloat(c.a180) || 0,
              b0: parseFloat(c.b0) || 0,
              b180: parseFloat(c.b180) || 0,
              chkA: c.chkA,
              chkB: c.chkB,
              resMm: c.resMm,
              ratioN: c.ratioN,
            })),
          }}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            { title: tx('核對測斜管導槽方位及下放探頭', 'Verify Casing Grooves & Lower Probe'), detail: tx('使用指南針 (LT-CP-01~03) 記錄 A0 主導槽方位角；將雙軸測斜探頭 (LT-IN-01) 下放至管底靜置最少 10 分鐘以達致溫度平衡。', 'Record A0 groove azimuth using compass; lower Biaxial Probe (LT-IN-01) to casing bottom and allow ≥10 min for thermal equilibrium.') },
            { title: tx('首輪正向提拉讀數 (A0 / B0)', 'First Pass Upward Readings (A0 / B0)'), detail: tx('由孔底起每隔 0.5 m（或指定深度間距）穩固卡位，待讀數穩定後記錄 A0 及 B0 讀數直至孔口。', 'Pull probe upward at 0.5 m intervals, wait for reading stabilization, and record A0 and B0 to top of casing.') },
            { title: tx('旋轉 180° 反向複測消除零點漂移', 'Rotate 180° for Reverse Pass (A180 / B180)'), detail: tx('將探頭水平旋轉 180° 重新下放至孔底，按相同深度點向上記錄 A180 及 B180，核對 Checksum (A0+A180) 保持一致以消除儀器零位誤差。', 'Rotate probe 180°, lower to bottom, and record A180/B180 at identical depths to cancel sensor zero-bias and verify Checksum consistency.') },
          ]}
          pitfalls={[
            tx('若個別深度 Checksum 突變過大，通常為滑輪未卡入導槽接駁口或管壁積泥，須重測該段深度。', 'Sudden Checksum spikes indicate wheel seating on casing joints or debris—re-seat and re-read that depth.'),
            tx('鋼工字樁／嵌岩工字樁常見容許偏差為 ≤ 1:100，鑽孔樁／連續牆一般為 ≤ 1:75 至 1:120（須以工程特定批核圖則為準）。', 'Typical verticality limits: ≤ 1:100 for Rock-Socketed H-Piles / Mini-piles, ≤ 1:75 to 1:120 for Bored Piles / Diaphragm Walls.'),
          ]}
        />
      </div>
    </div>
  );
};
