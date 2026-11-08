import React, { useState } from 'react';
import { usePrefs } from '../../prefs';
import { getHkTodayIso } from '../../utils';
import { ToolGuideCard } from './ToolGuideCard';

export const KodenVerticalityTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [pileDiaMm, setPileDiaMm] = useState('2500');
  const [depthM, setDepthM] = useState('42.5');
  const [dxMm, setDxMm] = useState('115');
  const [dyMm, setDyMm] = useState('-85');
  const [specDenom, setSpecDenom] = useState('75');

  const hMm = Math.max(100, (parseFloat(depthM) || 1) * 1000);
  const dx = parseFloat(dxMm) || 0;
  const dy = parseFloat(dyMm) || 0;
  const offsetMm = Math.sqrt(dx * dx + dy * dy);
  const ratioDenom = offsetMm > 0.01 ? hMm / offsetMm : 9999;
  const vertPct = (offsetMm / hMm) * 100;
  const limitDenom = parseFloat(specDenom) || 100;
  const isPass = ratioDenom >= limitDenom;

  const copySummary = `[Labtech Calc — Koden Verticality (HKCI TM3)]
Pile Dia D = ${pileDiaMm} mm ｜ Depth H = ${depthM} m
Offset ΔX = ${dx} mm, ΔY = ${dy} mm → Resultant Offset e = ${offsetMm.toFixed(1)} mm
Verticality = 1 : ${ratioDenom.toFixed(0)} (${vertPct.toFixed(3)}%) → ${isPass ? `PASS (≤ 1:${limitDenom})` : `EXCEED (Spec 1:${limitDenom})`}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx('📡 Koden — Borehole Verticality & Offset 自動計算工具', '📡 Koden — Borehole Verticality & Offset Calculator')}
            </h2>
            <p className="text-xs text-slate-500">
              {tx('輸入樁深 H 及 X-X / Y-Y 方向偏移量，自動計算合成偏移 Resultant Offset e (mm) 與垂直度 Verticality 1:N。', 'Enter depth H and X-X / Y-Y offsets to calculate Resultant Offset e (mm) and Verticality 1:N.')}
            </p>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            <button type="button" onClick={() => setSpecDenom('75')} className={`rounded-xl px-2.5 py-1.5 font-extrabold cursor-pointer ${specDenom === '75' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>CEDD/BD 1:75</button>
            <button type="button" onClick={() => setSpecDenom('100')} className={`rounded-xl px-2.5 py-1.5 font-extrabold cursor-pointer ${specDenom === '100' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Housing 1:100</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Pile Dia D (mm)</label><input type="number" value={pileDiaMm} onChange={(e) => setPileDiaMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Depth H (m)</label><input type="number" step="0.1" value={depthM} onChange={(e) => setDepthM(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Offset ΔX (mm)</label><input type="number" value={dxMm} onChange={(e) => setDxMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Offset ΔY (mm)</label><input type="number" value={dyMm} onChange={(e) => setDyMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Spec Limit (1:N)</label><select value={specDenom} onChange={(e) => setSpecDenom(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm font-bold"><option value="75">1 : 75</option><option value="100">1 : 100</option><option value="120">1 : 120</option><option value="150">1 : 150</option></select></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl p-4 border ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}><div className="text-xs font-bold text-slate-600">Measured Verticality</div><div className={`mt-1 font-mono text-2xl font-extrabold ${isPass ? 'text-emerald-700' : 'text-rose-700'}`}>1 : {ratioDenom > 5000 ? '∞' : ratioDenom.toFixed(0)}</div><div className="text-[11px] font-bold">{isPass ? `✓ PASS (Within 1:${limitDenom})` : `⚠️ EXCEED SPEC (1:${limitDenom})`}</div></div>
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-4"><div className="text-xs font-bold text-slate-600">Resultant Offset (e)</div><div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{offsetMm.toFixed(1)} mm</div><div className="text-[11px] text-slate-500">√(ΔX² + ΔY²)</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold text-slate-600">Inclination (%)</div><div className="mt-1 font-mono text-2xl font-extrabold text-slate-900">{vertPct.toFixed(3)} %</div><div className="text-[11px] text-slate-500">Allowable ≤ {(100 / limitDenom).toFixed(2)}%</div></div>
        </div>
      </div>
      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="KD"
          standardRef="HKCI TM3 Issue 2 (2024) · STP02-FDT-TM3 rev 7"
          formulaText="Resultant Offset e = √(ΔX² + ΔY²) ｜ Verticality = 1 : (H_mm / e) ｜ Inclination (%) = (e / H_mm) × 100%"
          copyText={copySummary}
          structuredData={{
            kind: 'KD',
            pileDiaMm: parseFloat(pileDiaMm) || 2500,
            depthM: parseFloat(depthM) || 42.5,
            dxMm: dx,
            dyMm: dy,
            offsetMm,
            ratioDenom,
            vertPct,
            limitDenom,
            isPass,
          }}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            { title: tx('調平絞車架及對準護筒中心', 'Level Winch & Center on Casing'), detail: tx('使用 Spirit Level 調平絞車架，將超聲波探頭對準 Casing 十字中心，並核對 X-X / Y-Y 方位一致。', 'Level the winch frame with a spirit level, center the sensor over the casing crosshairs, and verify X-X / Y-Y orientation.') },
            { title: tx('執行聲波波速校準', 'Wave Speed Calibration'), detail: tx('先於已知內徑之 Steel Casing 區段校對聲波波速，確保 Koden 圖譜顯示直徑與實測內徑相符。', 'Calibrate acoustic wave speed inside the steel casing of known internal diameter before profiling.') },
            { title: tx('量度圖譜偏移量 ΔX 及 ΔY', 'Measure ΔX & ΔY from Chart'), detail: tx('從 Koden 圖譜量度樁頂至樁底中心線於 X-X 及 Y-Y 方向之偏移量 (mm)，輸入上方欄位即可計算合成垂直度。', 'Measure top-to-toe centerline offsets ΔX and ΔY (mm) from the Koden profile chart to compute resultant verticality.') },
          ]}
          pitfalls={[
            tx('泥漿比重過高或含有大量氣泡會散射超聲波訊號，測試前須確認已完成清底循環（Desanding）並靜置。', 'High slurry density or air bubbles scatter ultrasonic signals—ensure proper desanding before testing.'),
            tx('驗收須以合成偏移 √(ΔX²+ΔY²) 計算之 Resultant Verticality 為準（CEDD/BD 一般為 1:75；Housing 常要求 1:100）。', 'Always check resultant √(ΔX²+ΔY²) verticality rather than single-axis offset alone.'),
          ]}
        />
      </div>
    </div>
  );
};

export const FlowConeCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [waterSec, setWaterSec] = useState('8.0');
  const [t1Sec, setT1Sec] = useState('16.4');
  const [t2Sec, setT2Sec] = useState('16.8');
  const [groutTemp, setGroutTemp] = useState('26.5');
  const [cementBrand, setCementBrand] = useState('Green Island OPC (BS EN 197-1 CEM I 52.5N)');
  const [cementQty, setCementQty] = useState('50 kg (1 Bag)');
  const [admixtureBrand, setAdmixtureBrand] = useState('Sika Grout Aid / Cebex 100');
  const [admixtureQty, setAdmixtureQty] = useState('0.225 kg');
  const [waterSource, setWaterSource] = useState('Mains Potable Water (WSD)');
  const [waterQty, setWaterQty] = useState('21.0 L');
  const [wcRatio, setWcRatio] = useState('0.42');
  const [ambientTempText, setAmbientTempText] = useState('26.5 °C');
  const [waterTempText, setWaterTempText] = useState('25.3 °C');
  const [testDateIso, setTestDateIso] = useState(() => getHkTodayIso());
  const [batchNo, setBatchNo] = useState('B-01');
  const [sampleId, setSampleId] = useState('FC-01');
  const [timeWaterAdded, setTimeWaterAdded] = useState('09:45');
  const [timeDrawingGrout, setTimeDrawingGrout] = useState('09:52');

  const wNum = parseFloat(waterSec) || 0;
  const waterOk = wNum >= 7.8 && wNum <= 8.2;
  const n1 = parseFloat(t1Sec) || 0;
  const n2 = parseFloat(t2Sec) || 0;
  const avgSec = (n1 + n2) / 2;
  const diffSec = Math.abs(n1 - n2);
  const repeatOk = diffSec <= 1.8;

  const copySummary = `[Labtech Calc — Flow Cone Efflux Time (ASTM C939)]
Water Check (1725 mL) = ${wNum.toFixed(1)} s (${waterOk ? 'OK 8.0±0.2s' : 'RE-CHECK'}) ｜ Grout Temp = ${groutTemp} °C
Efflux T1 = ${n1.toFixed(1)} s, T2 = ${n2.toFixed(1)} s → Mean Efflux Time = ${avgSec.toFixed(1)} s (Diff ${diffSec.toFixed(1)}s ${repeatOk ? 'Repeatability OK' : 'RE-TEST'})`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            {tx('⏱️ Flow Cone — Efflux Time 自動計算工具 (ASTM C939)', '⏱️ Flow Cone — Efflux Time & Repeatability Calculator (ASTM C939)')}
          </h2>
          <p className="text-xs text-slate-500">
            {tx('自動核對 1725 mL 清水校準時間 (8.0±0.2s)，並計算兩次測試 T1/T2 之平均流秒及重現性差值。', 'Checks 1725 mL water calibration (8.0±0.2s), computes mean efflux time, and verifies ASTM C939 repeatability.')}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Water Check (s)</label><input type="number" step="0.1" value={waterSec} onChange={(e) => setWaterSec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /><div className={`mt-1 text-[10px] font-bold ${waterOk ? 'text-emerald-700' : 'text-rose-600'}`}>{waterOk ? '✓ OK (8.0 ± 0.2 s)' : tx('⚠️ 超出 7.8–8.2s，請檢查流嘴', '⚠️ Out of 7.8–8.2s! Check nozzle')}</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Grout Run 1 T1 (s)</label><input type="number" step="0.1" value={t1Sec} onChange={(e) => setT1Sec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Grout Run 2 T2 (s)</label><input type="number" step="0.1" value={t2Sec} onChange={(e) => setT2Sec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Grout Temp (°C)</label><input type="number" step="0.1" value={groutTemp} onChange={(e) => setGroutTemp(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-4"><div className="text-xs font-bold text-slate-600">Mean Efflux Time</div><div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{avgSec.toFixed(1)} s</div><div className="text-[11px] text-slate-500">Nearest 0.1 s</div></div>
          <div className={`rounded-2xl p-4 border ${repeatOk ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}><div className="text-xs font-bold text-slate-600">Repeatability |T1 - T2|</div><div className={`mt-1 font-mono text-2xl font-extrabold ${repeatOk ? 'text-emerald-700' : 'text-rose-700'}`}>{diffSec.toFixed(1)} s</div><div className="text-[11px] font-bold">{repeatOk ? '✓ ASTM C939 OK (≤1.8s)' : tx('⚠️ 差值超出 1.8s，須重測', '⚠️ Diff > 1.8s, run 3rd trial')}</div></div>
          <div className={`rounded-2xl p-4 border ${waterOk ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}><div className="text-xs font-bold text-slate-600">Cone Water Calibration</div><div className="mt-1 font-mono text-xl font-extrabold text-slate-900">{waterOk ? '✓ Nozzle OK' : '⚠️ Clean Nozzle'}</div><div className="text-[11px] text-slate-500">Temp: {groutTemp} °C</div></div>
        </div>

        {/* Editable Sample Information (FST05-GTT-C939) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5 text-xs">
          <div className="font-extrabold text-slate-900">
            🧪 Sample Information (FST05 Worksheet Fields — Editable before Gen)
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
            <div><label className="font-bold text-slate-600">Batch No.</label><input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Sample ID</label><input value={sampleId} onChange={(e) => setSampleId(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Time Water Added</label><input value={timeWaterAdded} onChange={(e) => setTimeWaterAdded(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Time Drawing Grout</label><input value={timeDrawingGrout} onChange={(e) => setTimeDrawingGrout(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
          </div>
        </div>
      </div>
      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="FC"
          standardRef="ASTM C939 · STP05-GTT-C939 rev 2"
          formulaText="Water Check = 8.0 ± 0.2 s (1725 mL) ｜ Mean = (T1 + T2) / 2 ｜ |T1 - T2| ≤ 1.8 s"
          copyText={copySummary}
          structuredData={{
            kind: 'FC',
            waterCheckSec: wNum,
            waterOk,
            groutTempC: parseFloat(groutTemp) || 26.5,
            t1Sec: n1,
            t2Sec: n2,
            meanSec: avgSec,
            diffSec,
            repeatOk,
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
          }}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            { title: tx('測試前執行清水校準 Water Check', 'Pre-test Water Check'), detail: tx('調平 Flow Cone 並封閉底口，注入 1725 mL 清水後開啟底塞並同步啟動秒錶，計時至連續水流首次中斷（First Break），標準須為 8.0 ± 0.2 s。', 'Level the cone, stopper the discharge tube, fill 1725 mL water, and time to first break of continuous flow (must be 8.0 ± 0.2 s).') },
            { title: tx('預濕內壁及注入漿體至針尖', 'Pre-wet Cone & Fill to Point Gauge'), detail: tx('測試前 1 min 以清水潤濕 Flow Cone 內壁並排走積水；封閉底口後經篩網注入新鮮 Grout 直至液面接觸 Point Gauge 針尖。', 'Moisten inside surface 1 min prior and drain excess water; pour grout through screen until it touches the Point Gauge.') },
            { title: tx('開啟底塞及於 First Break 停錶', 'Release & Stop at First Break'), detail: tx('取樣後 1 min 內開啟底塞並同步計時，當流嘴首次出現斷流透光（First Break）即停止秒錶，連續進行兩次測試取平均值。', 'Open stopper within 1 min of sampling; stop watch at the first break in continuous flow from discharge tube. Run twice.') },
          ]}
          pitfalls={[
            tx('停錶時間以流嘴「首次斷流透光 (First Break)」為準，切勿等待殘餘漿滴流盡方才停錶。', 'Stop timing at the FIRST break in continuous stream—do NOT wait for final droplets!'),
            tx('進行第二次測試 T2 前，必須徹底清洗 Flow Cone 內壁殘留漿體並瀝乾積水，以免影響流速。', 'Wash the cone thoroughly between T1 and T2 so residual grout does not slow down the second run.'),
          ]}
        />
      </div>
    </div>
  );
};

export const PointLoadCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [mode, setMode] = useState<'diametral' | 'axial'>('diametral');
  const [dMm, setDMm] = useState('52.0');
  const [wMm, setWMm] = useState('52.0');
  const [loadKn, setLoadKn] = useState('11.8');
  const [failSec, setFailSec] = useState('24');

  const d = Math.max(1, parseFloat(dMm) || 50);
  const w = Math.max(1, parseFloat(wMm) || 50);
  const pN = Math.max(0, (parseFloat(loadKn) || 0) * 1000);
  const de2 = mode === 'diametral' ? d * d : (4 * w * d) / Math.PI;
  const de = Math.sqrt(de2);
  const isUncorr = pN / de2;
  const fFactor = Math.pow(de / 50, 0.45);
  const is50 = isUncorr * fFactor;
  const estUcs = is50 * 22;
  const secNum = parseFloat(failSec) || 0;
  const timeOk = secNum >= 10 && secNum <= 60;

  const copySummary = `[Labtech Calc — Point Load Test (ASTM D5731)]
Mode = ${mode === 'diametral' ? 'Diametral' : 'Axial / Block'} ｜ D = ${d} mm${mode !== 'diametral' ? `, W = ${w} mm` : ''}
De = ${de.toFixed(2)} mm ｜ Failure Load P = ${loadKn} kN (${failSec}s)
Uncorrected Is = ${isUncorr.toFixed(2)} MPa ｜ F = ${fFactor.toFixed(3)} → Is(50) = ${is50.toFixed(2)} MPa (Est. UCS ≈ ${estUcs.toFixed(0)} MPa)`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx('🪨 Point Load — Is(50) & UCS 自動計算工具 (ASTM D5731)', '🪨 Point Load — Is(50) & UCS Calculator (ASTM D5731)')}
            </h2>
            <p className="text-xs text-slate-500">
              {tx('支援 Diametral 及 Axial / Block 測試，自動計算等效直徑 De、修正因子 F 及 Is(50)。', 'Supports Diametral and Axial / Block tests; auto-computes De, size factor F, and Is(50).')}
            </p>
          </div>
          <div className="flex gap-1.5 text-xs">
            <button type="button" onClick={() => setMode('diametral')} className={`rounded-xl px-3 py-1.5 font-bold cursor-pointer ${mode === 'diametral' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Diametral</button>
            <button type="button" onClick={() => setMode('axial')} className={`rounded-xl px-3 py-1.5 font-bold cursor-pointer ${mode === 'axial' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Axial / Block</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Platen Dist. D (mm)</label><input type="number" step="0.1" value={dMm} onChange={(e) => setDMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">{mode === 'diametral' ? 'Core Dia Ref (mm)' : 'Specimen Width W (mm)'}</label><input type="number" step="0.1" value={wMm} disabled={mode === 'diametral'} onChange={(e) => setWMm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold disabled:opacity-50" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Failure Load P (kN)</label><input type="number" step="0.05" value={loadKn} onChange={(e) => setLoadKn(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70"><label className="font-bold text-slate-600">Time to Failure (s)</label><input type="number" value={failSec} onChange={(e) => setFailSec(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /><div className={`mt-1 text-[10px] font-bold ${timeOk ? 'text-emerald-700' : 'text-rose-600'}`}>{timeOk ? '✓ OK (10–60 s)' : tx('⚠️ 破壞時間須控制於 10–60s 內', '⚠️ Fail within 10–60s')}</div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-4"><div className="text-xs font-bold text-slate-600">Point Load Index Is(50)</div><div className="mt-1 font-mono text-2xl font-extrabold text-brand-deep">{is50.toFixed(2)} MPa</div><div className="text-[11px] font-bold text-violet-800">{is50 >= 3 ? '✓ BD Cat 1(a) (≥3 MPa)' : is50 >= 2 ? '✓ BD Cat 1(b) (≥2 MPa)' : is50 >= 1 ? '✓ BD Cat 1(c) (≥1 MPa)' : '⚠️ < 1.0 MPa (Below Cat 1c)'}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold text-slate-600">Equivalent Dia De &amp; Is</div><div className="mt-1 font-mono text-xl font-extrabold text-slate-900">De = {de.toFixed(1)} mm</div><div className="text-[11px] text-slate-500">F = {fFactor.toFixed(3)} · Is = {isUncorr.toFixed(2)} MPa</div></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="text-xs font-bold text-slate-600">Est. UCS (≈ 22 × Is50)</div><div className="mt-1 font-mono text-2xl font-extrabold text-emerald-800">≈ {estUcs.toFixed(0)} MPa</div><div className="text-[11px] text-slate-500">{is50 >= 4 ? 'Strong / Very Strong Rock' : is50 >= 1 ? 'Medium Strong Rock' : 'Weak Rock'}</div></div>
        </div>
      </div>
      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="PO"
          standardRef="ASTM D5731 · STP06-RKT-D5731 rev 2"
          formulaText="De² = D² (Diametral) or 4WD/π (Axial) ｜ Is = P(N) / De² ｜ F = (De / 50)^0.45 ｜ Is(50) = F × Is"
          copyText={copySummary}
          structuredData={{
            kind: 'PO',
            mode,
            dMm: d,
            wMm: w,
            loadKn: parseFloat(loadKn) || 0,
            failSec: secNum,
            deMm: de,
            isUncorrMpa: isUncorr,
            fFactor,
            is50Mpa: is50,
            estUcsMpa: estUcs,
            timeOk,
          }}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            { title: tx('使用 Digital Caliper 量度尺寸及核對長徑比', 'Measure with Caliper & Check L/D'), detail: tx('使用有效校準之 Digital Caliper 量度加載點間距 D（及寬度 W）；Diametral 測試試件長度 L 必須 > 1.0D（壓頭距兩端 ≥ 0.5D）。', 'Measure D (and W) with calibrated digital caliper; for Diametral tests ensure core length L > 1.0D.') },
            { title: tx('穩定加載於 10–60s 內破壞', 'Steady Loading to Fail in 10–60s'), detail: tx('對準上下 Conical Platens 夾持岩芯，以穩定速率加壓使試件於 10 至 60 秒內破壞，記錄最大破壞荷載 P (kN)。', 'Align conical platens, pump steadily so failure occurs within 10–60 seconds, and record peak load P (kN).') },
            { title: tx('核對有效破壞模式 (Failure Mode)', 'Verify Valid Failure Mode'), detail: tx('破裂面必須完整貫穿試件上下加載點；若僅出現局部邊角崩裂（Chipping），該次測試屬無效（Invalid），須作廢重測。', 'Fracture must pass completely through the specimen between platens; local chipping only is invalid and must be rejected.') },
          ]}
          pitfalls={[
            tx('公式計算時須將 P (kN) 乘以 1000 轉換為 N 後除以 mm²（本計算工具已自動轉換單位）。', 'Remember P in kN must be multiplied by 1000 to N before dividing by mm² (handled automatically here).'),
            tx('若試件沿既有天然節理面（Joint Plane）滑移破壞，須於 Worksheet 明確註明「Failure along pre-existing joint」。', 'If failure occurs along a pre-existing weakness plane/joint, note it explicitly on the worksheet.'),
          ]}
        />
      </div>
    </div>
  );
};
