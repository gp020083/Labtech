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
} from '../utils/completedWorksheetGenerator';
import { downloadCalcRecordCsv, getHkTodayIso } from '../utils';
import {
  X,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  FileCheck2,
  Camera,
  PenTool,
  Plus,
  Trash2,
  Eraser,
  ShieldCheck,
  FileSpreadsheet,
  Award,
  ClipboardList,
} from 'lucide-react';

export interface HoklasDynamicSiteDetails {
  jobNo?: string;
  companyProjNo?: string;
  projectTitle?: string;
  clientName?: string;
  siteLocation?: string;
  locationNote?: string;
  ambientTemp?: string;
  weatherNote?: string;
}

export interface HoklasReportPreviewProps {
  /** Optional saved or draft FieldCalcRecord */
  record?: FieldCalcRecord | null;
  /** Optional JobItem associated with the record */
  job?: JobItem | null;
  /** Optional explicit list of equipment IDs (e.g. ['LT-KM-04', 'LT-MT-06']) to populate on the sheet */
  equipmentIds?: string[];
  /** Optional explicit map of equipment ID -> Calibration Due Date override */
  calibrationDueDates?: Record<string, string>;
  /** Optional explicit equipment rows */
  equipmentItems?: HoklasWorksheetEquipmentRow[];
  /** Optional explicit site details override */
  siteDetails?: HoklasDynamicSiteDetails;
  /** Optional explicit test parameter/value rows override */
  testValues?: HoklasWorksheetRow[];
  /** Optional explicit Operator name override */
  operatorName?: string;
  /** Optional explicit Approved Signatory name override */
  approvedSignatory?: string;
  /** Optional structured calculator payload (FC / BL / PLT / PO / KD / VC) */
  structuredData?: StructuredCalcPayload;
  /** Initial document view mode: Completed Field Worksheet vs Official Formal Test Report */
  initialDocMode?: 'worksheet' | 'formal_report';
  /** Close handler */
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

  const baseWorksheet = useMemo(() => {
    return buildHoklasFieldWorksheetData({
      record: fallbackRecord,
      job: resolvedJob,
      equipment,
      tests,
    });
  }, [fallbackRecord, resolvedJob, equipment, tests]);

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

  const [siteForm, setSiteForm] = useState({
    jobNo: siteDetails?.jobNo || baseWorksheet.jobNo,
    companyProjNo: siteDetails?.companyProjNo || baseWorksheet.companyProjNo,
    projectTitle: siteDetails?.projectTitle || baseWorksheet.projectTitle,
    clientName: siteDetails?.clientName || baseWorksheet.clientName,
    siteLocation: siteDetails?.siteLocation || baseWorksheet.siteLocation,
    locationNote: siteDetails?.locationNote || baseWorksheet.locationNote,
    ambientTemp: siteDetails?.ambientTemp || '26.5 °C',
    weatherNote: siteDetails?.weatherNote || 'Fine / Sunny',
  });

  const initialEqRows = useMemo<HoklasWorksheetEquipmentRow[]>(() => {
    if (equipmentItems && equipmentItems.length > 0) {
      return equipmentItems.map((e) => ({
        ...e,
        calDue: calibrationDueDates?.[e.code] || e.calDue,
      }));
    }
    if (equipmentIds && equipmentIds.length > 0) {
      return equipmentIds.map((code) => {
        const found = equipment.find((e) => e.code.toUpperCase() === code.toUpperCase());
        return {
          code: found?.code || code,
          name: found?.name || 'Calibrated Test Instrument',
          model: found?.model || '—',
          serial: found?.serial || '—',
          calDue: calibrationDueDates?.[code] || found?.certDue || found?.due || '—',
          source: found?.currentLoan?.jobNo === baseWorksheet.jobNo ? 'on_site' : 'recommended_lab',
        };
      });
    }
    return baseWorksheet.equipmentList.map((e) => ({
      ...e,
      calDue: calibrationDueDates?.[e.code] || e.calDue,
    }));
  }, [equipmentItems, equipmentIds, calibrationDueDates, equipment, baseWorksheet]);

  const [eqRows, setEqRows] = useState<HoklasWorksheetEquipmentRow[]>(initialEqRows);
  const [addEqCode, setAddEqCode] = useState<string>('');

  const [measurementRows, setMeasurementRows] = useState<HoklasWorksheetRow[]>(
    testValues && testValues.length > 0 ? testValues : baseWorksheet.rows
  );

  const [activeOperator, setActiveOperator] = useState<string>(
    propOperatorName || baseWorksheet.operatorName
  );
  const [activeSignatory, setActiveSignatory] = useState<string>(
    propApprovedSignatory || baseWorksheet.approvedSignatory
  );
  const [signatoryEndorsed, setSignatoryEndorsed] = useState<boolean>(true);

  React.useEffect(() => {
    setSiteForm({
      jobNo: siteDetails?.jobNo || baseWorksheet.jobNo,
      companyProjNo: siteDetails?.companyProjNo || baseWorksheet.companyProjNo,
      projectTitle: siteDetails?.projectTitle || baseWorksheet.projectTitle,
      clientName: siteDetails?.clientName || baseWorksheet.clientName,
      siteLocation: siteDetails?.siteLocation || baseWorksheet.siteLocation,
      locationNote: siteDetails?.locationNote || baseWorksheet.locationNote,
      ambientTemp: siteDetails?.ambientTemp || '26.5 °C',
      weatherNote: siteDetails?.weatherNote || 'Fine / Sunny',
    });
    setEqRows(initialEqRows);
    setMeasurementRows(testValues && testValues.length > 0 ? testValues : baseWorksheet.rows);
    setActiveOperator(propOperatorName || baseWorksheet.operatorName);
    setActiveSignatory(propApprovedSignatory || baseWorksheet.approvedSignatory);
  }, [baseWorksheet, initialEqRows, siteDetails, testValues, propOperatorName, propApprovedSignatory]);

