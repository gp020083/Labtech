import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { FieldCalcRecord, JobItem } from '../types';
import {
  buildHoklasFieldWorksheetData,
  HoklasWorksheetEquipmentRow,
  HoklasWorksheetRow,
} from '../utils/limsProcessTools';
import {
  StructuredCalcPayload,
  getOfficialTemplateMeta,
  triggerCompletedExcelDownload,
  toEnglishWorksheetText,
} from '../utils/completedWorksheetGenerator';
import { downloadCalcRecordCsv, getHkTodayIso } from '../utils';
import { OfficialWorksheetView, OfficialFormSiteState } from './OfficialWorksheetView';
import { OfficialFormalReportView } from './OfficialFormalReportView';
import {
  X,
  Printer,
  Download,
  Copy,
  PenTool,
  Plus,
  Eraser,
  FileSpreadsheet,
  Award,
  ClipboardList,
} from 'lucide-react';

export interface HoklasDynamicSiteDetails {
  jobNo?: string;
  jobRefNo?: string;
  worksOrderNo?: string;
  companyProjNo?: string;
  projectTitle?: string;
  clientName?: string;
  siteLocation?: string;
  locationNote?: string;
  ambientTemp?: string;
  weatherNote?: string;
}

export interface HoklasReportPreviewProps {
  record?: FieldCalcRecord | null;
  job?: JobItem | null;
  equipmentIds?: string[];
  calibrationDueDates?: Record<string, string>;
  equipmentItems?: HoklasWorksheetEquipmentRow[];
  siteDetails?: HoklasDynamicSiteDetails;
  testValues?: HoklasWorksheetRow[];
  operatorName?: string;
  approvedSignatory?: string;
  structuredData?: StructuredCalcPayload;
  initialDocMode?: 'worksheet' | 'formal_report';
  onClose: () => void;
}

