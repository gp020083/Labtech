import React from 'react';
import {
  LABTECH_COMPANY_HEADER,
  OfficialTemplateMeta,
  StructuredCalcPayload,
} from '../utils/completedWorksheetGenerator';
import {
  HoklasWorksheetEquipmentRow,
  HoklasWorksheetRow,
} from '../utils/limsProcessTools';

export interface OfficialFormSiteState {
  jobNo: string;
  jobRefNo?: string;
  worksOrderNo?: string;
  batchNo?: string;
  sampleId?: string;
  companyProjNo: string;
  projectTitle: string;
  clientName: string;
  siteLocation: string;
  locationNote: string;
  ambientTemp: string;
  weatherNote: string;
}

export interface OfficialWorksheetViewProps {
  stpCode: string;
  reportRefNo: string;
  testedAt: string;
  pass: boolean;
  siteForm: OfficialFormSiteState;
  setSiteForm: React.Dispatch<React.SetStateAction<OfficialFormSiteState>>;
  templateMeta: OfficialTemplateMeta;
  eqRows: HoklasWorksheetEquipmentRow[];
  measurementRows: HoklasWorksheetRow[];
  setMeasurementRows: React.Dispatch<React.SetStateAction<HoklasWorksheetRow[]>>;
  structured?: StructuredCalcPayload;
  activeOperator: string;
  setActiveOperator: (v: string) => void;
  operatorOptions: string[];
  activeSignatory: string;
  setActiveSignatory: (v: string) => void;
  signatoryOptions: string[];
  operatorSigDataUrl: string | null;
  signatorySigDataUrl: string | null;
  witnessSigDataUrl?: string;
  witnessName?: string;
  witnessRole?: string;
  sitePhotos?: Array<{ id: string; fileName: string; dataUrl: string; caption?: string }>;
}