  const [activeSignPadTarget, setActiveSignPadTarget] = useState<'operator' | 'signatory' | null>(null);
  const [operatorSigDataUrl, setOperatorSigDataUrl] = useState<string | null>(null);
  const [signatorySigDataUrl, setSignatorySigDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const inUseEquipment = useMemo(() => equipment.filter((e) => e.inUse !== 'N'), [equipment]);

  const signatoryOptions = useMemo(() => {
    if (stpMethod?.approvedSignatories?.length) return stpMethod.approvedSignatories;
    return [
      'Shih Chak Lung, Ben (Director / HOKLAS AS)',
      'Lam Hoi Fan, James (HOKLAS Approved Signatory)',
      'Tang Man Fu, Edmond (HOKLAS Approved Signatory)',
      'Yu Wai Chun, Kelvin (HOKLAS Approved Signatory)',
      'Chu Kar Wai, Peter (Senior Tech / HOKLAS AS)',
    ];
  }, [stpMethod]);

  const operatorOptions = useMemo(() => {
    const names = accounts.map((a) => `${a.zh ? `${a.zh} ` : ''}${a.name}`);
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

  const handleRemoveEquipmentRow = (code: string) => {
    setEqRows((prev) => prev.filter((r) => r.code !== code));
  };

  const handleUpdateEquipmentDue = (code: string, newDue: string) => {
    setEqRows((prev) => prev.map((r) => (r.code === code ? { ...r, calDue: newDue } : r)));
  };

  const handleAddMeasurementRow = () => {
    setMeasurementRows((prev) => [...prev, { parameter: 'Additional Observation', value: '—' }]);
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
      reportRefNo: baseWorksheet.reportRefNo,
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
      tx('已產生並下載 Completed Excel 工作簿 (.xls)', 'Generated & Downloaded Completed Excel (.xls)'),
      `${downloadedName} (1_Completed_Worksheet + 2_Formal_Report)`
    );
  };

  const handleCopyReport = () => {
    const text = [
      docMode === 'formal_report'
        ? `=== LABTECH TESTING LTD · HOKLAS 298 OFFICIAL TEST REPORT ===`
        : `=== LABTECH TESTING LTD · HOKLAS 298 COMPLETED FIELD WORKSHEET ===`,
      `Report Ref: ${baseWorksheet.reportRefNo} | Template: ${templateMeta.templateFileCode} (${baseWorksheet.stpDocCode} ${baseWorksheet.stpRev})`,
      `Job No.: ${siteForm.jobNo} (${siteForm.companyProjNo}) | Site: ${siteForm.siteLocation}`,
      `Sample / Pile Ref: ${siteForm.locationNote} | Tested At: ${baseWorksheet.testedAt}`,
      `Ambient Temp: ${siteForm.ambientTemp} | Weather: ${siteForm.weatherNote}`,
      `Instruments: ${eqRows.map((e) => `${e.code} (S/N:${e.serial}, Cal Due:${e.calDue})`).join('; ') || 'Standard Calibrated Set'}`,
      `--- Measurements & Calculation ---`,
      ...measurementRows.map((r, i) => `${i + 1}. ${r.parameter}: ${r.value}`),
      `--- Uncertainty & Sign-off ---`,
      `Measurement Uncertainty: ${templateMeta.uncertaintyStatement}`,
      `Compliance: ${baseWorksheet.pass ? 'PASS (Conforms to Specification)' : 'REVIEW REQUIRED'}`,
      `Tested By (Operator): ${activeOperator}`,
      baseWorksheet.signedBy
        ? `Site Representative Witness: ${baseWorksheet.signedBy} (${baseWorksheet.signedRole || 'Site Witness'}) at ${baseWorksheet.signedAt || baseWorksheet.testedAt}`
        : '',
      `HOKLAS Approved Signatory: ${activeSignatory}`,
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
        <div className="flex flex-col gap-2.5 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="rounded-lg bg-brand px-2.5 py-1 font-mono text-xs font-extrabold text-white shrink-0">
                {baseWorksheet.worksheetCode}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold truncate">
                  {docMode === 'formal_report'
                    ? tx(
                        `${templateMeta.formalReportTitleZh} (A4 Formal Report)`,
                        `${templateMeta.formalReportTitleEn}`
                      )
                    : tx(
                        `${templateMeta.templateTitleZh} (Completed Worksheet)`,
                        `${templateMeta.templateTitleEn}`
                      )}
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
                {tx('📊 匯出 Completed Excel (.xls 雙分頁含公式)', '📊 Export Completed Excel (.xls)')}
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

          {/* Mode Switcher Bar: Completed Worksheet vs Formal HOKLAS Test Report */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
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
                  `1. Completed Worksheet 完成工作紙 (${baseWorksheet.worksheetCode})`,
                  `1. Completed Field Worksheet (${baseWorksheet.worksheetCode})`
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
                {tx(
                  '2. Formal Test Report 正式測試報告 (A4 Official Certificate)',
                  '2. Formal HOKLAS Test Report (Official Certificate)'
                )}
              </button>
            </div>
            <span className="text-[11px] font-mono text-emerald-300">
              ✓ {tx('底板來源：', 'Template Base: ')}
              {templateMeta.templateFileCode}
            </span>
          </div>
        </div>

        {/* Printable A4 Sheet Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible">
          <div className="mx-auto max-w-[210mm] rounded-2xl border border-slate-300 bg-white p-5 sm:p-8 shadow-sm space-y-5 text-xs text-slate-900 print:rounded-none print:border-none print:p-4 print:shadow-none">
            {/* Sheet Header (Adapts to Completed Worksheet vs Formal Test Report) */}
            {docMode === 'formal_report' ? (
              <div className="border-b-2 border-slate-900 pb-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <img src="/labtech-logo.png" alt="LaBTECH" className="h-8 w-auto" referrerPolicy="no-referrer" />
                      <div>
                        <div className="text-sm font-black tracking-wide text-slate-900">
                          LABTECH TESTING LIMITED
                        </div>
                        <div className="font-mono text-[10px] font-bold text-slate-600">
                          Room 1205, 12/F, Leader Industrial Centre, 57-59 Au Pui Wan Street, Fo Tan, N.T., Hong Kong
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HOKLAS Endorsement Box */}
                  <div className="flex items-center gap-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 px-3.5 py-2 shrink-0">
                    <ShieldCheck className="h-7 w-7 text-emerald-700 shrink-0" />
                    <div className="font-mono text-[10px] leading-tight">
                      <div className="font-black text-slate-900">
                        {templateMeta.accredited ? 'HOKLAS ACCREDITED LAB' : 'ENGINEERING TEST CERTIFICATE'}
                      </div>
                      <div className="font-bold text-emerald-800">Reg. No. HOKLAS 298</div>
                      <div className="text-slate-500">Report No.: {baseWorksheet.reportRefNo}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-white">
                  <div className="text-sm sm:text-base font-black tracking-wider uppercase">
                    {templateMeta.formalReportTitleEn}
                  </div>
                  <div className="text-[11px] font-bold text-slate-300 mt-0.5">
                    {templateMeta.formalReportTitleZh} — {templateMeta.testStandard}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <img src="/labtech-logo.png" alt="LaBTECH" className="h-7 w-auto" referrerPolicy="no-referrer" />
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      HOKLAS Reg. No. 298 · Construction Materials &amp; Geotechnics
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                    {templateMeta.templateTitleEn}
                  </h2>
                  <div className="text-xs font-bold text-slate-700">
                    {templateMeta.templateTitleZh} —{' '}
                    <span className="font-mono text-brand-deep">{templateMeta.testStandard}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-[11px] space-y-0.5 shrink-0">
                  <div>
                    <span className="text-slate-500">Worksheet Ref:</span>{' '}
                    <strong className="text-slate-900">{baseWorksheet.reportRefNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Excel Template:</span>{' '}
                    <strong className="text-brand-deep">{ baseWorksheet.worksheetCode }</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Controlled STP:</span>{' '}
                    <strong className="text-slate-900">{templateMeta.stpDocRef}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Date &amp; Time:</span>{' '}
                    <strong className="text-slate-900 tabular-nums">{baseWorksheet.testedAt}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Site & Job Particulars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  1. Project &amp; Site Particulars (工程及地盤資料)
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-[11px] font-extrabold ${
                    baseWorksheet.pass
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {baseWorksheet.pass ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> PASS 合規 (Conforms to Spec)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-700" /> REVIEW REQUIRED 需覆核
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="sm:col-span-3 bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b sm:border-r border-slate-200">
                  Site ID / Job No.
                </div>
                <div className="sm:col-span-3 px-3 py-1.5 border-b sm:border-r border-slate-200">
                  <input
                    value={siteForm.jobNo}
                    onChange={(e) => setSiteForm({ ...siteForm, jobNo: e.target.value })}
                    className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-mono font-extrabold text-slate-900 outline-none print:border-none"
                  />
                </div>
                <div className="sm:col-span-3 bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b sm:border-r border-slate-200">
                  Pile / Sample Ref.
                </div>
                <div className="sm:col-span-3 px-3 py-1.5 border-b border-slate-200">
                  <input
                    value={siteForm.locationNote}
                    onChange={(e) => setSiteForm({ ...siteForm, locationNote: e.target.value })}
                    className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-mono font-bold text-brand-deep outline-none print:border-none"
                  />
                </div>

                <div className="sm:col-span-3 bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b sm:border-r border-slate-200">
                  Contract / Project
                </div>
                <div className="sm:col-span-9 px-3 py-1.5 border-b border-slate-200">
                  <input
                    value={siteForm.projectTitle}
                    onChange={(e) => setSiteForm({ ...siteForm, projectTitle: e.target.value })}
                    className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-semibold text-slate-900 outline-none print:border-none"
                  />
                </div>

                <div className="sm:col-span-3 bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b sm:border-r border-slate-200">
                  Site Location Address
                </div>
                <div className="sm:col-span-5 px-3 py-1.5 border-b sm:border-r border-slate-200">
                  <input
                    value={siteForm.siteLocation}
                    onChange={(e) => setSiteForm({ ...siteForm, siteLocation: e.target.value })}
                    className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-semibold text-slate-800 outline-none print:border-none"
                  />
                </div>
                <div className="sm:col-span-2 bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b sm:border-r border-slate-200">
                  Client / RSS
                </div>
                <div className="sm:col-span-2 px-3 py-1.5 border-b border-slate-200">
                  <input
                    value={siteForm.clientName}
                    onChange={(e) => setSiteForm({ ...siteForm, clientName: e.target.value })}
                    className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-semibold text-slate-800 outline-none print:border-none"
                  />
                </div>

                <div className="sm:col-span-3 bg-slate-50 px-3 py-2 font-bold text-slate-600 sm:border-r border-slate-200">
                  Env. Condition
                </div>
                <div className="sm:col-span-3 px-3 py-1.5 sm:border-r border-slate-200 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Temp:</span>
                  <input
                    value={siteForm.ambientTemp}
                    onChange={(e) => setSiteForm({ ...siteForm, ambientTemp: e.target.value })}
                    className="w-24 rounded border border-slate-200 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-900 print:border-none"
                  />
                </div>
                <div className="sm:col-span-3 bg-slate-50 px-3 py-2 font-bold text-slate-600 sm:border-r border-slate-200">
                  Weather
                </div>
                <div className="sm:col-span-3 px-3 py-1.5">
                  <input
                    value={siteForm.weatherNote}
                    onChange={(e) => setSiteForm({ ...siteForm, weatherNote: e.target.value })}
                    className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-900 print:border-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Calibrated Equipment Traceability */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-brand" />
                  2. Equipment IDs &amp; Calibration Traceability (在場／配屬校準儀器及到期日)
                </h3>

                <div className="flex items-center gap-1.5 print:hidden">
                  <select
                    value={addEqCode}
                    onChange={(e) => setAddEqCode(e.target.value)}
                    aria-label="Add Equipment to Worksheet"
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-800 outline-none focus:border-brand"
                  >
                    <option value="">{tx('+ 選擇儀器加入記錄表...', '+ Add Instrument ID...')}</option>
                    {inUseEquipment.map((eq) => (
                      <option key={eq.code} value={eq.code}>
                        {eq.code} — {eq.name} (Due: {eq.certDue || eq.due})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!addEqCode}
                    onClick={handleAddEquipmentRow}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-extrabold text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> {tx('加入', 'Add')}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Eq. ID</th>
                      <th className="px-3 py-2">Instrument Description</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Serial No.</th>
                      <th className="px-3 py-2">Cal Due Date</th>
                      <th className="px-3 py-2">Assignment Status</th>
                      <th className="w-8 px-2 py-2 print:hidden" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {eqRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-slate-500 text-center">
                          No specific equipment checked out — standard HOKLAS calibrated set applies
                        </td>
                      </tr>
                    ) : (
                      eqRows.map((eq) => (
                        <tr key={eq.code}>
                          <td className="px-3 py-2 font-mono font-extrabold text-slate-900">{eq.code}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{eq.name}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{eq.model}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{eq.serial}</td>
                          <td className="px-3 py-1.5 font-mono font-bold text-emerald-800 tabular-nums">
                            <input
                              value={eq.calDue}
                              onChange={(e) => handleUpdateEquipmentDue(eq.code, e.target.value)}
                              className="w-28 rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-mono text-xs font-extrabold text-emerald-800 outline-none print:border-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-[11px] font-bold">
                            {eq.source === 'on_site' ? (
                              <span className="text-brand-deep">📍 Checked Out to {siteForm.jobNo}</span>
                            ) : (
                              <span className="text-slate-600">🏠 Lab Calibrated Inventory</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right print:hidden">
                            <button
                              type="button"
                              onClick={() => handleRemoveEquipmentRow(eq.code)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Remove equipment row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Test-Specific Completed Worksheet Grid & Engineering Charts (FC / BL / PLT / VC) */}
            {activeStructured?.kind === 'FC' && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-brand" />
                  3. Completed Flow Cone Worksheet Table — FST05-GTT-C939 (流錐法清水校準及雙次流秒表)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sky-50 border-b border-slate-300 font-extrabold text-slate-800">
                      <tr>
                        <th className="px-3 py-2">1725 mL Water Check (s)</th>
                        <th className="px-3 py-2">Grout Temp (°C)</th>
                        <th className="px-3 py-2">Trial Run 1 T1 (s)</th>
                        <th className="px-3 py-2">Trial Run 2 T2 (s)</th>
                        <th className="px-3 py-2">Mean Efflux Time (s)</th>
                        <th className="px-3 py-2">Repeatability |T1 − T2|</th>
                        <th className="px-3 py-2">ASTM C939 Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      <tr>
                        <td className="px-3 py-2.5 font-bold">
                          {activeStructured.waterCheckSec.toFixed(1)} s{' '}
                          <span className="text-[10px] text-emerald-700">(8.0±0.2s)</span>
                        </td>
                        <td className="px-3 py-2.5">{activeStructured.groutTempC.toFixed(1)} °C</td>
                        <td className="px-3 py-2.5 font-bold">{activeStructured.t1Sec.toFixed(1)} s</td>
                        <td className="px-3 py-2.5 font-bold">{activeStructured.t2Sec.toFixed(1)} s</td>
                        <td className="px-3 py-2.5 text-sm font-black text-brand-deep bg-brand-wash/30">
                          {activeStructured.meanSec.toFixed(1)} s
                        </td>
                        <td className="px-3 py-2.5 font-bold">
                          {activeStructured.diffSec.toFixed(1)} s (≤ 1.8 s)
                        </td>
                        <td className="px-3 py-2.5 font-sans font-extrabold">
                          {activeStructured.repeatOk && activeStructured.waterOk ? (
                            <span className="text-emerald-700">✓ PASS</span>
                          ) : (
                            <span className="text-rose-700">⚠ RE-TEST</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeStructured?.kind === 'BL' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-brand" />
                  3. Completed Grout Bleeding &amp; Expansion Worksheet — FST04-GTT-C940 (各時段讀數及泌水膨脹曲線)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sky-50 border-b border-slate-300 font-extrabold text-slate-800">
                      <tr>
                        <th className="px-3 py-2">Elapsed Time</th>
                        <th className="px-3 py-2">
                          Initial {activeStructured.unit === 'mL' ? 'V1 (mL)' : 'H1 (mm)'}
                        </th>
                        <th className="px-3 py-2">
                          Upper Surface {activeStructured.unit === 'mL' ? 'V2 (mL)' : 'H2 (mm)'}
                        </th>
                        <th className="px-3 py-2">
                          Grout Surface {activeStructured.unit === 'mL' ? 'Vg (mL)' : 'Hg (mm)'}
                        </th>
                        <th className="px-3 py-2">Bleed ({activeStructured.unit})</th>
                        <th className="px-3 py-2">Bleeding (%)</th>
                        <th className="px-3 py-2">Free Expansion (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {activeStructured.intervals.map((iv, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-sans font-bold text-slate-800">{iv.timeLabel}</td>
                          <td className="px-3 py-1.5 text-slate-600">{activeStructured.v1}</td>
                          <td className="px-3 py-1.5 font-bold">{iv.v2}</td>
                          <td className="px-3 py-1.5 font-bold">{iv.vg}</td>
                          <td className="px-3 py-1.5">{iv.bleedAmt.toFixed(2)}</td>
                          <td className="px-3 py-1.5 font-extrabold text-brand-deep">
                            {iv.bleedPct.toFixed(2)}%
                          </td>
                          <td className="px-3 py-1.5 font-bold text-sky-700">
                            {iv.expPct >= 0 ? '+' : ''}
                            {iv.expPct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-extrabold">
                        <td colSpan={4} className="px-3 py-2 font-sans text-slate-900">
                          FINAL CERTIFIED RESULT (Spec Limit ≤ {activeStructured.specLimitPct.toFixed(1)}%)
                        </td>
                        <td className="px-3 py-2">
                          {activeStructured.finalBleedAmt.toFixed(2)} {activeStructured.unit}
                        </td>
                        <td className="px-3 py-2 text-brand-deep">
                          {activeStructured.finalBleedPct.toFixed(2)}% (
                          {activeStructured.isPass ? 'PASS' : 'EXCEED'})
                        </td>
                        <td className="px-3 py-2 text-sky-800">
                          {activeStructured.finalExpPct >= 0 ? '+' : ''}
                          {activeStructured.finalExpPct.toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Engineering Curve for Bleeding & Expansion vs Time */}
                {activeStructured.intervals.length > 1 && (
                  <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 mb-1.5">
                      <span>📈 Bleeding (%) &amp; Free Expansion (%) vs. Elapsed Time Curve</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Max Spec Limit: {activeStructured.specLimitPct.toFixed(1)}%
                      </span>
                    </div>
                    <svg viewBox="0 0 520 125" className="w-full h-28 bg-white rounded-lg border border-slate-200">
                      <line x1="45" y1="15" x2="45" y2="100" stroke="#94a3b8" strokeWidth="1" />
                      <line x1="45" y1="100" x2="495" y2="100" stroke="#94a3b8" strokeWidth="1" />
                      {(() => {
                        const maxY = Math.max(
                          activeStructured.specLimitPct * 1.25,
                          ...activeStructured.intervals.map((i) => Math.max(i.bleedPct, Math.abs(i.expPct))),
                          1
                        );
                        const ptsBleed = activeStructured.intervals
                          .map((iv, idx) => {
                            const x =
                              45 +
                              (idx / Math.max(1, activeStructured.intervals.length - 1)) * 430;
                            const y = 100 - (Math.min(maxY, Math.max(0, iv.bleedPct)) / maxY) * 80;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ');
                        const specY =
                          100 - (Math.min(maxY, activeStructured.specLimitPct) / maxY) * 80;
                        return (
                          <>
                            <line
                              x1="45"
                              y1={specY}
                              x2="495"
                              y2={specY}
                              stroke="#e11d48"
                              strokeDasharray="4 3"
                              strokeWidth="1"
                            />
                            <text x="498" y={specY + 3} fontSize="8" fill="#e11d48" fontFamily="monospace">
                              Spec
                            </text>
                            <polyline
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="2.5"
                              points={ptsBleed}
                            />
                            {activeStructured.intervals.map((iv, idx) => {
                              const x =
                                45 +
                                (idx / Math.max(1, activeStructured.intervals.length - 1)) * 430;
                              const y = 100 - (Math.min(maxY, Math.max(0, iv.bleedPct)) / maxY) * 80;
                              return (
                                <g key={idx}>
                                  <circle cx={x} cy={y} r="3.5" fill="#0284c7" />
                                  <text
                                    x={x}
                                    y={Math.max(12, y - 6)}
                                    textAnchor="middle"
                                    fontSize="8.5"
                                    fontWeight="bold"
                                    fill="#0f172a"
                                    fontFamily="monospace"
                                  >
                                    {iv.bleedPct.toFixed(2)}%
                                  </text>
                                  <text
                                    x={x}
                                    y="114"
                                    textAnchor="middle"
                                    fontSize="8"
                                    fill="#475569"
                                    fontFamily="sans-serif"
                                  >
                                    {iv.timeLabel.replace(' (3hr)', '')}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            )}

            {activeStructured?.kind === 'PLT' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-brand" />
                  3. Completed Plate Load Test Worksheet — STP07-PLT Appendix C (分級荷載、四錶讀數及 P–S 沉降曲線)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sky-50 border-b border-slate-300 font-extrabold text-slate-800">
                      <tr>
                        <th className="px-2.5 py-2">Load Stage</th>
                        <th className="px-2 py-2">Load P (kN)</th>
                        <th className="px-2 py-2">Pressure q (kPa)</th>
                        <th className="px-2 py-2">G1 (mm)</th>
                        <th className="px-2 py-2">G2 (mm)</th>
                        <th className="px-2 py-2">G3 (mm)</th>
                        {activeStructured.gaugeCount === 4 && <th className="px-2 py-2">G4 (mm)</th>}
                        <th className="px-2.5 py-2">Mean S (mm)</th>
                        <th className="px-2.5 py-2">ks (MN/m³)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {activeStructured.steps.map((st, idx) => (
                        <tr key={idx}>
                          <td className="px-2.5 py-1.5 font-sans font-bold text-slate-800">{st.stepName}</td>
                          <td className="px-2 py-1.5 font-bold">{st.loadKn.toFixed(1)}</td>
                          <td className="px-2 py-1.5 font-bold text-slate-700">{st.pressureKpa.toFixed(1)}</td>
                          <td className="px-2 py-1.5">{st.g1.toFixed(2)}</td>
                          <td className="px-2 py-1.5">{st.g2.toFixed(2)}</td>
                          <td className="px-2 py-1.5">{st.g3.toFixed(2)}</td>
                          {activeStructured.gaugeCount === 4 && (
                            <td className="px-2 py-1.5">{st.g4.toFixed(2)}</td>
                          )}
                          <td className="px-2.5 py-1.5 font-extrabold text-brand-deep">
                            {st.meanMm.toFixed(2)}
                          </td>
                          <td className="px-2.5 py-1.5 font-bold text-slate-700">
                            {st.ks ? st.ks.toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-extrabold">
                        <td colSpan={3} className="px-2.5 py-2 font-sans text-slate-900">
                          PEAK VERIFICATION (0.15B Limit ≤ {activeStructured.limit015BMm.toFixed(1)} mm)
                        </td>
                        <td colSpan={activeStructured.gaugeCount === 4 ? 4 : 3} className="px-2 py-2">
                          Peak q = {activeStructured.peakPressureKpa.toFixed(1)} kPa ｜ Es ={' '}
                          {activeStructured.esMpa ? `${activeStructured.esMpa.toFixed(2)} MPa` : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-brand-deep">
                          {activeStructured.peakSettlementMm.toFixed(2)} mm
                        </td>
                        <td className="px-2.5 py-2 text-emerald-800">
                          {activeStructured.pass015B ? '✓ PASS' : '⚠ EXCEED'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Engineering Load-Settlement Curve (Applied Pressure q vs Mean Settlement S) */}
                {activeStructured.steps.length > 1 && (
                  <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 mb-1.5">
                      <span>📈 Applied Bearing Pressure q (kPa) vs. Mean Settlement S (mm) Curve</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Peak q = {activeStructured.peakPressureKpa.toFixed(1)} kPa · Smax ={' '}
                        {activeStructured.peakSettlementMm.toFixed(2)} mm
                      </span>
                    </div>
                    <svg viewBox="0 0 520 135" className="w-full h-32 bg-white rounded-lg border border-slate-200">
                      <line x1="50" y1="15" x2="50" y2="110" stroke="#94a3b8" strokeWidth="1" />
                      <line x1="50" y1="15" x2="495" y2="15" stroke="#94a3b8" strokeWidth="1" />
                      {(() => {
                        const maxQ = Math.max(...activeStructured.steps.map((s) => s.pressureKpa), 100) * 1.1;
                        const maxS = Math.max(...activeStructured.steps.map((s) => s.meanMm), 5) * 1.15;
                        const points = activeStructured.steps
                          .map((s) => {
                            const x = 50 + (Math.max(0, s.pressureKpa) / maxQ) * 425;
                            const y = 15 + (Math.max(0, s.meanMm) / maxS) * 90;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ');
                        return (
                          <>
                            <polyline fill="none" stroke="#0f172a" strokeWidth="2.2" points={points} />
                            {activeStructured.steps.map((s, idx) => {
                              const x = 50 + (Math.max(0, s.pressureKpa) / maxQ) * 425;
                              const y = 15 + (Math.max(0, s.meanMm) / maxS) * 90;
                              return (
                                <g key={idx}>
                                  <circle cx={x} cy={y} r="3.5" fill="#0284c7" />
                                  <text
                                    x={x}
                                    y={Math.min(128, y + 11)}
                                    textAnchor="middle"
                                    fontSize="8"
                                    fontWeight="bold"
                                    fill="#0f172a"
                                    fontFamily="monospace"
                                  >
                                    {s.meanMm.toFixed(2)}mm
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            )}

            {activeStructured?.kind === 'VC' && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-brand" />
                  3. Completed Biaxial Inclinometer Verticality Profile Table (雙軸測斜儀各深度正反測讀數表)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sky-50 border-b border-slate-300 font-extrabold text-slate-800">
                      <tr>
                        <th className="px-2.5 py-2">Depth (m)</th>
                        <th className="px-2.5 py-2">A0</th>
                        <th className="px-2.5 py-2">A180</th>
                        <th className="px-2.5 py-2">B0</th>
                        <th className="px-2.5 py-2">B180</th>
                        <th className="px-2.5 py-2">Checksum A / B</th>
                        <th className="px-2.5 py-2">Drift R (mm)</th>
                        <th className="px-2.5 py-2">Gradient 1:N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {activeStructured.rows.map((r, idx) => (
                        <tr key={idx}>
                          <td className="px-2.5 py-1.5 font-bold">{r.depthM.toFixed(1)}</td>
                          <td className="px-2.5 py-1.5">{r.a0.toFixed(2)}</td>
                          <td className="px-2.5 py-1.5">{r.a180.toFixed(2)}</td>
                          <td className="px-2.5 py-1.5">{r.b0.toFixed(2)}</td>
                          <td className="px-2.5 py-1.5">{r.b180.toFixed(2)}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">
                            {r.chkA.toFixed(2)} / {r.chkB.toFixed(2)}
                          </td>
                          <td className="px-2.5 py-1.5 font-extrabold text-brand-deep">
                            {r.resMm.toFixed(2)}
                          </td>
                          <td className="px-2.5 py-1.5 font-bold">1:{Math.round(r.ratioN)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Key-Value Table (Editable) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-brand" />
                  {activeStructured ? '3B.' : '3.'} Summary Test Parameters &amp; Certified Values (核心量測指標及報告摘要)
                </h3>
                <button
                  type="button"
                  onClick={handleAddMeasurementRow}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer print:hidden"
                >
                  <Plus className="h-3 w-3 text-brand" /> {tx('新增數據列', 'Add Value Row')}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-700">
                    <tr>
                      <th className="w-12 px-3 py-2 text-center">#</th>
                      <th className="w-2/5 px-3 py-2">Measured Parameter / Item</th>
                      <th className="px-3 py-2">Recorded Value &amp; Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {measurementRows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 text-center font-mono text-slate-400 tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-bold text-slate-700">
                          <input
                            value={r.parameter}
                            onChange={(e) =>
                              setMeasurementRows((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, parameter: e.target.value } : item))
                              )
                            }
                            className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-bold text-slate-800 outline-none print:border-none"
                          />
                        </td>
                        <td className="px-3 py-1.5 font-mono font-extrabold text-slate-900 tabular-nums">
                          <input
                            value={r.value}
                            onChange={(e) =>
                              setMeasurementRows((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item))
                              )
                            }
                            className="w-full rounded border border-transparent focus:border-slate-300 px-1 py-0.5 font-mono font-extrabold text-slate-900 outline-none print:border-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Measurement Uncertainty Statement Box */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div>
                  <span className="font-extrabold text-indigo-950">
                    📐 Measurement Uncertainty ({templateMeta.muRefCode}):{' '}
                  </span>
                  <span className="font-mono font-semibold text-indigo-900">
                    {templateMeta.uncertaintyStatement}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-indigo-700">HOKLAS Policy Cl. 7.8</span>
              </div>
            </div>

            {/* Section 4: Attached Site Photos / Sketches (if any) */}
            {baseWorksheet.sitePhotos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-brand" />
                  4. Site Setup Photographs &amp; Sketches (現場儀器架設相片／草圖 — {baseWorksheet.sitePhotos.length} 張)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {baseWorksheet.sitePhotos.map((ph) => (
                    <div key={ph.id} className="rounded-xl border border-slate-300 bg-slate-50 p-2.5 space-y-1.5">
                      <img
                        src={ph.dataUrl}
                        alt={ph.caption || ph.fileName}
                        referrerPolicy="no-referrer"
                        className="h-44 w-full rounded-lg object-cover bg-white border border-slate-200"
                      />
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="font-bold text-slate-800 truncate">{ph.caption || ph.fileName}</span>
                        <span className="font-mono text-[10px] text-slate-500">Synced to Drive</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Dedicated Signature Blocks for Operator, Site Witness & HOKLAS Approved Signatory */}
            <div className="space-y-2.5 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-brand" />
                  {baseWorksheet.sitePhotos.length > 0 ? '5.' : '4.'} Dedicated Signature Blocks — Operator &amp; Approved Signatory (當值操作員及 HOKLAS 授權簽署人簽署欄)
                </h3>

                <div className="flex items-center gap-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSignPadTarget(activeSignPadTarget === 'operator' ? null : 'operator')
                    }
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      activeSignPadTarget === 'operator'
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✍️ {tx('手寫操作員簽名', 'Sign Operator')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSignPadTarget(activeSignPadTarget === 'signatory' ? null : 'signatory')
                    }
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      activeSignPadTarget === 'signatory'
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🏅 {tx('手寫授權簽署人簽名', 'Sign Approved Signatory')}
                  </button>
                </div>
              </div>

              {activeSignPadTarget && (
                <div className="rounded-2xl border border-brand/40 bg-brand-wash/30 p-3 space-y-2 print:hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-brand-deep">
                      {activeSignPadTarget === 'operator'
                        ? tx(`請在下方簽署：當值操作員 (${activeOperator})`, `Sign below for Operator (${activeOperator})`)
                        : tx(`請在下方簽署：HOKLAS 授權簽署人 (${activeSignatory})`, `Sign below for Approved Signatory (${activeSignatory})`)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={clearPadCanvas}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                      >
                        <Eraser className="h-3 w-3" /> {tx('清除重簽', 'Clear')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSignPadTarget(null)}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-extrabold text-white cursor-pointer"
                      >
                        {tx('完成', 'Done')}
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={110}
                    onPointerDown={startPadDraw}
                    onPointerMove={movePadDraw}
                    onPointerUp={endPadDraw}
                    onPointerLeave={endPadDraw}
                    className="h-24 w-full touch-none rounded-xl border border-slate-300 bg-white cursor-crosshair"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Signature Block 1: Tested & Recorded By (Operator) */}
                <div className="rounded-xl border-2 border-slate-800 p-3.5 flex flex-col justify-between min-h-36 bg-white">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        OPERATOR SIGNATURE BLOCK
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-700">
                        FQS49 Op
                      </span>
                    </div>
                    <select
                      aria-label="Select Field Operator"
                      value={activeOperator}
                      onChange={(e) => setActiveOperator(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-extrabold text-slate-900 print:border-none print:bg-transparent print:px-0"
                    >
                      {operatorOptions.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <div className="text-[11px] text-slate-500">
                      Tested &amp; Recorded By ({baseWorksheet.stpCode})
                    </div>

                    {operatorSigDataUrl ? (
                      <img
                        src={operatorSigDataUrl}
                        alt="Operator Signature"
                        className="h-12 w-auto object-contain bg-slate-50 rounded border border-slate-200 px-2"
                      />
                    ) : (
                      <div className="pt-2 font-serif italic text-base font-bold text-slate-800 tracking-wide">
                        {activeOperator.split(',')[0]}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-400 pt-2 mt-3 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <span>Operator Signature</span>
                    <span>{baseWorksheet.testedAt.slice(0, 10)}</span>
                  </div>
                </div>

                {/* Signature Block 2: Site Representative / Witness */}
                <div className="rounded-xl border border-slate-300 p-3.5 flex flex-col justify-between min-h-36 bg-white">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      SITE WITNESS / RSS BLOCK
                    </div>
                    {baseWorksheet.signatureDataUrl ? (
                      <div className="mt-1.5 space-y-1">
                        <img
                          src={baseWorksheet.signatureDataUrl}
                          alt="Field Witness Signature"
                          referrerPolicy="no-referrer"
                          className="h-14 w-auto object-contain bg-slate-50 rounded border border-slate-200 px-2"
                        />
                        <div className="text-xs font-extrabold text-slate-900">
                          {baseWorksheet.signedBy || 'Site Representative'}
                          {baseWorksheet.signedRole ? ` (${baseWorksheet.signedRole})` : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 text-[11px] italic text-slate-400">
                        (On-site Engineer / Witness Signature &amp; Company Chop)
                      </div>
                    )}
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2 mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{baseWorksheet.signatureDataUrl ? '✓ Digital Sign-off' : 'Witness Signature'}</span>
                    <span>{(baseWorksheet.signedAt || baseWorksheet.testedAt).slice(0, 16)}</span>
                  </div>
                </div>

                {/* Signature Block 3: HOKLAS Approved Signatory */}
                <div className="rounded-xl border-2 border-slate-800 p-3.5 flex flex-col justify-between min-h-36 bg-white">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-deep">
                        APPROVED SIGNATORY BLOCK
                      </span>
                      <button
                        type="button"
                        onClick={() => setSignatoryEndorsed(!signatoryEndorsed)}
                        className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-emerald-800 cursor-pointer print:border-none"
                      >
                        <ShieldCheck className="h-3 w-3 text-emerald-700" />
                        HOKLAS 298
                      </button>
                    </div>

                    <select
                      aria-label="Select Approved Signatory"
                      value={activeSignatory}
                      onChange={(e) => setActiveSignatory(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-extrabold text-slate-900 print:border-none print:bg-transparent print:px-0"
                    >
                      {signatoryOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="text-[11px] text-emerald-800 font-semibold">
                      🏅 HOKLAS Approved Signatory ({baseWorksheet.stpCode})
                    </div>

                    {signatorySigDataUrl ? (
                      <img
                        src={signatorySigDataUrl}
                        alt="Approved Signatory Signature"
                        className="h-12 w-auto object-contain bg-slate-50 rounded border border-slate-200 px-2"
                      />
                    ) : signatoryEndorsed ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-mono font-extrabold text-emerald-900">
                        ✓ ENDORSED · {activeSignatory.split('(')[0].trim()}
                      </div>
                    ) : (
                      <div className="pt-3 text-[11px] italic text-slate-400">
                        (Approved Signatory Signature Space)
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-400 pt-2 mt-3 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <span>Approved Signatory</span>
                    <span>For Labtech Testing Ltd</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
              <span>
                {docMode === 'formal_report'
                  ? `Labtech Testing Limited · HOKLAS Reg. No. 298 Official Test Report (${baseWorksheet.reportRefNo})`
                  : `Labtech Testing Limited · Completed Field Worksheet (${templateMeta.templateFileCode})`}
              </span>
              <span>Synced with Google Drive 00_Database &amp; 05_User_Uploads</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HoklasReportPreview;
