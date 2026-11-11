import React from 'react';
import {
  HoklasWorksheetPayload,
  HoklasWorksheetEquipmentRow,
  HoklasWorksheetRow,
} from '../utils/limsProcessTools';
import {
  OfficialTemplateMeta,
  StructuredCalcPayload,
} from '../utils/completedWorksheetGenerator';
import {
  OfficialFormSiteState,
  resolveSonicWorksheetPayload,
} from './OfficialWorksheetView';

export interface OfficialFormalReportViewProps {
  stpCode: string;
  baseWorksheet: HoklasWorksheetPayload;
  templateMeta: OfficialTemplateMeta;
  siteForm: OfficialFormSiteState;
  setSiteForm: React.Dispatch<React.SetStateAction<OfficialFormSiteState>>;
  eqRows: HoklasWorksheetEquipmentRow[];
  measurementRows: HoklasWorksheetRow[];
  activeStructured?: StructuredCalcPayload;
  activeOperator: string;
  activeSignatory: string;
  signatoryEndorsed: boolean;
  operatorSigDataUrl: string | null;
  signatorySigDataUrl: string | null;
}

const REPORT_FORM_CODES: Record<string, string> = {
  FC: 'GTT-C939-RT',
  BL: 'GTT-C940-RT',
  KD: 'FDT-TM3-RT',
  SO: 'FDT-D6760-RT',
  PO: 'RKT-D5731-RT',
  PLT: 'FDT-PLT-RT-1-261028',
  VC: 'INC-RT',
};

