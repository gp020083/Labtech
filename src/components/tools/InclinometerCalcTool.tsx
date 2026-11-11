import React, { useState, useMemo } from 'react';
import { usePrefs } from '../../prefs';
import { InclinometerStructuredPayload } from '../../utils/completedWorksheetGenerator';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type VcSurveyMode = 'peewee' | 'biaxial';

export interface PeeWeeRow {
  depthM: string;
  inclDeg: string;
  azimDeg: string;
}

export interface BiaxialRow {
  depthM: string;
  a0: string;
  a180: string;
  b0: string;
  b180: string;
}

export const DEFAULT_PEEWEE_ROWS: PeeWeeRow[] = [
  { depthM: '2.0', inclDeg: '0.32', azimDeg: '125' },
  { depthM: '4.0', inclDeg: '0.35', azimDeg: '128' },
  { depthM: '6.0', inclDeg: '0.38', azimDeg: '130' },
  { depthM: '8.0', inclDeg: '0.40', azimDeg: '132' },
  { depthM: '10.0', inclDeg: '0.42', azimDeg: '134' },
];

export const DEFAULT_BIAXIAL_ROWS: BiaxialRow[] = [
  { depthM: '2.0', a0: '1.15', a180: '-1.07', b0: '0.78', b180: '-0.70' },
  { depthM: '4.0', a0: '1.22', a180: '-1.14', b0: '0.82', b180: '-0.74' },
  { depthM: '6.0', a0: '1.28', a180: '-1.20', b0: '0.86', b180: '-0.78' },
  { depthM: '8.0', a0: '1.34', a180: '-1.25', b0: '0.90', b180: '-0.81' },
  { depthM: '10.0', a0: '1.40', a180: '-1.31', b0: '0.94', b180: '-0.85' },
];