export const OfficialWorksheetView: React.FC<OfficialWorksheetViewProps> = ({
  stpCode,
  reportRefNo,
  testedAt,
  siteForm,
  setSiteForm,
  templateMeta,
  eqRows,
  measurementRows,
  setMeasurementRows,
  structured,
  activeOperator,
  setActiveOperator,
  operatorOptions,
  activeSignatory,
  setActiveSignatory,
  signatoryOptions,
  operatorSigDataUrl,
  signatorySigDataUrl,
  witnessSigDataUrl,
  witnessName,
  sitePhotos = [],
}) => {
  const cleanStp = (stpCode || 'KD').trim().toUpperCase();
  const dateOnly = (testedAt || '').slice(0, 10);
  const timeOnly = (testedAt || '').slice(11, 16) || '10:00';
  const contractNo = siteForm.companyProjNo || 'CEDD/2026/01';

  const findEq = (keywords: string[], fallback: string) => {
    const found = eqRows.find((e) =>
      keywords.some((k) => e.code.toLowerCase().includes(k) || e.name.toLowerCase().includes(k))
    );
    return found ? `${found.code} (Due: ${found.calDue})` : fallback;
  };

  const findEqCodeOnly = (keywords: string[], fallback: string) => {
    const found = eqRows.find((e) =>
      keywords.some((k) => e.code.toLowerCase().includes(k) || e.name.toLowerCase().includes(k))
    );
    return found?.code || fallback;
  };

  return (
    <div className="light-island font-sans text-[11px] leading-snug text-slate-950 space-y-3">
      {/* Official LabTech Paper Worksheet Header */}
      <div className="border-b-2 border-slate-900 pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/labtech-logo.png"
              alt="LaBTECH"
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="text-sm font-black tracking-tight text-slate-950">
                {LABTECH_COMPANY_HEADER.nameEn}
              </div>
              <div className="text-[9.5px] font-semibold text-slate-700 leading-tight">
                {LABTECH_COMPANY_HEADER.addressLine1}
              </div>
              <div className="text-[9.5px] font-mono text-slate-600">
                {LABTECH_COMPANY_HEADER.contactLine}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="inline-block border-2 border-slate-900 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-black text-slate-950">
              {templateMeta.worksheetFormCode}
            </div>
            <div className="mt-1 font-mono text-[10px] text-slate-600">
              Page 1 of {cleanStp === 'KD' ? '6 (Summary)' : '1'}
            </div>
          </div>
        </div>

        <div className="mt-2.5 text-center">
          <div className="text-sm font-black uppercase tracking-widest underline decoration-2 underline-offset-4">
            WORKSHEET
          </div>
          <div className="mt-1 text-xs sm:text-sm font-extrabold text-slate-900">
            {templateMeta.templateTitleEn}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-400 pt-1.5 font-mono text-[11px]">
          <div>
            <span className="font-bold">Test Method : </span>
            <span className="font-extrabold">{templateMeta.testStandard}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold">Job Reference No : </span>
            <input
              value={siteForm.jobRefNo ?? reportRefNo}
              onChange={(e) => setSiteForm({ ...siteForm, jobRefNo: e.target.value })}
              className="w-40 border-b border-slate-800 bg-transparent px-1 font-mono font-black text-slate-950 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Client & Project Information Box (Matches FST04 / FST05 / FST02 / FST03 / FST06 / STP07-PLT) */}
      <div className="border-2 border-slate-900">
        <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold text-slate-950">
          {cleanStp === 'KD'
            ? 'General Information (provided by customer)'
            : cleanStp === 'PO'
            ? 'Information Supplied by Customer & Laboratory Information'
            : 'Information Supplied by Client'}
        </div>
        <div className="grid grid-cols-12 divide-y divide-slate-400 text-[11px]">
          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Client :
          </div>
          <div className="col-span-9 sm:col-span-5 px-2 py-1 border-r border-slate-400">
            <input
              value={siteForm.clientName}
              onChange={(e) => setSiteForm({ ...siteForm, clientName: e.target.value })}
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </div>
          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Report / Ref No :
          </div>
          <div className="col-span-9 sm:col-span-3 px-2 py-1 font-mono font-bold">
            {reportRefNo}
          </div>

          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Project :
          </div>
          <div className="col-span-9 sm:col-span-10 px-2 py-1">
            <input
              value={siteForm.projectTitle}
              onChange={(e) => setSiteForm({ ...siteForm, projectTitle: e.target.value })}
              className="w-full bg-transparent font-semibold text-slate-950 outline-none"
            />
          </div>

          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Test Location :
          </div>
          <div className="col-span-9 sm:col-span-5 px-2 py-1 border-r border-slate-400">
            <input
              value={siteForm.siteLocation}
              onChange={(e) => setSiteForm({ ...siteForm, siteLocation: e.target.value })}
              className="w-full bg-transparent font-semibold text-slate-950 outline-none"
            />
          </div>
          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Contract No :
          </div>
          <div className="col-span-9 sm:col-span-3 px-2 py-1">
            <input
              value={siteForm.companyProjNo}
              onChange={(e) => setSiteForm({ ...siteForm, companyProjNo: e.target.value })}
              className="w-full bg-transparent font-mono font-bold text-slate-950 outline-none"
            />
          </div>

          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Location in Work :
          </div>
          <div className="col-span-9 sm:col-span-5 px-2 py-1 border-r border-slate-400">
            <input
              value={siteForm.locationNote}
              onChange={(e) => setSiteForm({ ...siteForm, locationNote: e.target.value })}
              className="w-full bg-transparent font-mono font-extrabold text-brand-deep outline-none"
            />
          </div>
          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Works Order No :
          </div>
          <div className="col-span-9 sm:col-span-3 px-2 py-1 font-mono font-semibold">
            <input
              value={siteForm.worksOrderNo ?? ''}
              onChange={(e) => setSiteForm({ ...siteForm, worksOrderNo: e.target.value })}
              placeholder="Manual Input (e.g. WO/2026/01)"
              className="w-full bg-transparent font-mono font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Batch No :
          </div>
          <div className="col-span-9 sm:col-span-5 px-2 py-1 border-r border-slate-400 font-mono">
            <input
              value={siteForm.batchNo ?? ''}
              onChange={(e) => setSiteForm({ ...siteForm, batchNo: e.target.value })}
              placeholder="Manual Input (e.g. B-01)"
              className="w-full bg-transparent font-mono font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="col-span-3 sm:col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">
            Sample ID No :
          </div>
          <div className="col-span-9 sm:col-span-3 px-2 py-1 font-mono">
            <input
              value={siteForm.sampleId ?? ''}
              onChange={(e) => setSiteForm({ ...siteForm, sampleId: e.target.value })}
              placeholder="Manual Input (e.g. GS-01)"
              className="w-full bg-transparent font-mono font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          1) FST05-GTT-C939-2-260417 (Flow Cone Method — FC)
         ===================================================================== */}
      {structured?.kind === 'FC' && (
        <>
          <div className="border-2 border-slate-900">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Sample Information
            </div>
            <div className="grid grid-cols-12 divide-y divide-slate-400">
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Brand of Cement :</div>
              <div className="col-span-4 px-2 py-1 border-r border-slate-400">{structured.cementBrand || 'Green Island OPC (BS EN 197-1 CEM I 52.5N)'}</div>
              <div className="col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Quantity :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.cementQty || '50 kg (1 Bag)'}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Brand of admixture :</div>
              <div className="col-span-4 px-2 py-1 border-r border-slate-400">{structured.admixtureBrand || 'Sika Grout Aid / Cebex 100'}</div>
              <div className="col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Quantity :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.admixtureQty || '0.225 kg'}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Water :</div>
              <div className="col-span-4 px-2 py-1 border-r border-slate-400">{structured.waterSource || 'Mains Potable Water (WSD)'}</div>
              <div className="col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Quantity :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.waterQty || '21.0 L'}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Water / Cement Ratio :</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold border-r border-slate-400">{structured.wcRatio || '0.42'}</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Ambient Temperature :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.ambientTempText || siteForm.ambientTemp}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Water Temperature :</div>
              <div className="col-span-3 px-2 py-1 font-mono border-r border-slate-400">{structured.waterTempText || `${(structured.groutTempC - 0.5).toFixed(1)} °C`}</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Date of Testing :</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold">{structured.testDateIso || dateOnly}</div>
            </div>
          </div>

          <div className="border-2 border-slate-900 overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <tr className="border-b border-slate-800 bg-slate-50">
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1 font-bold">Location:</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono font-bold">{siteForm.locationNote} (Specimen 1)</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center text-slate-400">Specimen 2</td>
                  <td className="px-2 py-1 text-center text-slate-400">Specimen 3</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1 font-bold">Time of Water Added:</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">{structured.timeWaterAdded || '09:45'}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1 font-bold">Time of Drawing Grout from the Mixer:</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">{structured.timeDrawingGrout || '09:52'}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b-2 border-slate-900 bg-slate-100 font-mono text-[10.5px] font-bold">
                  <td colSpan={5} className="px-2.5 py-1.5">
                    Thermometer ID: <u className="font-black">{findEqCodeOnly(['tm', 'mm', 'therm'], 'LT-TM-01')}</u>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Flow Cone ID: <u className="font-black">{findEqCodeOnly(['fc', 'flow'], 'LT-FC-01')}</u>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Timer ID: <u className="font-black">{findEqCodeOnly(['td', 'timer', 'stop'], 'LT-TD-01')}</u>
                  </td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td rowSpan={3} className="w-20 border-r border-slate-800 bg-slate-50 px-2 py-1 text-center font-extrabold">
                    Test 1
                  </td>
                  <td className="border-r border-slate-800 px-2 py-1 font-semibold">Temperature of Specimen ( °C )</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono font-bold">{structured.groutTempC.toFixed(1)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="border-r border-slate-800 px-2 py-1 font-semibold">Time of Test</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">{timeOnly}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="border-r border-slate-800 px-2 py-1 font-bold">Time of Efflux of Grout ( s )</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono font-black text-slate-950">{structured.t1Sec.toFixed(1)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td rowSpan={3} className="w-20 border-r border-slate-800 bg-slate-50 px-2 py-1 text-center font-extrabold">
                    Test 2
                  </td>
                  <td className="border-r border-slate-800 px-2 py-1 font-semibold">Temperature of Specimen ( °C )</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono font-bold">{structured.groutTempC.toFixed(1)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="border-r border-slate-800 px-2 py-1 font-semibold">Time of Test</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">{timeOnly}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b-2 border-slate-900">
                  <td className="border-r border-slate-800 px-2 py-1 font-bold">Time of Efflux of Grout ( s )</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono font-black text-slate-950">{structured.t2Sec.toFixed(1)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800 bg-sky-50/60">
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1.5 font-extrabold">Average Time of Efflux ( s )</td>
                  <td className="border-r border-slate-800 px-2 py-1.5 text-center font-mono text-xs font-black text-brand-deep">{structured.meanSec.toFixed(1)}</td>
                  <td className="border-r border-slate-800 px-2 py-1.5 text-center font-mono">—</td>
                  <td className="px-2 py-1.5 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1 font-bold">Different Time of Efflux to Average ( s ) *Note (2)</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono font-bold">{(structured.diffSec / 2).toFixed(2)} (|T1−T2| = {structured.diffSec.toFixed(1)}s)</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-mono">—</td>
                  <td className="px-2 py-1 text-center font-mono">—</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1 font-bold">Time to efflux compliance with standard</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-bold">{structured.meanSec <= 35 ? 'Yes (✓) / No' : 'Yes / No (✗)'}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center text-slate-400">Yes / No</td>
                  <td className="px-2 py-1 text-center text-slate-400">Yes / No</td>
                </tr>
                <tr>
                  <td colSpan={2} className="border-r border-slate-800 px-2 py-1 font-bold">Time different compliance with standard</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center font-bold">{structured.repeatOk ? 'Yes (✓) / No' : 'Yes / No (✗)'}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center text-slate-400">Yes / No</td>
                  <td className="px-2 py-1 text-center text-slate-400">Yes / No</td>
                </tr>
              </tbody>
            </table>
            <div className="border-t border-slate-900 bg-slate-50 px-2.5 py-1.5 text-[10px] space-y-0.5">
              <div><b>Note:</b> ( 1 ) This test method is intended for use with grout having an efflux time of 35 s or less. &nbsp; ( 2 ) Two tests having time of efflux within 1.8s of their average.</div>
              <div><b>Remark:</b> Pre-test 1725 mL Water Calibration Efflux Time = <b>{structured.waterCheckSec.toFixed(1)} s</b> (Standard: 8.0 ± 0.2 s — {structured.waterOk ? 'OK' : 'Check Nozzle'}).</div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          2) FST04-GTT-C940-3-261001 (Bleeding and Free Expansion of Grout — BL)
         ===================================================================== */}
      {structured?.kind === 'BL' && (
        <>
          <div className="border-2 border-slate-900">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Sample Information
            </div>
            <div className="grid grid-cols-12 divide-y divide-slate-400">
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Brand of Cement :</div>
              <div className="col-span-4 px-2 py-1 border-r border-slate-400">{structured.cementBrand || 'Green Island OPC (BS EN 197-1 CEM I 52.5N)'}</div>
              <div className="col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Quantity :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.cementQty || '50 kg (1 Bag)'}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Brand of admixture :</div>
              <div className="col-span-4 px-2 py-1 border-r border-slate-400">{structured.admixtureBrand || 'Sika Grout Aid / Cebex 100'}</div>
              <div className="col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Quantity :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.admixtureQty || '0.225 kg'}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Water :</div>
              <div className="col-span-4 px-2 py-1 border-r border-slate-400">{structured.waterSource || 'Mains Potable Water (WSD)'}</div>
              <div className="col-span-2 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Quantity :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.waterQty || '21.0 L'}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Water / Cement Ratio :</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold border-r border-slate-400">{structured.wcRatio || '0.42'}</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Ambient Temperature :</div>
              <div className="col-span-3 px-2 py-1 font-mono">{structured.ambientTempText || siteForm.ambientTemp}</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Water Temperature :</div>
              <div className="col-span-3 px-2 py-1 font-mono border-r border-slate-400">{structured.waterTempText || '25.3 °C'}</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Date of Testing :</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold">{structured.testDateIso || dateOnly}</div>
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-50 px-2.5 py-1 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-bold">
            <span>Site conditions of test location:</span>
            <span>Safe access provided: ( ✓ ) Yes &nbsp; ( &nbsp; ) No</span>
            <span>Safe working area provided: ( ✓ ) Yes &nbsp; ( &nbsp; ) No</span>
          </div>

          <div className="border-2 border-slate-900 overflow-x-auto">
            <table className="w-full border-collapse text-center text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-100 font-extrabold">
                  <th rowSpan={3} className="border-r border-slate-800 px-1.5 py-1">Time</th>
                  <th rowSpan={3} className="border-r border-slate-800 px-2 py-1">Elapsed Time</th>
                  <th colSpan={4} className="border-r border-slate-900 px-2 py-1">
                    Specimen No. 1 (Initial {structured.unit === 'mL' ? 'V1' : 'H1'} = {structured.v1} {structured.unit})
                  </th>
                  <th colSpan={4} className="border-r border-slate-900 px-2 py-1 text-slate-600">
                    Specimen No. 2
                  </th>
                  <th colSpan={4} className="px-2 py-1 text-slate-600">
                    Specimen No. 3
                  </th>
                </tr>
                <tr className="border-b border-slate-800 bg-slate-50 font-bold">
                  <th colSpan={2} className="border-r border-slate-800 px-1.5 py-0.5">Reading ({structured.unit})</th>
                  <th rowSpan={2} className="border-r border-slate-800 px-1.5 py-0.5">Bleeding (%)</th>
                  <th rowSpan={2} className="border-r border-slate-900 px-1.5 py-0.5">Expansion (%)</th>
                  <th colSpan={2} className="border-r border-slate-800 px-1.5 py-0.5 text-slate-500">Reading ({structured.unit})</th>
                  <th rowSpan={2} className="border-r border-slate-800 px-1 py-0.5 text-slate-500">Bleed (%)</th>
                  <th rowSpan={2} className="border-r border-slate-900 px-1 py-0.5 text-slate-500">Exp (%)</th>
                  <th colSpan={2} className="border-r border-slate-800 px-1.5 py-0.5 text-slate-500">Reading ({structured.unit})</th>
                  <th rowSpan={2} className="border-r border-slate-800 px-1 py-0.5 text-slate-500">Bleed (%)</th>
                  <th rowSpan={2} className="px-1 py-0.5 text-slate-500">Exp (%)</th>
                </tr>
                <tr className="border-b-2 border-slate-900 bg-slate-50 font-bold text-[10px]">
                  <th className="border-r border-slate-800 px-1.5 py-0.5">Bleed Water</th>
                  <th className="border-r border-slate-800 px-1.5 py-0.5">Grout</th>
                  <th className="border-r border-slate-800 px-1 py-0.5 text-slate-500">Water</th>
                  <th className="border-r border-slate-800 px-1 py-0.5 text-slate-500">Grout</th>
                  <th className="border-r border-slate-800 px-1 py-0.5 text-slate-500">Water</th>
                  <th className="border-r border-slate-800 px-1 py-0.5 text-slate-500">Grout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400 font-mono">
                {structured.intervals.map((iv, idx) => {
                  const mins = [15, 30, 60, 120, 180, 240, 1440][idx] || (idx + 1) * 30;
                  const hh = String((10 + Math.floor(mins / 60)) % 24).padStart(2, '0');
                  const mm = String(mins % 60).padStart(2, '0');
                  return (
                    <tr key={idx}>
                      <td className="border-r border-slate-800 px-1.5 py-1">{hh}:{mm}</td>
                      <td className="border-r border-slate-800 px-2 py-1 font-sans font-bold">{iv.timeLabel}</td>
                      <td className="border-r border-slate-800 px-1.5 py-1 font-bold">{iv.v2}</td>
                      <td className="border-r border-slate-800 px-1.5 py-1 font-bold">{iv.vg}</td>
                      <td className="border-r border-slate-800 px-1.5 py-1 font-extrabold text-brand-deep">{iv.bleedPct.toFixed(2)}</td>
                      <td className="border-r border-slate-900 px-1.5 py-1 font-bold">{iv.expPct.toFixed(2)}</td>
                      <td className="border-r border-slate-400 px-1 py-1 text-slate-400">—</td>
                      <td className="border-r border-slate-400 px-1 py-1 text-slate-400">—</td>
                      <td className="border-r border-slate-400 px-1 py-1 text-slate-400">—</td>
                      <td className="border-r border-slate-900 px-1 py-1 text-slate-400">—</td>
                      <td className="border-r border-slate-400 px-1 py-1 text-slate-400">—</td>
                      <td className="border-r border-slate-400 px-1 py-1 text-slate-400">—</td>
                      <td className="border-r border-slate-400 px-1 py-1 text-slate-400">—</td>
                      <td className="px-1 py-1 text-slate-400">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t-2 border-slate-900 bg-slate-50 px-2.5 py-1.5 text-[10.5px] flex flex-wrap items-center justify-between gap-2">
              <div>
                <b>Remark:</b> Initial Grout ({structured.unit === 'mL' ? 'V1' : 'H1'}) = <b>{structured.v1} {structured.unit}</b>; Final Bleeding = <b>{structured.finalBleedPct.toFixed(2)}%</b> (Spec ≤ {structured.specLimitPct.toFixed(1)}% → <b>{structured.isPass ? 'PASS' : 'EXCEED'}</b>); Free Expansion = <b>{structured.finalExpPct >= 0 ? '+' : ''}{structured.finalExpPct.toFixed(2)}%</b>.
              </div>
              <div className="font-mono text-[10px]">
                Apparatus: {findEq(['gmc', 'pmc', 'sr', 'cyl'], 'LT-PMC-01')} · {findEq(['lv', 'level'], 'LT-LV-01')}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          3) FST02-FDT-TM3-6-260612 (Koden Ultrasonic Echo Sounder Test — KD)
         ===================================================================== */}
      {structured?.kind === 'KD' && (
        <>
          <div className="border-2 border-slate-900">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Sample Information (provided by customer) &amp; Setting of Koden Machine
            </div>
            <div className="grid grid-cols-12 divide-y divide-slate-400">
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Pile No.:</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold border-r border-slate-400">{siteForm.locationNote}</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Pile Type:</div>
              <div className="col-span-3 px-2 py-1 font-semibold">Bored Pile</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Pile Diameter:</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold border-r border-slate-400">{structured.pileDiaMm} (mm)</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Casing Internal Diameter:</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold">{structured.pileDiaMm - 70} (mm)</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Total Pile Length:</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold border-r border-slate-400">{structured.depthM.toFixed(2)} (m)</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Max. Allowable Inclination:</div>
              <div className="col-span-3 px-2 py-1 font-mono font-extrabold">1 : {structured.limitDenom}</div>

              <div className="col-span-12 bg-slate-50 px-2.5 py-1 font-mono text-[10px]">
                <b>Site Conditions &amp; Koden Setting:</b> Safe Access Provided: Yes (✓) &nbsp;|&nbsp; Safe Working Platform: Yes (✓) &nbsp;|&nbsp; 1.5m Resolution (Chart Attached): Yes (✓) &nbsp;|&nbsp; Levelling Checked: Yes (✓) &nbsp;|&nbsp; Transmission Medium: Water / Bentonite Slurry ({siteForm.ambientTemp})
              </div>
            </div>
          </div>

          <div className="border-2 border-slate-900">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Test Equipment (FST02-FDT-TM3-6-260612 Page 1)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-400 font-mono text-[10px] p-1.5 gap-y-1">
              <div className="px-2">1) Koden Machine: <b>{findEqCodeOnly(['km', 'koden'], 'LT-KM-04')}</b><br/>2) Measuring Tape: <b>{findEqCodeOnly(['mt', 'tape'], 'LT-MT-06')}</b></div>
              <div className="px-2">3) Steel Rule: <b>{findEqCodeOnly(['sr', 'rule'], 'LT-SR-10')}</b><br/>4) Dipmeter: <b>{findEqCodeOnly(['dm', 'dip'], 'LT-DM-01')}</b></div>
              <div className="px-2">5) Caliper: <b>{findEqCodeOnly(['dc', 'caliper'], 'LT-DC-03')}</b><br/>6) Compass: <b>LT-CP-01</b></div>
              <div className="px-2">7) Spirit Level: <b>{findEqCodeOnly(['lv', 'level'], 'LT-LV-01')}</b><br/>8) Thermometer: <b>{findEqCodeOnly(['tm', 'therm'], 'LT-TM-01')}</b></div>
            </div>
          </div>

          <div className="border-2 border-slate-900 overflow-x-auto">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Test Results — Verticality Check (Overall) [FST02-FDT-TM3-6-260612 Page 4]
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-50 font-extrabold">
                  <th className="border-r border-slate-800 px-2.5 py-1 text-left">Measurement Parameter</th>
                  <th className="border-r border-slate-800 px-2 py-1 text-center">Unit</th>
                  <th className="border-r border-slate-800 px-2.5 py-1 text-center">Channel X-X&apos;</th>
                  <th className="px-2.5 py-1 text-center">Channel Y-Y&apos;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400 font-mono">
                <tr>
                  <td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Depth between Two Measurements</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center">(m)</td>
                  <td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.depthM.toFixed(2)}</td>
                  <td className="px-2.5 py-1 text-center font-bold">{structured.depthM.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Calculated Displacement (= L × S)</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center">(m)</td>
                  <td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{(Math.abs(structured.dxMm) / 1000).toFixed(4)} ({structured.dxMm} mm)</td>
                  <td className="px-2.5 py-1 text-center font-bold">{(Math.abs(structured.dyMm) / 1000).toFixed(4)} ({structured.dyMm} mm)</td>
                </tr>
                <tr>
                  <td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Towards</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center">—</td>
                  <td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.dxMm >= 0 ? 'X' : "X'"}</td>
                  <td className="px-2.5 py-1 text-center font-bold">{structured.dyMm >= 0 ? 'Y' : "Y'"}</td>
                </tr>
                <tr className="bg-sky-50/60">
                  <td className="border-r border-slate-800 px-2.5 py-1.5 font-sans font-extrabold">Resultant Displacement = [(ΔX)² + (ΔY)²]¹ᐟ²</td>
                  <td className="border-r border-slate-800 px-2 py-1.5 text-center">(m)</td>
                  <td colSpan={2} className="px-2.5 py-1.5 text-center font-black text-brand-deep">
                    {(structured.offsetMm / 1000).toFixed(4)} m ({structured.offsetMm.toFixed(1)} mm)
                  </td>
                </tr>
                <tr className="bg-slate-100">
                  <td className="border-r border-slate-800 px-2.5 py-1.5 font-sans font-extrabold">Resultant Inclination (1 : V)</td>
                  <td className="border-r border-slate-800 px-2 py-1.5 text-center">(1 : V)</td>
                  <td colSpan={2} className="px-2.5 py-1.5 text-center font-black text-slate-950">
                    1 : {structured.ratioDenom > 5000 ? '∞' : structured.ratioDenom.toFixed(0)} ({structured.vertPct.toFixed(3)}%) — {structured.isPass ? `PASS (≤ 1:${structured.limitDenom})` : `EXCEED (Spec 1:${structured.limitDenom})`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* =====================================================================
          4) FST06-RKT-D5731-2-260421 (Point Load Strength Index of Rock — PO)
         ===================================================================== */}
      {structured?.kind === 'PO' && (
        <>
          <div className="border-2 border-slate-900">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Sample Details &amp; Equipment ID (FST06-RKT-D5731-2-260421)
            </div>
            <div className="grid grid-cols-12 divide-y divide-slate-400">
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Borehole / Sample No.:</div>
              <div className="col-span-3 px-2 py-1 font-mono font-bold border-r border-slate-400">{siteForm.locationNote}</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-bold border-r border-slate-400">Sample Description:</div>
              <div className="col-span-3 px-2 py-1">Slightly decomposed granite (Grade II)</div>

              <div className="col-span-4 px-2 py-1 font-mono text-[10px] border-r border-slate-400">Stopwatch: <b>{findEqCodeOnly(['td', 'stop'], 'LT-TD-01')}</b> · Thermometer: <b>{findEqCodeOnly(['tm', 'therm'], 'LT-TM-01')}</b></div>
              <div className="col-span-4 px-2 py-1 font-mono text-[10px] border-r border-slate-400">Upper/Lower Platen: <b>LT-PL-01 / LT-PL-02</b></div>
              <div className="col-span-4 px-2 py-1 font-mono text-[10px]">Point Load Tester: <b>{findEqCodeOnly(['po', 'point'], 'LT-PO-02')}</b> · Caliper: <b>{findEqCodeOnly(['dc', 'cal'], 'LT-DC-01')}</b></div>
            </div>
          </div>

          <div className="border-2 border-slate-900 overflow-x-auto">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Test Result (ASTM D5731-16 — FST06-RKT-D5731-2-260421)
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-50 font-extrabold">
                  <th className="border-r border-slate-800 px-2.5 py-1 text-left">Test Parameter</th>
                  <th className="border-r border-slate-800 px-2.5 py-1 text-center">Specimen 1</th>
                  <th className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-500">Specimen 2</th>
                  <th className="px-2.5 py-1 text-center text-slate-500">Specimen 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400 font-mono">
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Moisture Condition (Note 2)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">AR (As received)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Test type + direction (Note 3 &amp; 4)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.mode === 'diametral' ? 'D + R (Diametral)' : 'A + R (Axial)'}</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Distance between platens D / Average D (mm)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.dMm.toFixed(1)}</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Width W / Average W (mm)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.wMm.toFixed(1)}</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Equivalent core diameter, De (Note 9) (mm)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.deMm.toFixed(2)}</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Failure Load, P (kN) [Fail Time: {structured.failSec}s]</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.loadKn.toFixed(2)}</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Point Load Index, Is (Note 9) (MPa)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.isUncorrMpa.toFixed(2)} (F = {structured.fFactor.toFixed(3)})</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">—</td><td className="px-2.5 py-1 text-center text-slate-400">—</td></tr>
                <tr className="bg-sky-50/70"><td className="border-r border-slate-800 px-2.5 py-1.5 font-sans font-extrabold">Point Load Index, Is50 (Note 9) (MPa)</td><td className="border-r border-slate-800 px-2.5 py-1.5 text-center font-black text-brand-deep">{structured.is50Mpa.toFixed(2)} MPa</td><td className="border-r border-slate-800 px-2.5 py-1.5 text-center text-slate-400">—</td><td className="px-2.5 py-1.5 text-center text-slate-400">—</td></tr>
                <tr><td className="border-r border-slate-800 px-2.5 py-1 font-sans font-semibold">Failure Mode (Note 6) &amp; Failure Type (Note 5)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center font-bold">{structured.mode === 'diametral' ? 'a (Valid diametral)' : 'b (Valid axial)'} · m (Material failure)</td><td className="border-r border-slate-800 px-2.5 py-1 text-center text-slate-400">a / b / d *</td><td className="px-2.5 py-1 text-center text-slate-400">a / b / d *</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* =====================================================================
          5) STP07-PLT Appendix B & C (Plate Loading Test — PLT)
         ===================================================================== */}
      {structured?.kind === 'PLT' && (
        <>
          <div className="border-2 border-slate-900">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Appendix B — Standard Loading Schedule &amp; Design Parameters (STP07-PLT)
            </div>
            <div className="grid grid-cols-12 divide-y divide-slate-400 font-mono text-[10.5px]">
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-sans font-bold border-r border-slate-400">Working Pressure (kPa):</div>
              <div className="col-span-3 px-2 py-1 font-bold border-r border-slate-400">{structured.workingKpa} kPa ({(structured.workingKpa * structured.areaM2).toFixed(1)} kN)</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-sans font-bold border-r border-slate-400">300% Test Pressure (kPa):</div>
              <div className="col-span-3 px-2 py-1 font-bold">{structured.workingKpa * 3} kPa ({(structured.workingKpa * 3 * structured.areaM2).toFixed(1)} kN)</div>

              <div className="col-span-3 bg-slate-50 px-2 py-1 font-sans font-bold border-r border-slate-400">Plate Size &amp; Area:</div>
              <div className="col-span-3 px-2 py-1 font-bold border-r border-slate-400">{structured.plateShape === 'circular' ? `Ø${structured.plateSizeMm}mm` : `${structured.plateSizeMm}×${structured.plateSizeMm}mm`} ({structured.areaM2.toFixed(4)} m²)</div>
              <div className="col-span-3 bg-slate-50 px-2 py-1 font-sans font-bold border-r border-slate-400">Load Cell &amp; Dial Gauges:</div>
              <div className="col-span-3 px-2 py-1 font-bold">{findEqCodeOnly(['lc', 'load'], 'LT-LC-01')} / LT-DG-01~04</div>
            </div>
          </div>

          <div className="border-2 border-slate-900 overflow-x-auto">
            <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
              Appendix C — Sample Test Record Sheet (Incremental Loading Method — STP07-PLT)
            </div>
            <table className="w-full border-collapse text-center text-[10.5px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-50 font-extrabold">
                  <th className="border-r border-slate-800 px-1.5 py-1">Date</th>
                  <th className="border-r border-slate-800 px-2 py-1">Time / Stage</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Temp (°C)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Applied Pressure (kPa)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Applied Load (kN)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Dial Gauge 1 (mm)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Dial Gauge 2 (mm)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Dial Gauge 3 (mm)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Dial Gauge 4 (mm)</th>
                  <th className="border-r border-slate-800 px-1.5 py-1">Average Reading (mm)</th>
                  <th className="px-1.5 py-1">Cumulative Def. S (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400 font-mono">
                {structured.steps.map((st, idx) => (
                  <tr key={idx}>
                    <td className="border-r border-slate-800 px-1.5 py-1">{dateOnly}</td>
                    <td className="border-r border-slate-800 px-2 py-1 font-sans font-bold">{st.stepName}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1">{parseFloat(siteForm.ambientTemp) || 26.5}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1 font-bold">{st.pressureKpa.toFixed(1)}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1 font-bold">{st.loadKn.toFixed(2)}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1">{st.g1.toFixed(2)}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1">{st.g2.toFixed(2)}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1">{st.g3.toFixed(2)}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1">{st.g4.toFixed(2)}</td>
                    <td className="border-r border-slate-800 px-1.5 py-1">{((st.g1 + st.g2 + st.g3 + st.g4) / 4).toFixed(2)}</td>
                    <td className="px-1.5 py-1 font-extrabold text-brand-deep">{st.meanMm.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t-2 border-slate-900 bg-slate-50 px-2.5 py-1.5 text-[10.5px]">
              <b>Remarks:</b> Peak Bearing Pressure q = <b>{structured.peakPressureKpa.toFixed(1)} kPa</b> ({structured.peakLoadKn.toFixed(1)} kN); Max Settlement S = <b>{structured.peakSettlementMm.toFixed(2)} mm</b> (0.15B Limit ≤ {structured.limit015BMm.toFixed(1)} mm → <b>{structured.pass015B ? 'PASS' : 'EXCEED'}</b>); Modulus ks = <b>{structured.ksPeak ? `${structured.ksPeak.toFixed(1)} MN/m³` : '—'}</b>; Es = <b>{structured.esMpa ? `${structured.esMpa.toFixed(2)} MPa` : '—'}</b>.
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          6) VC (Inclinometer) or SO (Crosshole Sonic Logging FST03) or Fallback
         ===================================================================== */}
      {structured?.kind === 'VC' && (
        <div className="border-2 border-slate-900 overflow-x-auto">
          <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
            Biaxial Inclinometer Verticality Profile Readings (A0 / A180 &amp; B0 / B180)
          </div>
          <table className="w-full border-collapse text-center text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-50 font-extrabold">
                <th className="border-r border-slate-800 px-2 py-1">Depth (m)</th>
                <th className="border-r border-slate-800 px-2 py-1">A0 (mm)</th>
                <th className="border-r border-slate-800 px-2 py-1">A180 (mm)</th>
                <th className="border-r border-slate-800 px-2 py-1">Checksum A</th>
                <th className="border-r border-slate-800 px-2 py-1">B0 (mm)</th>
                <th className="border-r border-slate-800 px-2 py-1">B180 (mm)</th>
                <th className="border-r border-slate-800 px-2 py-1">Checksum B</th>
                <th className="border-r border-slate-800 px-2 py-1">Drift R (mm)</th>
                <th className="px-2 py-1">Inclination (1 : N)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400 font-mono">
              {structured.rows.map((r, i) => (
                <tr key={i}>
                  <td className="border-r border-slate-800 px-2 py-1 font-bold">{r.depthM.toFixed(1)}</td>
                  <td className="border-r border-slate-800 px-2 py-1">{r.a0.toFixed(2)}</td>
                  <td className="border-r border-slate-800 px-2 py-1">{r.a180.toFixed(2)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-slate-600">{r.chkA.toFixed(2)}</td>
                  <td className="border-r border-slate-800 px-2 py-1">{r.b0.toFixed(2)}</td>
                  <td className="border-r border-slate-800 px-2 py-1">{r.b180.toFixed(2)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-slate-600">{r.chkB.toFixed(2)}</td>
                  <td className="border-r border-slate-800 px-2 py-1 font-extrabold text-brand-deep">{r.resMm.toFixed(2)}</td>
                  <td className="px-2 py-1 font-bold">1 : {Math.round(r.ratioN)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!structured && (
        <div className="border-2 border-slate-900 overflow-x-auto">
          <div className="border-b border-slate-900 bg-slate-100 px-2.5 py-1 font-extrabold">
            Recorded Worksheet Data ({templateMeta.worksheetFormCode})
          </div>
          <table className="w-full border-collapse text-[11px]">
            <tbody className="divide-y divide-slate-400">
              {measurementRows.map((r, idx) => (
                <tr key={idx}>
                  <td className="w-10 border-r border-slate-800 bg-slate-50 px-2 py-1 text-center font-mono">{idx + 1}</td>
                  <td className="w-2/5 border-r border-slate-800 px-2.5 py-1 font-bold">
                    <input
                      value={r.parameter}
                      onChange={(e) =>
                        setMeasurementRows((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, parameter: e.target.value } : it))
                        )
                      }
                      className="w-full bg-transparent font-bold outline-none"
                    />
                  </td>
                  <td className="px-2.5 py-1 font-mono font-extrabold">
                    <input
                      value={r.value}
                      onChange={(e) =>
                        setMeasurementRows((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, value: e.target.value } : it))
                        )
                      }
                      className="w-full bg-transparent font-mono font-extrabold outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Site Photographs (if attached) */}
      {sitePhotos.length > 0 && (
        <div className="border-2 border-slate-900 p-2">
          <div className="font-extrabold text-[10.5px] mb-1.5">
            Attached Field Photographs / Setup Sketches ({sitePhotos.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sitePhotos.map((ph) => (
              <div key={ph.id} className="border border-slate-400 p-1.5">
                <img
                  src={ph.dataUrl}
                  alt={ph.caption || ph.fileName}
                  className="h-32 w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="mt-1 font-mono text-[9.5px] truncate">{ph.caption || ph.fileName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official LabTech Worksheet Footer: Tested By & Checked By (Matches FST02/FST03/FST04/FST05/FST06) */}
      <div className="border-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-900">
        <div className="p-2.5 flex flex-col justify-between min-h-24">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold">Tested By (Operator) :</span>
            <select
              aria-label="Worksheet Tested By"
              value={activeOperator}
              onChange={(e) => setActiveOperator(e.target.value)}
              className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-bold text-slate-950 print:border-none print:bg-transparent"
            >
              {operatorOptions.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
          <div className="my-1.5 flex items-center justify-between">
            {operatorSigDataUrl ? (
              <img src={operatorSigDataUrl} alt="Operator Signature" className="h-10 w-auto object-contain" />
            ) : (
              <span className="font-serif italic text-sm font-bold text-slate-800">{activeOperator.split('(')[0]}</span>
            )}
            {witnessSigDataUrl && (
              <div className="text-right">
                <img src={witnessSigDataUrl} alt="Witness" className="h-8 w-auto object-contain inline-block" />
                <div className="text-[9px] font-mono">Witness: {witnessName || 'RSS'}</div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-400 pt-1 flex justify-between font-mono text-[10px]">
            <span>Signature</span>
            <span>Date : {dateOnly}</span>
          </div>
        </div>

        <div className="p-2.5 flex flex-col justify-between min-h-24">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold">
              {cleanStp === 'KD' ? 'Checked and Authorize to Release Results By :' : 'Checked By :'}
            </span>
            <select
              aria-label="Worksheet Checked By"
              value={activeSignatory}
              onChange={(e) => setActiveSignatory(e.target.value)}
              className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-bold text-slate-950 print:border-none print:bg-transparent"
            >
              {signatoryOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="my-1.5">
            {signatorySigDataUrl ? (
              <img src={signatorySigDataUrl} alt="Checked Signature" className="h-10 w-auto object-contain" />
            ) : (
              <span className="font-serif italic text-sm font-bold text-slate-800">{activeSignatory.split('(')[0]}</span>
            )}
          </div>
          <div className="border-t border-slate-400 pt-1 flex justify-between font-mono text-[10px]">
            <span>Authorised Signature ({LABTECH_COMPANY_HEADER.hoklasRegNo})</span>
            <span>Date : {dateOnly}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-slate-600 pt-0.5">
        <span>{templateMeta.worksheetFormCode}</span>
        <span>{LABTECH_COMPANY_HEADER.nameEn} · {templateMeta.stpDocRef}</span>
      </div>
    </div>
  );
};