export const OfficialFormalReportView: React.FC<OfficialFormalReportViewProps> = ({
  stpCode,
  baseWorksheet,
  templateMeta,
  siteForm,
  setSiteForm,
  eqRows,
  measurementRows,
  activeStructured,
  activeOperator,
  activeSignatory,
  signatoryEndorsed,
  operatorSigDataUrl,
  signatorySigDataUrl,
}) => {
  const code = stpCode.toUpperCase();
  const isHoklasAccredited = templateMeta.accredited && code !== 'PLT' && code !== 'VC';
  const reportFormCode = templateMeta.reportCode || REPORT_FORM_CODES[code] || `${code}-RT`;
  const dateOnly = baseWorksheet.testedAt.slice(0, 10);
  const sonicData = resolveSonicWorksheetPayload(code, activeStructured, measurementRows, baseWorksheet.pass);

  return (
    <div className="light-island mx-auto max-w-[210mm] bg-white p-5 sm:p-7 text-slate-950 font-sans text-[11px] leading-snug border-2 border-slate-900 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* Official LabTech Letterhead */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-950 pb-3 mb-2">
        <div className="flex items-start gap-3">
          <div className="border-2 border-slate-950 px-2.5 py-1.5 text-center shrink-0 bg-white">
            <div className="text-lg font-black tracking-tight text-slate-950 leading-none">
              L<span className="text-amber-600">a</span>BTECH
            </div>
            <div className="text-[7px] font-bold uppercase tracking-widest text-slate-600 mt-0.5">
              Testing Limited
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-slate-950">
              LabTech Testing Limited
            </div>
            <div className="text-[9.5px] font-semibold text-slate-800 leading-tight mt-0.5">
              BLK A &amp; B, 8/F., HONG KONG SPINNERS INDUSTRIAL BUILDING, PHASE VI,
              <br />
              481-483 CASTLE PEAK ROAD, KOWLOON, HONG KONG.
              <br />
              TEL: 2371 0008 &nbsp;&nbsp; FAX: 2744 1037 &nbsp;&nbsp; E-Mail: info@lab-tech.com.hk
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="border-2 border-slate-950 px-2.5 py-1 text-center bg-white min-w-[138px]">
            <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-700">
              {isHoklasAccredited ? 'HOKLAS Accredited' : 'LABTECH CONTROLLED'}
            </div>
            <div className="text-xs font-black tracking-tight text-slate-950 mt-0.5">
              {isHoklasAccredited ? 'HOKLAS 298' : 'NON-HOKLAS SCOPE'}
            </div>
            <div className="text-[8px] font-mono font-bold text-slate-700 border-t border-slate-400 pt-0.5 mt-0.5">
              Form: {reportFormCode}
            </div>
          </div>
        </div>
      </div>

      {/* Report Banner */}
      <div className="border-2 border-slate-950 bg-slate-100 py-1.5 px-3 text-center mb-2">
        <div className="text-xs font-black tracking-[0.2em] uppercase text-slate-950">
          {isHoklasAccredited
            ? 'HOKLAS ENDORSED TEST REPORT'
            : 'OFFICIAL FIELD & LABORATORY TEST REPORT'}
        </div>
        <div className="text-[11px] font-extrabold text-slate-900 mt-0.5">
          {templateMeta.formalReportTitleEn}
        </div>
        <div className="text-[9.5px] font-mono font-bold text-slate-700">
          Test Method: {templateMeta.testStandard} &nbsp;|&nbsp; LabTech In-House Procedure: {templateMeta.stpDocRef}
        </div>
      </div>

      {/* Section I: Customer, Contract & Sample Particulars */}
      <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px] mb-2">
        <tbody>
          <tr className="bg-slate-100">
            <td className="border border-slate-950 px-2 py-1 font-bold w-[18%]">Job Ref. No.:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-black w-[32%]">
              <input
                value={siteForm.jobRefNo ?? baseWorksheet.reportRefNo}
                onChange={(e) => setSiteForm((s) => ({ ...s, jobRefNo: e.target.value }))}
                className="w-full bg-transparent font-mono font-black outline-none"
              />
            </td>
            <td className="border border-slate-950 px-2 py-1 font-bold w-[18%]">Date of Issue:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-bold w-[32%]">
              {dateOnly} &nbsp;(Page 1 of 1)
            </td>
          </tr>
          <tr>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Client *:</td>
            <td className="border border-slate-950 px-2 py-1">
              <input
                value={siteForm.clientName}
                onChange={(e) => setSiteForm((s) => ({ ...s, clientName: e.target.value }))}
                className="w-full bg-transparent font-semibold outline-none"
              />
            </td>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Works Order No. *:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
              {siteForm.worksOrderNo?.trim() || '—'}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Project / Contract *:</td>
            <td colSpan={3} className="border border-slate-950 px-2 py-1">
              <input
                value={siteForm.projectTitle}
                onChange={(e) => setSiteForm((s) => ({ ...s, projectTitle: e.target.value }))}
                className="w-full bg-transparent font-semibold outline-none"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Site Location *:</td>
            <td className="border border-slate-950 px-2 py-1">
              <input
                value={siteForm.siteLocation}
                onChange={(e) => setSiteForm((s) => ({ ...s, siteLocation: e.target.value }))}
                className="w-full bg-transparent font-semibold outline-none"
              />
            </td>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Date Tested:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-semibold">
              {baseWorksheet.testedAt}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Sample / Pile Ref. *:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
              <input
                value={siteForm.locationNote}
                onChange={(e) => setSiteForm((s) => ({ ...s, locationNote: e.target.value }))}
                className="w-full bg-transparent font-mono font-bold outline-none"
              />
            </td>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Site Conditions:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono">
              {siteForm.ambientTemp} / {siteForm.weatherNote}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Batch No. *:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
              {siteForm.batchNo?.trim() || '—'}
            </td>
            <td className="border border-slate-950 px-2 py-1 font-bold bg-slate-50">Sample ID No. *:</td>
            <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
              {siteForm.sampleId?.trim() || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section II: Calibrated Test Equipment Traceability */}
      <div className="mb-2">
        <div className="border-2 border-b-0 border-slate-950 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
          I. Calibrated Test Equipment &amp; Reference Standards
        </div>
        <table className="w-full border-collapse border-2 border-slate-950 text-[10px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-950 px-2 py-1 text-left w-[18%]">Equipment ID</th>
              <th className="border border-slate-950 px-2 py-1 text-left w-[34%]">Instrument Description</th>
              <th className="border border-slate-950 px-2 py-1 text-left w-[16%]">Model</th>
              <th className="border border-slate-950 px-2 py-1 text-left w-[16%]">Serial No.</th>
              <th className="border border-slate-950 px-2 py-1 text-left w-[16%]">Calibration Due</th>
            </tr>
          </thead>
          <tbody>
            {eqRows.map((eq) => (
              <tr key={eq.code}>
                <td className="border border-slate-950 px-2 py-1 font-mono font-bold">{eq.code}</td>
                <td className="border border-slate-950 px-2 py-1">{eq.name}</td>
                <td className="border border-slate-950 px-2 py-1 font-mono">{eq.model}</td>
                <td className="border border-slate-950 px-2 py-1 font-mono">{eq.serial}</td>
                <td className="border border-slate-950 px-2 py-1 font-mono font-semibold">{eq.calDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section III: Certified Test Results */}
      <div className="mb-2">
        <div className="border-2 border-b-0 border-slate-950 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
          II. Certified Test Results ({reportFormCode})
        </div>

        {/* Method-specific Official Report Tables */}
        {code === 'FC' && activeStructured?.kind === 'FC' && (
          <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-950 px-2 py-1 text-left">Test Parameter (ASTM C939 / STP 03)</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Measured Value</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Acceptance Criterion</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Water Efflux Verification Time (1725 mL)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">{activeStructured.waterCheckSec.toFixed(1)} s</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">8.0 s ± 0.2 s (7.8 – 8.2 s)</td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Grout Temperature at Time of Test</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">{activeStructured.groutTempC.toFixed(1)} °C</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">≤ 30.0 °C</td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Grout Efflux Time (Run 1 / Run 2)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  {activeStructured.t1Sec.toFixed(1)} s / {activeStructured.t2Sec.toFixed(1)} s
                </td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">15.0 – 30.0 s</td>
              </tr>
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-950 px-2 py-1">Certified Average Grout Efflux Time</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono text-xs">{activeStructured.meanSec.toFixed(1)} s</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">
                  {baseWorksheet.pass ? 'COMPLIES WITH SPEC.' : 'NON-COMPLIANT'}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {code === 'BL' && activeStructured?.kind === 'BL' && (
          <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-950 px-2 py-1 text-left">Test Parameter (ASTM C940 / STP 04)</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Measured Value</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Specification Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Initial Grout Volume V1 (mL)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">{activeStructured.v1} mL</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">800 ± 10 mL</td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Final Bleed Water Volume Vw (mL)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  {activeStructured.finalBleedAmt} {activeStructured.unit}
                </td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">At 180 min (3 Hours)</td>
              </tr>
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-950 px-2 py-1">Final Bleeding Ratio [Vw / V1 × 100%] (Nearest 0.1%)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono text-xs">{activeStructured.finalBleedPct.toFixed(1)} %</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">≤ {activeStructured.specLimitPct.toFixed(1)} %</td>
              </tr>
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-950 px-2 py-1">Final Change in Height / Expansion [(V2 − V1) / V1 × 100%]</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono text-xs">{activeStructured.finalExpPct.toFixed(1)} %</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono">0.0 % – 5.0 %</td>
              </tr>
            </tbody>
          </table>
        )}

        {code === 'PO' && activeStructured?.kind === 'PO' && (
          <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-950 px-2 py-1 text-left">Rock Point Load Parameter (ASTM D5731 / STP06-RKT-D5731)</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Certified Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Test Type &amp; Specimen Dimensions (D × W)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  {activeStructured.mode === 'diametral'
                    ? 'DIAMETRAL CORE (D — Diametral Core)'
                    : 'AXIAL CORE (A — Axial Core)'}{' '}
                  — D = {activeStructured.dMm} mm, W = {activeStructured.wMm} mm
                </td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Failure Load P (kN) &amp; Equivalent Core Diameter De (mm)</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  P = {activeStructured.loadKn.toFixed(2)} kN &nbsp;|&nbsp; De ={' '}
                  {activeStructured.mode === 'diametral' ? "√(D·D')" : '√(4DW/π)'} = {activeStructured.deMm.toFixed(2)} mm
                </td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Uncorrected Point Load Strength Is (MPa) &amp; Size Correction F</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  Is = {activeStructured.isUncorrMpa.toFixed(2)} MPa &nbsp;|&nbsp; F = (De/50)^0.45 = {activeStructured.fFactor.toFixed(3)}
                </td>
              </tr>
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-950 px-2 py-1">Size-Corrected Point Load Strength Index Is(50) &amp; Estimated UCS</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono text-xs">
                  Is(50) = {activeStructured.is50Mpa.toFixed(2)} MPa &nbsp;|&nbsp; Est. UCS ≈ {activeStructured.estUcsMpa.toFixed(1)} MPa
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {code === 'KD' && activeStructured?.kind === 'KD' && (
          <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-950 px-2 py-1 text-left">Koden Ultrasonic Echo Parameter (HKCI TM3 Issue 2 / STP02-FDT-TM3)</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Certified Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Shaft Design Diameter &amp; Tested Depth Range</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  Ø {activeStructured.pileDiaMm} mm ({(activeStructured.pileDiaMm / 1000).toFixed(2)} m) &nbsp;|&nbsp; 0.00 m to −{activeStructured.depthM.toFixed(2)} m
                </td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Horizontal Eccentricity (ΔX-X&apos;, ΔY-Y&apos;) &amp; Vectorial Offset ΔR</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  ΔX = {activeStructured.dxMm} mm, ΔY = {activeStructured.dyMm} mm &nbsp;|&nbsp; ΔR = {activeStructured.offsetMm.toFixed(1)} mm
                </td>
              </tr>
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-950 px-2 py-1">Certified Shaft Verticality Gradient</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono text-xs">
                  1 : {Math.round(activeStructured.ratioDenom)} ({activeStructured.vertPct.toFixed(3)} %) — Limit 1:{activeStructured.limitDenom} ({baseWorksheet.pass ? 'PASS' : 'EXCEEDS'})
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {code === 'SO' && sonicData && (() => {
          const meanSpeed =
            sonicData.profiles.length > 0
              ? Math.round(sonicData.profiles.reduce((s, p) => s + p.waveSpeedMs, 0) / sonicData.profiles.length)
              : 4015;
          const pullSpeed = sonicData.scannedLenM / Math.max(1, sonicData.actualPullingSec);
          return (
            <div className="space-y-1.5">
              <table className="w-full border-collapse border-2 border-slate-950 text-[10px]">
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-950 px-2 py-1 font-bold">Access Tubes &amp; Profiles:</td>
                    <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
                      {sonicData.tubeCount} Steel Tubes ({sonicData.profiles.length} Profiles)
                    </td>
                    <td className="border border-slate-950 px-2 py-1 font-bold">Concrete Age &amp; Tube Water Temp.:</td>
                    <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
                      {sonicData.concreteAgeDays} days (≥ 7d) · {sonicData.waterTempC.toFixed(1)} °C (0–30 °C)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-950 px-2 py-1 font-bold">Plumbed Depth A vs Scanned B:</td>
                    <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
                      {sonicData.plumbedLenM.toFixed(2)} m vs {sonicData.scannedLenM.toFixed(2)} m (|A−B| = {Math.abs(sonicData.plumbedLenM - sonicData.scannedLenM).toFixed(2)} m)
                    </td>
                    <td className="border border-slate-950 px-2 py-1 font-bold">Pull Duration &amp; Speed:</td>
                    <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
                      {sonicData.actualPullingSec} s ({pullSpeed.toFixed(2)} m/s ≤ 0.50 m/s)
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full border-collapse border-2 border-slate-950 text-center text-[10px]">
                <thead>
                  <tr className="bg-slate-50 font-bold">
                    <th className="border border-slate-950 px-1.5 py-1">Profile Pair</th>
                    <th className="border border-slate-950 px-1.5 py-1">Path Dist. (mm)</th>
                    <th className="border border-slate-950 px-1.5 py-1">Baseline FAT₀ (μs)</th>
                    <th className="border border-slate-950 px-1.5 py-1">Measured FAT (μs)</th>
                    <th className="border border-slate-950 px-1.5 py-1">FAT Delay (%)</th>
                    <th className="border border-slate-950 px-1.5 py-1">Energy Loss (dB)</th>
                    <th className="border border-slate-950 px-1.5 py-1">Wave Speed (m/s)</th>
                    <th className="border border-slate-950 px-1.5 py-1">Integrity Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {sonicData.profiles.map((p, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{p.pair}</td>
                      <td className="border border-slate-950 px-1.5 py-0.5">{p.distMm}</td>
                      <td className="border border-slate-950 px-1.5 py-0.5">{p.baseFatUs}</td>
                      <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{p.measFatUs}</td>
                      <td className="border border-slate-950 px-1.5 py-0.5">{p.fatDelayPct.toFixed(1)}%</td>
                      <td className="border border-slate-950 px-1.5 py-0.5">{p.energyDropDb.toFixed(1)}</td>
                      <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{p.waveSpeedMs}</td>
                      <td className="border border-slate-950 px-1.5 py-0.5 font-sans font-bold">
                        {p.anomaly ? 'ANOMALY' : 'CONTINUOUS'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-sans font-black">
                    <td colSpan={4} className="border border-slate-950 px-2 py-1 text-left">
                      Certified Pile Shaft Ultrasonic Integrity Verdict
                    </td>
                    <td colSpan={4} className="border border-slate-950 px-2 py-1 font-mono">
                      Mean Wave Speed = {meanSpeed} m/s · {sonicData.isPass ? 'PASS — NO ANOMALY' : 'ANOMALY DETECTED'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {code === 'PLT' && activeStructured?.kind === 'PLT' && (
          <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-950 px-2 py-1 text-left">Plate Load Parameter (BS 1377-9 / ASTM D1194 / STP 07)</th>
                <th className="border border-slate-950 px-2 py-1 text-center">Certified Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Bearing Plate Size D &amp; Peak Applied Stress σ</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  D = {activeStructured.plateSizeMm} mm ({activeStructured.areaM2.toFixed(4)} m²) &nbsp;|&nbsp; σ = {activeStructured.peakPressureKpa.toFixed(1)} kPa (Load = {activeStructured.peakLoadKn.toFixed(1)} kN)
                </td>
              </tr>
              <tr>
                <td className="border border-slate-950 px-2 py-1 font-semibold">Peak Mean Settlement s &amp; 15-min Creep Rate</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono font-bold">
                  s_peak = {activeStructured.peakSettlementMm.toFixed(2)} mm (Limit 0.15B = {activeStructured.limit015BMm.toFixed(1)} mm) &nbsp;|&nbsp; Δs/15m = {activeStructured.rate15m.toFixed(3)} mm
                </td>
              </tr>
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-950 px-2 py-1">Modulus of Subgrade Reaction k_s &amp; Equivalent Elastic Modulus E_s</td>
                <td className="border border-slate-950 px-2 py-1 text-center font-mono text-xs">
                  k_s = {activeStructured.ksPeak !== null ? activeStructured.ksPeak.toFixed(2) : '—'} MPa/m &nbsp;|&nbsp; E_s = {activeStructured.esMpa !== null ? activeStructured.esMpa.toFixed(2) : '—'} MPa ({baseWorksheet.pass ? 'PASS' : 'CHECK'})
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {code === 'VC' && activeStructured?.kind === 'VC' && (() => {
          const rawMode =
            (activeStructured.surveyMode as string | undefined) ||
            ((activeStructured as unknown as { mode?: string }).mode);
          const isPeewee = rawMode === 'peewee';
          return (
            <div className="space-y-1.5">
              <table className="w-full border-collapse border-2 border-slate-950 text-[10px]">
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-950 px-2 py-1 font-bold">Survey Method:</td>
                    <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
                      {isPeewee ? 'PeeWee Optical-Gyro Borehole Deviation Probe' : 'Biaxial Servo-Accelerometer Inclinometer'}
                    </td>
                    <td className="border border-slate-950 px-2 py-1 font-bold">Survey Depth &amp; Max Drift R:</td>
                    <td className="border border-slate-950 px-2 py-1 font-mono font-bold">
                      {activeStructured.maxDepthM.toFixed(1)} m · Max R = {activeStructured.maxDriftMm.toFixed(2)} mm
                    </td>
                  </tr>
                </tbody>
              </table>
              {isPeewee ? (
                <table className="w-full border-collapse border-2 border-slate-950 text-center text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
                      <th className="border border-slate-950 px-1.5 py-1">Depth (m)</th>
                      <th className="border border-slate-950 px-1.5 py-1">Tilt (°)</th>
                      <th className="border border-slate-950 px-1.5 py-1">Azimuth (°)</th>
                      <th className="border border-slate-950 px-1.5 py-1">ΔX (mm)</th>
                      <th className="border border-slate-950 px-1.5 py-1">ΔY (mm)</th>
                      <th className="border border-slate-950 px-1.5 py-1">Resultant Drift R (mm)</th>
                      <th className="border border-slate-950 px-1.5 py-1">Inclination (1 : N)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {activeStructured.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{r.depthM.toFixed(1)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.a0.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.b0.toFixed(1)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.chkA.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.chkB.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{r.resMm.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5 font-bold">
                          1 : {r.ratioN >= 9999 ? '∞' : Math.round(r.ratioN)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-sans font-black">
                      <td colSpan={4} className="border border-slate-950 px-2 py-1 text-left">
                        Certified Overall Borehole / Shaft Verticality
                      </td>
                      <td colSpan={3} className="border border-slate-950 px-2 py-1 font-mono">
                        1 : {activeStructured.overallN >= 9999 ? '∞' : Math.round(activeStructured.overallN)} — Limit 1:{activeStructured.limitN} ({activeStructured.isPass ? 'PASS' : 'EXCEEDS'})
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse border-2 border-slate-950 text-center text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
                      <th className="border border-slate-950 px-1.5 py-1">Depth (m)</th>
                      <th className="border border-slate-950 px-1.5 py-1">A0</th>
                      <th className="border border-slate-950 px-1.5 py-1">A180</th>
                      <th className="border border-slate-950 px-1.5 py-1">Checksum A</th>
                      <th className="border border-slate-950 px-1.5 py-1">B0</th>
                      <th className="border border-slate-950 px-1.5 py-1">B180</th>
                      <th className="border border-slate-950 px-1.5 py-1">Checksum B</th>
                      <th className="border border-slate-950 px-1.5 py-1">Drift R (mm)</th>
                      <th className="border border-slate-950 px-1.5 py-1">1 : N</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {activeStructured.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{r.depthM.toFixed(1)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.a0.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.a180.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.chkA.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.b0.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.b180.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5">{r.chkB.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5 font-bold">{r.resMm.toFixed(2)}</td>
                        <td className="border border-slate-950 px-1.5 py-0.5 font-bold">
                          1 : {r.ratioN >= 9999 ? '∞' : Math.round(r.ratioN)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-sans font-black">
                      <td colSpan={5} className="border border-slate-950 px-2 py-1 text-left">
                        Certified Overall Shaft Verticality Gradient
                      </td>
                      <td colSpan={4} className="border border-slate-950 px-2 py-1 font-mono">
                        1 : {activeStructured.overallN >= 9999 ? '∞' : Math.round(activeStructured.overallN)} — Limit 1:{activeStructured.limitN} ({activeStructured.isPass ? 'PASS' : 'EXCEEDS'})
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

        {!sonicData &&
          (!activeStructured ||
            (code !== 'FC' && code !== 'BL' && code !== 'PO' && code !== 'KD' && code !== 'PLT' && code !== 'VC')) && (
          <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-950 px-2 py-1 text-center w-[10%]">Item</th>
                <th className="border border-slate-950 px-2 py-1 text-left w-[50%]">Test Parameter / Observation</th>
                <th className="border border-slate-950 px-2 py-1 text-left w-[40%]">Certified Value</th>
              </tr>
            </thead>
            <tbody>
              {measurementRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-slate-950 px-2 py-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-950 px-2 py-1 font-semibold">{row.parameter}</td>
                  <td className="border border-slate-950 px-2 py-1 font-mono font-bold">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section IV: Notes, Measurement Uncertainty & Accreditation Scope */}
      <div className="border-2 border-slate-950 p-2 text-[9.5px] leading-relaxed mb-2 bg-slate-50/50">
        <div className="font-black uppercase tracking-wider text-slate-950 mb-0.5">
          {isHoklasAccredited
            ? 'III. Notes, Statement of Measurement Uncertainty & HOKLAS Conditions'
            : 'III. Notes & Statement of Measurement Uncertainty'}
        </div>
        <div>
          1. <strong>* Information supplied by customer:</strong> LabTech Testing Limited is not responsible for the sampling or information supplied by the client unless otherwise stated. The test results relate only to the items or locations tested.
        </div>
        <div>
          2. <strong>Expanded Measurement Uncertainty ({templateMeta.muRefCode}):</strong> {templateMeta.uncertaintyStatement}
        </div>
        {isHoklasAccredited ? (
          <div>
            3. <strong>HOKLAS Endorsement (Reg. No. HOKLAS 298):</strong> Hong Kong Accreditation Service (HKAS) has accredited this laboratory under HOKLAS for specific laboratory activities as listed in the HOKLAS Directory of Accredited Laboratories. This report shall not be reproduced except in full without written approval of LabTech Testing Limited.
          </div>
        ) : (
          <div>
            3. <strong>Controlled In-House Procedure:</strong> Test conducted in accordance with LabTech In-House Procedure {templateMeta.stpDocRef}; outside current HOKLAS 298 accredited scope. This report shall not be reproduced except in full without written approval of LabTech Testing Limited.
          </div>
        )}
      </div>

      {/* Section V: Official Authorization & Sign-Off */}
      <table className="w-full border-collapse border-2 border-slate-950 text-[10.5px]">
        <tbody>
          <tr>
            <td className="border border-slate-950 p-2.5 w-1/2 align-top">
              <div className="text-[9.5px] font-bold uppercase text-slate-700">Tested &amp; Recorded By:</div>
              <div className="h-10 flex items-center border-b border-slate-400 my-1">
                {operatorSigDataUrl ? (
                  <img src={operatorSigDataUrl} alt="Operator Signature" className="max-h-9 object-contain" />
                ) : (
                  <span className="font-serif italic text-sm text-slate-800">{activeOperator}</span>
                )}
              </div>
              <div className="font-bold text-slate-950">{activeOperator}</div>
              <div className="text-[9px] text-slate-600">Authorized Field Technician · LabTech Testing Limited</div>
            </td>
            <td className="border border-slate-950 p-2.5 w-1/2 align-top">
              <div className="text-[9.5px] font-bold uppercase text-slate-700">
                Checked &amp; Authorized to Release Results By:
              </div>
              <div className="h-10 flex items-center justify-between border-b border-slate-400 my-1">
                {signatorySigDataUrl ? (
                  <img src={signatorySigDataUrl} alt="Signatory Signature" className="max-h-9 object-contain" />
                ) : signatoryEndorsed ? (
                  <span className="font-serif italic text-sm font-bold text-slate-950">{activeSignatory.split('(')[0]}</span>
                ) : (
                  <span className="text-[9px] text-slate-400">Pending Signatory Endorsement</span>
                )}
                {isHoklasAccredited && (
                  <span className="border border-slate-950 px-1.5 py-0.5 text-[8px] font-mono font-black uppercase">
                    HOKLAS 298 AS
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-950">
                {isHoklasAccredited ? activeSignatory : activeSignatory.replace(/\s*\(HOKLAS[^)]*\)/gi, '').trim()}
              </div>
              <div className="text-[9px] text-slate-600">
                {isHoklasAccredited
                  ? 'HOKLAS Approved Signatory · For and on behalf of LabTech Testing Limited'
                  : 'Approved Signatory · LabTech Testing Limited'}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-1.5 text-center font-mono text-[9.5px] font-black tracking-widest text-slate-700">
        *** END OF REPORT ({baseWorksheet.reportRefNo} · {reportFormCode}) ***
      </div>
    </div>
  );
};