export const InclinometerCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [surveyMode, setSurveyMode] = useState<VcSurveyMode>('peewee');
  const [limitDenom, setLimitDenom] = useState<number>(100);
  const [gaugeLengthM, setGaugeLengthM] = useState<number>(0.5);
  const [peeweeRows, setPeeweeRows] = useState<PeeWeeRow[]>(DEFAULT_PEEWEE_ROWS);
  const [biaxialRows, setBiaxialRows] = useState<BiaxialRow[]>(DEFAULT_BIAXIAL_ROWS);

  const resetCurrentMode = () => {
    if (surveyMode === 'peewee') {
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
      const azimDeg = ((parseFloat(r.azimDeg) || 0) % 360 + 360) % 360;
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
    const rawPass = biaxialRows.map((r) => {
      const d = Math.max(0.1, parseFloat(r.depthM) || 0.5);
      const deltaDepth = Math.max(0.1, d - prevDepth);
      prevDepth = d;
      const a0 = parseFloat(r.a0) || 0;
      const a180 = parseFloat(r.a180) || 0;
      const b0 = parseFloat(r.b0) || 0;
      const b180 = parseFloat(r.b180) || 0;
      const meanA = (a0 - a180) / 2;
      const meanB = (b0 - b180) / 2;
      const scaleMult = deltaDepth / Math.max(0.1, gaugeLengthM);
      const incA = meanA * scaleMult;
      const incB = meanB * scaleMult;
      const chkA = a0 + a180;
      const chkB = b0 + b180;
      cumA += incA;
      cumB += incB;
      const resMm = Math.hypot(cumA, cumB);
      const ratioN = resMm > 0.05 ? (d * 1000) / resMm : 9999;
      return { ...r, d, deltaDepth, a0Num: a0, a180Num: a180, b0Num: b0, b180Num: b180, incA, incB, chkA, chkB, cumA, cumB, resMm, ratioN };
    });

    const meanChkA = rawPass.reduce((s, x) => s + x.chkA, 0) / Math.max(1, rawPass.length);
    const meanChkB = rawPass.reduce((s, x) => s + x.chkB, 0) / Math.max(1, rawPass.length);

    return rawPass.map((x) => {
      const chkWarn = Math.abs(x.chkA - meanChkA) > 0.30 || Math.abs(x.chkB - meanChkB) > 0.30;
      return { ...x, chkWarn };
    });
  }, [biaxialRows, gaugeLengthM]);

  const isPeewee = surveyMode === 'peewee';
  const activeDepths = isPeewee ? computedPeewee.map((c) => c.d) : computedBiaxial.map((c) => c.d);
  const maxDepthM = Math.max(...activeDepths, 1);

  const maxDriftMm = isPeewee
    ? Math.max(0, ...computedPeewee.map((c) => c.resMm))
    : Math.max(0, ...computedBiaxial.map((c) => c.resMm));

  const criticalStation = isPeewee
    ? computedPeewee.reduce((a, b) => (b.ratioN <= a.ratioN ? b : a), computedPeewee[0])
    : computedBiaxial.reduce((a, b) => (b.ratioN <= a.ratioN ? b : a), computedBiaxial[0]);

  const overallN = criticalStation ? criticalStation.ratioN : 9999;
  const anyChkWarn = !isPeewee && computedBiaxial.some((c) => c.chkWarn);
  const gradOk = overallN >= limitDenom;
  const isPass = gradOk && !anyChkWarn;

  const vcPayload: InclinometerStructuredPayload = {
    kind: 'VC',
    surveyMode: isPeewee ? 'peewee' : 'inclinometer',
    gaugeLengthM: isPeewee ? undefined : gaugeLengthM,
    limitN: limitDenom,
    maxDepthM,
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

  const failReasons: string[] = [];
  if (!gradOk) failReasons.push(`EXCEED Spec 1:${limitDenom}`);
  if (anyChkWarn) failReasons.push('RE-CHECK Checksum Drift > 0.30mm');

  const copySummary = isPeewee
    ? [
        `[VC Verticality Check — HOKLAS-5 PeeWee / Devishot Borehole Deviation]`,
        `Surveyed Depth = ${maxDepthM.toFixed(1)} m · ${computedPeewee.length} stations ｜ Max Resultant Drift R = ${maxDriftMm.toFixed(2)} mm`,
        `Governing Verticality at ${criticalStation?.d.toFixed(1) ?? '0'} m = 1 : ${overallN > 5000 ? '∞' : Math.round(overallN)} · Spec ≤ 1:${limitDenom} → ${isPass ? 'PASS' : failReasons.join(' / ')}`,
      ].join('\n')
    : [
        `[VC Verticality Check — Biaxial Inclinometer · Gauge Length Lg = ${gaugeLengthM.toFixed(1)} m]`,
        `Surveyed Depth = ${maxDepthM.toFixed(1)} m ｜ Max Resultant Drift R = ${maxDriftMm.toFixed(2)} mm ｜ Checksum Constancy: ${anyChkWarn ? 'RE-CHECK' : 'OK'}`,
        `Governing Verticality at ${criticalStation?.d.toFixed(1) ?? '0'} m = 1 : ${overallN > 5000 ? '∞' : Math.round(overallN)} · Spec ≤ 1:${limitDenom} → ${isPass ? 'PASS' : failReasons.join(' / ')}`,
      ].join('\n');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx(
                '📐 Step 1 · 鑽孔垂直度測斜計算器 · HOKLAS-5 PeeWee 及雙軸測斜儀',
                '📐 Step 1 · Borehole Verticality Calculator · HOKLAS-5 PeeWee & Biaxial Inclinometer'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tx(
                '支援 HOKLAS-5 PeeWee / Devishot 傾角方位角積分法，以及按 Δdepth / Lg 精準比例換算之雙軸測斜管模式。',
                'Supports HOKLAS-5 PeeWee / Devishot inclination-azimuth survey and Biaxial Inclinometer scaled by Δdepth / Lg.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={resetCurrentMode}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設範例', 'Reset')}
          </button>
        </div>

        {/* Survey Mode Toggle + Tolerance Bar */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-3.5 space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl bg-white border border-slate-200 p-1 font-extrabold">
            <button
              type="button"
              onClick={() => setSurveyMode('peewee')}
              className={`rounded-lg py-2 px-3 transition cursor-pointer ${
                isPeewee ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tx('PeeWee / Devishot 鑽孔測斜模式 · HOKLAS-5', 'PeeWee / Devishot Borehole Mode · HOKLAS-5')}
            </button>
            <button
              type="button"
              onClick={() => setSurveyMode('biaxial')}
              className={`rounded-lg py-2 px-3 transition cursor-pointer ${
                !isPeewee ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tx('雙軸測斜管模式 · A0/A180 & B0/B180', 'Biaxial Casing Mode · A0/A180 & B0/B180')}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-700">{tx('驗收容許傾斜度：', 'Tolerance:')}</span>
              {[75, 100, 120, 200].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimitDenom(n)}
                  className={`rounded-lg px-2.5 py-1 font-mono font-extrabold cursor-pointer ${
                    limitDenom === n ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  ≤ 1:{n}
                </button>
              ))}
            </div>

            {!isPeewee && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">{tx('探頭軸距 Lg：', 'Gauge Lg:')}</span>
                {[0.5, 1.0].map((lg) => (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => setGaugeLengthM(lg)}
                    className={`rounded-lg px-2 py-1 font-mono font-extrabold cursor-pointer ${
                      Math.abs(gaugeLengthM - lg) < 0.01
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {lg.toFixed(1)} m
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-3.5">
            <div className="text-xs font-bold text-slate-600">{tx('最大合成偏移 R_max', 'Max Resultant Drift R_max')}</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{maxDriftMm.toFixed(2)} mm</div>
            <div className="text-[11px] font-semibold text-slate-600">
              {isPeewee
                ? `ΔE=${(computedPeewee[computedPeewee.length - 1]?.cumEMm ?? 0).toFixed(1)} · ΔN=${(computedPeewee[computedPeewee.length - 1]?.cumNMm ?? 0).toFixed(1)} mm`
                : `ΣA=${(computedBiaxial[computedBiaxial.length - 1]?.cumA ?? 0).toFixed(1)} · ΣB=${(computedBiaxial[computedBiaxial.length - 1]?.cumB ?? 0).toFixed(1)} mm`}
            </div>
          </div>

          <div className={`rounded-2xl border p-3.5 ${isPass ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
            <div className="text-xs font-bold text-slate-600">{tx('最不利深度垂直度 1 : N', 'Governing Verticality 1 : N')}</div>
            <div className={`mt-1 font-mono text-2xl font-extrabold ${isPass ? 'text-emerald-800' : 'text-rose-800'}`}>
              1 : {overallN > 5000 ? '∞' : Math.round(overallN)}
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              @{criticalStation?.d.toFixed(1) ?? '0'}m · ≤ 1:{limitDenom} → {isPass ? '✓ PASS' : '✗ REVIEW'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-bold text-slate-600">
              {isPeewee ? tx('測斜總深度及測點', 'Surveyed Depth & Stations') : tx('Checksum 恆定性核查', 'Checksum Constancy Check')}
            </div>
            {isPeewee ? (
              <>
                <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900">{maxDepthM.toFixed(1)} m</div>
                <div className="text-[11px] text-slate-500">{peeweeRows.length} stations · HOKLAS-5</div>
              </>
            ) : (
              <>
                <div className={`mt-1 flex items-center gap-1 font-mono text-lg font-extrabold ${anyChkWarn ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {anyChkWarn ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{anyChkWarn ? tx('漂移超差 >0.30mm', 'Drift > 0.30mm') : tx('全段恆定 OK', 'Consistent OK')}</span>
                </div>
                <div className="text-[11px] text-slate-500">{maxDepthM.toFixed(1)} m · Lg = {gaugeLengthM.toFixed(1)} m</div>
              </>
            )}
          </div>
        </div>

        {/* Station Table */}
        {isPeewee ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 whitespace-nowrap">
                <tr>
                  <th className="px-2.5 py-2">Depth · m</th>
                  <th className="px-2 py-2">ΔL · m</th>
                  <th className="px-2 py-2">{tx('傾角 I · °', 'Inclination I · °')}</th>
                  <th className="px-2 py-2">{tx('方位角 α · °', 'Azimuth α · °')}</th>
                  <th className="px-2 py-2">ΣΔE · mm</th>
                  <th className="px-2 py-2">ΣΔN · mm</th>
                  <th className="px-2 py-2">R · mm</th>
                  <th className="px-2.5 py-2">1 : N @ d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {computedPeewee.map((r, i) => (
                  <tr key={i} className={r.ratioN < limitDenom ? 'bg-rose-50/55' : 'hover:bg-slate-50/70'}>
                    <td className="px-2.5 py-1.5">
                      <input
                        type="number"
                        step="0.5"
                        value={r.depthM}
                        onChange={(e) => setPeeweeRows((p) => p.map((x, idx) => (idx === i ? { ...x, depthM: e.target.value } : x)))}
                        className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{r.deltaLM.toFixed(1)}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={r.inclDeg}
                        onChange={(e) => setPeeweeRows((p) => p.map((x, idx) => (idx === i ? { ...x, inclDeg: e.target.value } : x)))}
                        className="w-18 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="1"
                        value={r.azimDeg}
                        onChange={(e) => setPeeweeRows((p) => p.map((x, idx) => (idx === i ? { ...x, azimDeg: e.target.value } : x)))}
                        className="w-18 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">{r.cumEMm.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-slate-700">{r.cumNMm.toFixed(2)}</td>
                    <td className="px-2 py-1.5 font-extrabold text-brand-deep">
                      {r.resMm.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">@{r.bearingDeg.toFixed(0)}°</span>
                    </td>
                    <td className={`px-2.5 py-1.5 font-extrabold ${r.ratioN >= limitDenom ? 'text-emerald-700' : 'text-rose-700'}`}>
                      1:{r.ratioN > 5000 ? '∞' : Math.round(r.ratioN)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 whitespace-nowrap">
                <tr>
                  <th className="px-2 py-2">Depth · m</th>
                  <th className="px-2 py-2">A0</th>
                  <th className="px-2 py-2">A180</th>
                  <th className="px-2 py-2">B0</th>
                  <th className="px-2 py-2">B180</th>
                  <th className="px-2 py-2">Chk A / B</th>
                  <th className="px-2 py-2">R · mm</th>
                  <th className="px-2 py-2">1 : N @ d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {computedBiaxial.map((r, i) => (
                  <tr key={i} className={r.chkWarn ? 'bg-amber-50/70' : r.ratioN < limitDenom ? 'bg-rose-50/55' : 'hover:bg-slate-50/70'}>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.5"
                        value={r.depthM}
                        onChange={(e) => setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, depthM: e.target.value } : x)))}
                        className="w-15 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.a0} onChange={(e) => setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, a0: e.target.value } : x)))} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.a180} onChange={(e) => setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, a180: e.target.value } : x)))} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.b0} onChange={(e) => setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, b0: e.target.value } : x)))} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.b180} onChange={(e) => setBiaxialRows((p) => p.map((x, idx) => (idx === i ? { ...x, b180: e.target.value } : x)))} className="w-15 rounded border border-slate-200 bg-white px-1 py-1 text-xs" /></td>
                    <td className={`px-2 py-1.5 text-[11px] font-bold ${r.chkWarn ? 'text-rose-700' : 'text-slate-600'}`}>
                      {r.chkA.toFixed(2)} / {r.chkB.toFixed(2)} {r.chkWarn ? '⚠️' : ''}
                    </td>
                    <td className="px-2 py-1.5 font-extrabold text-brand-deep">{r.resMm.toFixed(2)}</td>
                    <td className={`px-2 py-1.5 font-extrabold ${r.ratioN >= limitDenom ? 'text-emerald-700' : 'text-rose-700'}`}>
                      1:{r.ratioN > 5000 ? '∞' : Math.round(r.ratioN)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (isPeewee) {
              setPeeweeRows([...peeweeRows, { depthM: (maxDepthM + 2).toFixed(1), inclDeg: '0.40', azimDeg: '134' }]);
            } else {
              setBiaxialRows([...biaxialRows, { depthM: (maxDepthM + 2).toFixed(1), a0: '1.35', a180: '-1.27', b0: '0.90', b180: '-0.82' }]);
            }
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> {tx('新增深度測點', 'Add Depth Station')}
        </button>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="VC"
          standardRef={
            isPeewee
              ? 'HOKLAS-5 Borehole Deviation · PeeWee / Devishot'
              : 'Biaxial Casing Inclinometer · BD CoP / CEDD GS'
          }
          formulaText={
            isPeewee
              ? 'ΔE = ΔL·sin(I)·sin(α) ｜ ΔN = ΔL·sin(I)·cos(α) ｜ R_d = √((ΣΔE)² + (ΣΔN)²) ｜ 1:N = (d × 1000) / R_d'
              : 'incA = ((A0 − A180)/2) × (Δd / Lg) ｜ R_d = √((ΣincA)² + (ΣincB)²) ｜ 1:N = (d × 1000) / R_d'
          }
          copyText={copySummary}
          structuredData={vcPayload}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            {
              title: tx('核對孔口基準方位及探頭溫度平衡', 'Verify Collar Azimuth & Thermal Equilibrium'),
              detail: tx(
                '以校準指南針 LT-CP-01~03 核對孔口基準方位角；將 PeeWee / Devishot 或雙軸測斜探頭下放至孔底靜置最少 10 分鐘以達致溫度平衡。',
                'Check collar reference azimuth with calibrated compass LT-CP-01~03; lower PeeWee / Devishot or biaxial probe to bottom and wait ≥ 10 min for thermal equilibrium.'
              ),
            },
            {
              title: tx('按固定深度間距分段量測傾角及方位', 'Record Station Readings at Fixed Depth Intervals'),
              detail: tx(
                'PeeWee 模式逐段記錄深度 d、傾角 I 及磁方位角 α；雙軸測斜管模式須完成 A0/B0 正測及旋轉 180° 之 A180/B180 反測以抵銷零點偏差。',
                'In PeeWee mode record station depth d, inclination I, and azimuth α; in biaxial mode record both 0° and 180° passes to cancel sensor zero-bias.'
              ),
            },
            {
              title: tx('按 Δdepth / Lg 積分計算各深度實際 1 : N', 'Integrate Incremental Drift & Evaluate Per-Depth 1 : N'),
              detail: tx(
                '雙軸模式必須將每 0.5 m 軸距讀數乘以測點間距比例 Δdepth / Lg 並核對 Checksum 恆定性；各站垂直度須以該站深度 d 除以該站偏移 R_d 判定。',
                'Multiply half-difference readings by Δdepth / Lg, verify checksum constancy across depth, and evaluate 1 : N = (d × 1000) / R_d at every station.'
              ),
            },
          ]}
          pitfalls={[
            tx(
              '若測點間距為 2.0 m 而探頭軸距 Lg 為 0.5 m，單段位移必須乘以 4 倍比例係數 Δdepth / Lg，切勿直接累加原始讀數導致偏移低估 4 倍。',
              'When station spacing is 2.0 m with a 0.5 m gauge length probe, multiply each reading by Δdepth / Lg = 4 — never sum unscaled readings directly.'
            ),
            tx(
              'BD CoP Table 7.4 規定嵌岩鋼工字樁及 Mini-pile 垂直度須 ≤ 1:100，大型鑽孔樁及壁樁一般為 ≤ 1:75。',
              'BD CoP Table 7.4 specifies ≤ 1:100 for socketed H-piles and mini-piles, and ≤ 1:75 for large-diameter bored piles.'
            ),
          ]}
        />
      </div>
    </div>
  );
};