export const HoklasReportPreview: React.FC<HoklasReportPreviewProps> = ({
  record,
  job,
  equipmentIds,
  calibrationDueDates,
  equipmentItems,
  siteDetails,
  testValues,
  operatorName: propOperatorName,
  approvedSignatory: propApprovedSignatory,
  structuredData: propStructuredData,
  initialDocMode = 'worksheet',
  onClose,
}) => {
  const { jobs, equipment, tests, accounts, pushToast } = useApp();
  const { tx } = usePrefs();
  const [docMode, setDocMode] = useState<'worksheet' | 'formal_report'>(initialDocMode);

  React.useEffect(() => {
    setDocMode(initialDocMode);
  }, [initialDocMode, record?.id]);

  const resolvedJob = useMemo(() => {
    const jobCode = siteDetails?.jobNo || record?.jobNo;
    if (job) return job;
    if (jobCode) return jobs.find((j) => j.no === jobCode) || null;
    return jobs[0] || null;
  }, [job, siteDetails?.jobNo, record?.jobNo, jobs]);

  const fallbackRecord: FieldCalcRecord = useMemo(
    () =>
      record || {
        id: `HKL-${Date.now().toString().slice(-4)}`,
        jobNo: siteDetails?.jobNo || resolvedJob?.no || 'LT0001',
        stpCode: propStructuredData?.kind || 'KD',
        title: 'HOKLAS Field Test Record',
        locationNote: siteDetails?.locationNote || 'Standard Field Test Station',
        summary: testValues?.map((r) => `${r.parameter}: ${r.value}`).join('\n') || 'Field Measurement Record',
        pass: true,
        testedAt: `${getHkTodayIso()} 10:00`,
        operatorName: propOperatorName || 'Shih Chak Lung, Ben',
        structuredData: propStructuredData,
      },
    [record, siteDetails, resolvedJob, testValues, propOperatorName, propStructuredData]
  );

  const activeStructured = propStructuredData || fallbackRecord.structuredData;

  const baseWorksheet = useMemo(
    () =>
      buildHoklasFieldWorksheetData({
        record: fallbackRecord,
        job: resolvedJob,
        equipment,
        tests,
      }),
    [fallbackRecord, resolvedJob, equipment, tests]
  );

  const templateMeta = useMemo(
    () => getOfficialTemplateMeta(fallbackRecord.stpCode, tests),
    [fallbackRecord.stpCode, tests]
  );
  const stpMethod = useMemo(
    () => tests.find((t) => t.code === fallbackRecord.stpCode),
    [fallbackRecord.stpCode, tests]
  );

  const hasDynamicPayload = Boolean(
    record ||
      siteDetails ||
      propStructuredData ||
      (testValues && testValues.length > 0) ||
      (equipmentIds && equipmentIds.length > 0) ||
      (equipmentItems && equipmentItems.length > 0)
  );

  const [siteForm, setSiteForm] = useState<OfficialFormSiteState>({
    jobNo: toEnglishWorksheetText(siteDetails?.jobNo || baseWorksheet.jobNo, 'LT0001'),
    jobRefNo: toEnglishWorksheetText(siteDetails?.jobRefNo || fallbackRecord.jobRefNo || baseWorksheet.jobRefNo, baseWorksheet.reportRefNo),
    worksOrderNo: toEnglishWorksheetText(siteDetails?.worksOrderNo ?? fallbackRecord.worksOrderNo ?? baseWorksheet.worksOrderNo, ''),
    companyProjNo: toEnglishWorksheetText(siteDetails?.companyProjNo || baseWorksheet.companyProjNo, 'LT0001'),
    projectTitle: toEnglishWorksheetText(siteDetails?.projectTitle || baseWorksheet.projectTitle, baseWorksheet.jobNo),
    clientName: toEnglishWorksheetText(siteDetails?.clientName || baseWorksheet.clientName, 'CEDD'),
    siteLocation: toEnglishWorksheetText(siteDetails?.siteLocation || baseWorksheet.siteLocation, baseWorksheet.jobNo),
    locationNote: toEnglishWorksheetText(siteDetails?.locationNote || baseWorksheet.locationNote, 'Field Station'),
    ambientTemp: toEnglishWorksheetText(siteDetails?.ambientTemp || '26.5 °C', '26.5 °C'),
    weatherNote: toEnglishWorksheetText(siteDetails?.weatherNote || 'Fine / Sunny', 'Fine / Sunny'),
  });

  const initialEqRows = useMemo<HoklasWorksheetEquipmentRow[]>(() => {
    if (equipmentItems && equipmentItems.length > 0) {
      return equipmentItems.map((e) => ({
        ...e,
        name: toEnglishWorksheetText(e.name, 'Calibrated Test Instrument'),
        calDue: calibrationDueDates?.[e.code] || e.calDue,
      }));
    }
    if (equipmentIds && equipmentIds.length > 0) {
      return equipmentIds.map((code) => {
        const found = equipment.find((e) => e.code.toUpperCase() === code.toUpperCase());
        return {
          code: found?.code || code,
          name: toEnglishWorksheetText(found?.name, 'Calibrated Test Instrument'),
          model: found?.model || '—',
          serial: found?.serial || '—',
          calDue: calibrationDueDates?.[code] || found?.certDue || found?.due || '—',
          source: found?.currentLoan?.jobNo === baseWorksheet.jobNo ? 'on_site' : 'recommended_lab',
        };
      });
    }
    return baseWorksheet.equipmentList.map((e) => ({
      ...e,
      name: toEnglishWorksheetText(e.name, 'Calibrated Test Instrument'),
      calDue: calibrationDueDates?.[e.code] || e.calDue,
    }));
  }, [equipmentItems, equipmentIds, calibrationDueDates, equipment, baseWorksheet]);

  const [eqRows, setEqRows] = useState<HoklasWorksheetEquipmentRow[]>(initialEqRows);
  const [addEqCode, setAddEqCode] = useState<string>('');
  const [measurementRows, setMeasurementRows] = useState<HoklasWorksheetRow[]>(
    testValues && testValues.length > 0 ? testValues : baseWorksheet.rows
  );
  const [activeOperator, setActiveOperator] = useState<string>(
    toEnglishWorksheetText(propOperatorName || baseWorksheet.operatorName, 'Shih Chak Lung, Ben')
  );
  const [activeSignatory, setActiveSignatory] = useState<string>(
    toEnglishWorksheetText(propApprovedSignatory || baseWorksheet.approvedSignatory, 'Shih Chak Lung, Ben (HOKLAS AS)')
  );
  const [signatoryEndorsed] = useState<boolean>(true);

  React.useEffect(() => {
    setSiteForm({
      jobNo: toEnglishWorksheetText(siteDetails?.jobNo || baseWorksheet.jobNo, 'LT0001'),
      jobRefNo: toEnglishWorksheetText(siteDetails?.jobRefNo || fallbackRecord.jobRefNo || baseWorksheet.jobRefNo, baseWorksheet.reportRefNo),
      worksOrderNo: toEnglishWorksheetText(siteDetails?.worksOrderNo ?? fallbackRecord.worksOrderNo ?? baseWorksheet.worksOrderNo, ''),
      companyProjNo: toEnglishWorksheetText(siteDetails?.companyProjNo || baseWorksheet.companyProjNo, 'LT0001'),
      projectTitle: toEnglishWorksheetText(siteDetails?.projectTitle || baseWorksheet.projectTitle, baseWorksheet.jobNo),
      clientName: toEnglishWorksheetText(siteDetails?.clientName || baseWorksheet.clientName, 'CEDD'),
      siteLocation: toEnglishWorksheetText(siteDetails?.siteLocation || baseWorksheet.siteLocation, baseWorksheet.jobNo),
      locationNote: toEnglishWorksheetText(siteDetails?.locationNote || baseWorksheet.locationNote, 'Field Station'),
      ambientTemp: toEnglishWorksheetText(siteDetails?.ambientTemp || '26.5 °C', '26.5 °C'),
      weatherNote: toEnglishWorksheetText(siteDetails?.weatherNote || 'Fine / Sunny', 'Fine / Sunny'),
    });
    setEqRows(initialEqRows);
    setMeasurementRows(testValues && testValues.length > 0 ? testValues : baseWorksheet.rows);
    setActiveOperator(toEnglishWorksheetText(propOperatorName || baseWorksheet.operatorName, 'Shih Chak Lung, Ben'));
    setActiveSignatory(toEnglishWorksheetText(propApprovedSignatory || baseWorksheet.approvedSignatory, 'Shih Chak Lung, Ben (HOKLAS AS)'));
  }, [baseWorksheet, initialEqRows, siteDetails, testValues, propOperatorName, propApprovedSignatory, fallbackRecord]);

  const [activeSignPadTarget, setActiveSignPadTarget] = useState<'operator' | 'signatory' | null>(null);
  const [operatorSigDataUrl, setOperatorSigDataUrl] = useState<string | null>(null);
  const [signatorySigDataUrl, setSignatorySigDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const inUseEquipment = useMemo(() => equipment.filter((e) => e.inUse !== 'N'), [equipment]);
  const signatoryOptions = useMemo(() => {
    if (stpMethod?.approvedSignatories?.length) {
      return stpMethod.approvedSignatories.map((s) => toEnglishWorksheetText(s, s));
    }
    return [
      'Shih Chak Lung, Ben (Director / HOKLAS AS)',
      'Lam Hoi Fan, James (HOKLAS Approved Signatory)',
      'Tang Man Fu, Edmond (HOKLAS Approved Signatory)',
      'Yu Wai Chun, Kelvin (HOKLAS Approved Signatory)',
      'Chu Kar Wai, Peter (Senior Tech / HOKLAS AS)',
    ];
  }, [stpMethod]);

  const operatorOptions = useMemo(() => {
    const names = accounts.map((a) => toEnglishWorksheetText(a.name, a.name));
    if (!names.includes(activeOperator)) names.unshift(activeOperator);
    return names;
  }, [accounts, activeOperator]);

  if (!hasDynamicPayload) return null;

  const handleAddEquipmentRow = () => {
    if (!addEqCode) return;
    const found = inUseEquipment.find((e) => e.code === addEqCode);
    if (!found) return;
    if (eqRows.some((r) => r.code === found.code)) {
      pushToast(tx('此儀器已在記錄表內', 'Equipment already in table'), found.code);
      return;
    }
    setEqRows((prev) => [
      ...prev,
      {
        code: found.code,
        name: found.name,
        model: found.model || '—',
        serial: found.serial || '—',
        calDue: found.certDue || found.due || '—',
        source: found.currentLoan?.jobNo === siteForm.jobNo ? 'on_site' : 'recommended_lab',
      },
    ]);
    setAddEqCode('');
  };

  const startPadDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const movePadDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endPadDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (activeSignPadTarget === 'operator') setOperatorSigDataUrl(dataUrl);
    if (activeSignPadTarget === 'signatory') setSignatorySigDataUrl(dataUrl);
  };

  const clearPadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (activeSignPadTarget === 'operator') setOperatorSigDataUrl(null);
    if (activeSignPadTarget === 'signatory') setSignatorySigDataUrl(null);
  };

  const handlePrintWorksheet = () => {
    window.print();
  };

  const handleDownloadCompletedExcel = () => {
    const downloadedName = triggerCompletedExcelDownload({
      stpCode: fallbackRecord.stpCode,
      reportRefNo: siteForm.jobRefNo || baseWorksheet.reportRefNo,
      jobRefNo: siteForm.jobRefNo || baseWorksheet.jobRefNo,
      worksOrderNo: siteForm.worksOrderNo ?? '',
      testedAt: baseWorksheet.testedAt,
      jobNo: siteForm.jobNo,
      companyProjNo: siteForm.companyProjNo,
      projectTitle: siteForm.projectTitle,
      clientName: siteForm.clientName,
      siteLocation: siteForm.siteLocation,
      locationNote: siteForm.locationNote,
      ambientTemp: siteForm.ambientTemp,
      weatherNote: siteForm.weatherNote,
      operatorName: activeOperator,
      approvedSignatory: activeSignatory,
      pass: baseWorksheet.pass,
      equipmentRows: eqRows,
      measurementRows,
      structured: activeStructured,
      tests,
      equipmentRegistry: equipment,
      job: resolvedJob,
      record: fallbackRecord,
    });
    pushToast(
      tx('已產生並下載官方 Completed Excel (.xlsx)', 'Generated & Downloaded Official Completed Excel (.xlsx)'),
      `${downloadedName} (${templateMeta.templateFileCode})`
    );
  };

  const handleCopyReport = () => {
    const text = [
      docMode === 'formal_report'
        ? `=== LABTECH TESTING LTD · HOKLAS 298 OFFICIAL TEST REPORT ===`
        : `=== LABTECH TESTING LTD · HOKLAS 298 COMPLETED FIELD WORKSHEET ===`,
      `Report Ref: ${baseWorksheet.reportRefNo} | Template: ${templateMeta.templateFileCode}`,
      `Job No.: ${siteForm.jobNo} (${siteForm.companyProjNo}) | Site: ${siteForm.siteLocation}`,
      `Sample / Pile Ref: ${siteForm.locationNote} | Tested At: ${baseWorksheet.testedAt}`,
      `Ambient Temp: ${siteForm.ambientTemp} | Weather: ${siteForm.weatherNote}`,
      `Instruments: ${eqRows.map((e) => `${e.code} (S/N:${e.serial}, Cal Due:${e.calDue})`).join('; ')}`,
      `--- Measurements & Calculation ---`,
      ...measurementRows.map((r, i) => `${i + 1}. ${r.parameter}: ${r.value}`),
      `Measurement Uncertainty: ${templateMeta.uncertaintyStatement}`,
      `Tested By: ${activeOperator} | Checked / Approved Signatory: ${activeSignatory}`,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard?.writeText(text);
    pushToast(
      docMode === 'formal_report'
        ? tx('已複製 HOKLAS 正式測試報告全文', 'Copied HOKLAS Formal Report Text')
        : tx('已複製 HOKLAS 完成工作紙全文', 'Copied Completed Worksheet Text'),
      baseWorksheet.reportRefNo
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-2 sm:p-4 overflow-y-auto print:bg-white print:p-0"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[95vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:rounded-none print:border-none print:shadow-none">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="rounded-lg bg-brand px-2.5 py-1 font-mono text-xs font-extrabold text-white shrink-0">
                {baseWorksheet.worksheetCode}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold truncate">
                  {docMode === 'formal_report'
                    ? tx(`${templateMeta.formalReportTitleZh} (A4 正式報告)`, templateMeta.formalReportTitleEn)
                    : tx(`${templateMeta.templateTitleZh} (A4 官方工作紙)`, templateMeta.templateTitleEn)}
                </div>
                <div className="text-[11px] text-slate-300 font-mono truncate">
                  {templateMeta.templateFileCode} · {baseWorksheet.reportRefNo} · {templateMeta.stpDocRef}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadCompletedExcel}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {tx('📊 匯出官方 Excel (.xlsx 原生底板含 Logo)', '📊 Export Official Excel (.xlsx)')}
              </button>
              <button
                type="button"
                onClick={handlePrintWorksheet}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white hover:bg-brand-deep cursor-pointer whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" />
                {tx('🖨️ 列印 A4 / 另存 PDF', '🖨️ Print A4 / Save PDF')}
              </button>
              <button
                type="button"
                onClick={() => downloadCalcRecordCsv(fallbackRecord, resolvedJob || undefined)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <Copy className="h-3.5 w-3.5" /> {tx('複製', 'Copy')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher + Quick Sign & Equipment Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800 text-xs">
            <div className="inline-flex rounded-xl bg-slate-800 p-1 gap-1">
              <button
                type="button"
                onClick={() => setDocMode('worksheet')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-extrabold transition cursor-pointer ${
                  docMode === 'worksheet'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5 text-brand" />
                {tx(
                  `1. 官方測試工作紙 (${templateMeta.templateFileCode.replace('_Worksheet_template.xlsx', '')})`,
                  `1. Official Worksheet (${templateMeta.templateFileCode.replace('_Worksheet_template.xlsx', '')})`
                )}
              </button>
              <button
                type="button"
                onClick={() => setDocMode('formal_report')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-extrabold transition cursor-pointer ${
                  docMode === 'formal_report'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                {tx('2. HOKLAS 正式測試報告 (A4 Certificate)', '2. Formal HOKLAS Test Report')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <select
                aria-label="Tested By Operator"
                value={activeOperator}
                onChange={(e) => setActiveOperator(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-100"
              >
                {operatorOptions.map((op) => (
                  <option key={op} value={op}>
                    Tested: {op}
                  </option>
                ))}
              </select>
              <select
                aria-label="Approved Signatory"
                value={activeSignatory}
                onChange={(e) => setActiveSignatory(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-100"
              >
                {signatoryOptions.map((s) => (
                  <option key={s} value={s}>
                    Checked: {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setActiveSignPadTarget((prev) => (prev === 'operator' ? null : 'operator'))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <PenTool className="h-3 w-3" /> {tx('手寫簽名', 'Sign Pad')}
              </button>
              <div className="inline-flex items-center gap-1">
                <select
                  aria-label="Add Calibrated Equipment"
                  value={addEqCode}
                  onChange={(e) => setAddEqCode(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 max-w-[140px]"
                >
                  <option value="">{tx('+ 加儀器...', '+ Add Eq...')}</option>
                  {inUseEquipment.map((e) => (
                    <option key={e.code} value={e.code}>
                      {e.code} · {e.name}
                    </option>
                  ))}
                </select>
                {addEqCode && (
                  <button
                    type="button"
                    onClick={handleAddEquipmentRow}
                    className="rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeSignPadTarget && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">
                  {activeSignPadTarget === 'operator'
                    ? tx('繪製技術員簽名 (Tested By):', 'Draw Operator Signature:')
                    : tx('繪製核准簽署人簽名 (Checked By):', 'Draw Signatory Signature:')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSignPadTarget(
                      activeSignPadTarget === 'operator' ? 'signatory' : 'operator'
                    )
                  }
                  className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-200 hover:bg-slate-600 cursor-pointer"
                >
                  {tx('切換簽署角色', 'Switch Role')}
                </button>
                <button
                  type="button"
                  onClick={clearPadCanvas}
                  className="inline-flex items-center gap-1 rounded bg-rose-900/70 px-2 py-0.5 text-[10px] font-bold text-rose-200 hover:bg-rose-800 cursor-pointer"
                >
                  <Eraser className="h-3 w-3" /> {tx('清除', 'Clear')}
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={320}
                height={70}
                onPointerDown={startPadDraw}
                onPointerMove={movePadDraw}
                onPointerUp={endPadDraw}
                onPointerLeave={endPadDraw}
                className="h-14 w-64 rounded-lg bg-white border border-slate-400 cursor-crosshair touch-none"
              />
            </div>
          )}
        </div>

        {/* Printable Official LabTech A4 Sheet Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/80 print:bg-white print:p-0 print:overflow-visible">
          {docMode === 'formal_report' ? (
            <OfficialFormalReportView
              stpCode={fallbackRecord.stpCode}
              baseWorksheet={baseWorksheet}
              templateMeta={templateMeta}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              eqRows={eqRows}
              measurementRows={measurementRows}
              activeStructured={activeStructured}
              activeOperator={activeOperator}
              activeSignatory={activeSignatory}
              signatoryEndorsed={signatoryEndorsed}
              operatorSigDataUrl={operatorSigDataUrl}
              signatorySigDataUrl={signatorySigDataUrl}
            />
          ) : (
            <OfficialWorksheetView
              stpCode={fallbackRecord.stpCode}
              reportRefNo={baseWorksheet.reportRefNo}
              testedAt={baseWorksheet.testedAt}
              pass={baseWorksheet.pass}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              templateMeta={templateMeta}
              eqRows={eqRows}
              measurementRows={measurementRows}
              setMeasurementRows={setMeasurementRows}
              structured={activeStructured}
              activeOperator={activeOperator}
              setActiveOperator={setActiveOperator}
              operatorOptions={operatorOptions}
              activeSignatory={activeSignatory}
              setActiveSignatory={setActiveSignatory}
              signatoryOptions={signatoryOptions}
              operatorSigDataUrl={operatorSigDataUrl}
              signatorySigDataUrl={signatorySigDataUrl}
              witnessSigDataUrl={baseWorksheet.signatureDataUrl}
              witnessName={baseWorksheet.signedBy}
              witnessRole={baseWorksheet.signedRole}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HoklasReportPreview;
