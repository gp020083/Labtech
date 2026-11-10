import React, { useRef, useState } from 'react';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { FieldCalcPhoto, FieldCalcRecord, JobItem, SharedDocAttachment } from '../types';
import { downloadCalcRecordCsv, formatFileSize, readFileAsDataUrl } from '../utils';
import { compressSitePhotoFile } from '../utils/sitePhotoUtils';
import { buildHoklasFieldWorksheetData } from '../utils/limsProcessTools';
import { triggerCompletedExcelDownload } from '../utils/completedWorksheetGenerator';
import { Badge } from './Badge';
import { HoklasReportPreview } from './HoklasReportPreview';
import {
  X, FileSpreadsheet, FileText, Upload, Eye, Copy, Download,
  Camera, Trash2, CheckCircle2, Building2, Hash, Printer, Sparkles,
} from 'lucide-react';

export const TestRecordDetailModal: React.FC<{
  record: FieldCalcRecord | null;
  job?: JobItem | null;
  onClose: () => void;
}> = ({ record, job: propJob, onClose }) => {
  const {
    jobs, tests, equipment, calcRecords, updateCalcRecord,
    deleteCalcRecord, openPreviewDoc, pushToast, user,
  } = useApp();
  const { tx } = usePrefs();
  const perms = usePermissions();
  const [reportPreviewMode, setReportPreviewMode] = useState<'worksheet' | 'formal_report' | null>(null);
  const woInputRef = useRef<HTMLInputElement | null>(null);
  const wsInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  if (!record) return null;
  const liveRecord = calcRecords.find((r) => r.id === record.id) || record;
  const matchedJob = propJob || jobs.find((j) => j.no === liveRecord.jobNo) || null;
  const refNo = liveRecord.jobRefNo || liveRecord.id;

  const handleUploadDoc = async (kind: 'worksOrder' | 'worksheet', file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const doc: SharedDocAttachment = {
      id: `${kind}-${Date.now()}`,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      docType: kind === 'worksOrder' ? 'order_form' : 'worksheet_template',
      uploadedBy: user?.name || 'Operator',
      uploadedAt: now,
      serverPath: `Jobs/${liveRecord.jobNo}/${refNo}/${file.name}`,
      dataUrl,
    };
    if (kind === 'worksOrder') {
      updateCalcRecord(liveRecord.id, { worksOrderAttachment: doc });
      pushToast(tx('已夾附 Works Order 委託單', 'Works Order Form attached'), `${refNo} · ${file.name}`);
    } else {
      updateCalcRecord(liveRecord.id, { worksheetAttachment: doc });
      pushToast(tx('已夾附已簽署測試工作紙', 'Signed Worksheet attached'), `${refNo} · ${file.name}`);
    }
  };

  const handleUploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentPhotos = liveRecord.sitePhotos || [];
    const added: FieldCalcPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const comp = await compressSitePhotoFile(files[i]);
      if (!comp) continue;
      added.push({
        id: `ph-${Date.now()}-${i}`,
        fileName: files[i].name,
        dataUrl: comp.dataUrl,
        caption: files[i].name,
        mimeType: 'image/jpeg',
        originalSizeBytes: comp.originalSizeBytes,
        compressedSizeBytes: comp.compressedSizeBytes,
        width: comp.width,
        height: comp.height,
        source: 'picker',
      });
    }
    const nextPhotos = [...currentPhotos, ...added].slice(0, 4);
    updateCalcRecord(liveRecord.id, { sitePhotos: nextPhotos });
    pushToast(tx('已新增現場測試相片', 'Site photo attached'), `${refNo} (${nextPhotos.length} 張)`);
  };

  const handleDownloadOfficialExcel = () => {
    const ws = buildHoklasFieldWorksheetData({
      record: liveRecord,
      job: matchedJob,
      equipment,
      tests,
    });
    triggerCompletedExcelDownload({
      stpCode: liveRecord.stpCode,
      reportRefNo: ws.reportRefNo,
      jobRefNo: ws.jobRefNo,
      worksOrderNo: ws.worksOrderNo,
      batchNo: ws.batchNo,
      sampleId: ws.sampleId,
      testedAt: ws.testedAt,
      jobNo: ws.jobNo,
      companyProjNo: ws.companyProjNo,
      projectTitle: ws.projectTitle,
      clientName: ws.clientName,
      siteLocation: ws.siteLocation,
      locationNote: ws.locationNote,
      ambientTemp: '26.5 °C',
      weatherNote: 'Fine / Sunny',
      operatorName: ws.operatorName,
      approvedSignatory: ws.approvedSignatory,
      pass: ws.pass,
      equipmentRows: ws.equipmentList,
      measurementRows: ws.rows,
      structured: liveRecord.structuredData,
      tests,
      equipmentRegistry: equipment,
      job: matchedJob,
      record: liveRecord,
    });
    pushToast(tx('已下載官方英文 Excel 工作紙', 'Downloaded Official English Excel Worksheet'), `${refNo}.xlsx`);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden">
        {/* Executive Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                <Hash className="h-3.5 w-3.5 text-amber-300" /> {refNo}
              </span>
              <span className="rounded-lg bg-brand-wash px-2.5 py-1 font-mono text-xs font-extrabold text-brand-deep">
                {liveRecord.stpCode}
              </span>
              <Badge tone={liveRecord.pass ? 'ok' : 'warn'}>
                {liveRecord.pass ? tx('PASS 合規', 'PASS Compliant') : tx('REVIEW 需覆核', 'REVIEW Required')}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                <Building2 className="h-3 w-3 text-brand" />
                {tx('歸屬工程地盤：', 'Linked Site: ')}
                <span className="font-mono font-extrabold text-brand-deep">{liveRecord.jobNo}</span>
                {matchedJob ? ` · ${matchedJob.shortName}` : ''}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">{liveRecord.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Top 4-Card Metadata Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="text-[11px] font-semibold text-slate-400">{tx('對應工程及地盤', 'Project & Site')}</div>
              <select
                value={liveRecord.jobNo}
                onChange={(e) => {
                  const nextJob = jobs.find((j) => j.no === e.target.value);
                  updateCalcRecord(liveRecord.id, {
                    jobNo: e.target.value,
                    projectTitle: nextJob?.project || nextJob?.shortName || e.target.value,
                  });
                  pushToast(tx('已更新紀錄歸屬地盤', 'Updated linked project site'), `${refNo} → ${e.target.value}`);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-extrabold text-slate-900"
              >
                {jobs.map((j) => (
                  <option key={j.no} value={j.no}>{j.no} · {j.shortName}</option>
                ))}
              </select>
              <div className="mt-1 truncate text-[11px] text-slate-500">{matchedJob?.project || liveRecord.projectTitle || '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="text-[11px] font-semibold text-slate-400">{tx('委託客戶及工程單號', 'Client & Works Order No.')}</div>
              <div className="mt-1 font-bold text-slate-900 truncate">{liveRecord.clientName || matchedJob?.client || '—'}</div>
              <div className="mt-0.5 font-mono text-[11px] font-semibold text-brand-deep">
                WO: {liveRecord.worksOrderNo || '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="text-[11px] font-semibold text-slate-400">{tx('批號及樣本識別編號', 'Batch No. & Sample ID')}</div>
              <div className="mt-1 font-mono font-bold text-slate-900 truncate">Batch: {liveRecord.batchNo || '—'}</div>
              <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-600 truncate">
                Sample: {liveRecord.sampleId || '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="text-[11px] font-semibold text-slate-400">{tx('測試位置及負責人員', 'Location & Operator')}</div>
              <div className="mt-1 font-bold text-slate-900 truncate">{liveRecord.locationNote || '—'}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {liveRecord.operatorName} · {liveRecord.testedAt}
              </div>
            </div>
          </div>

          {/* Block 1: Test Calculation Result & Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-extrabold text-slate-900 text-sm">
                1. {tx('現場測試計算結果及數據摘要', 'Test Calculation Result & Data Summary')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(liveRecord.summary);
                    pushToast(tx('已複製計算結果摘要', 'Copied calculation summary'), refNo);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-brand" /> {tx('複製結果', 'Copy Result')}
                </button>
                <button
                  type="button"
                  onClick={() => matchedJob && downloadCalcRecordCsv(liveRecord, matchedJob)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-brand" /> CSV
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 font-mono text-xs text-slate-800 leading-relaxed overflow-x-auto">
              {liveRecord.summary}
            </pre>
            {liveRecord.signatureDataUrl && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5">
                <div>
                  <div className="font-extrabold text-emerald-900">
                    ✍️ {tx('現場見證簽署', 'Site Witness Sign-off')}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {liveRecord.signedBy || 'Witness'} ({liveRecord.signedRole || 'RE / RSS'}) · {liveRecord.signedAt || liveRecord.testedAt}
                  </div>
                </div>
                <img
                  src={liveRecord.signatureDataUrl}
                  alt="Witness Signature"
                  className="h-11 rounded-lg border border-emerald-200 bg-white px-2 py-0.5 object-contain"
                />
              </div>
            )}
          </div>

          {/* Block 2: Bundled Works Order Form, Official Worksheet & Formal Report */}
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/20 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 font-extrabold text-slate-900 text-sm">
                <Sparkles className="h-4 w-4 text-brand" />
                2. {tx('隨附工程文件夾：Works Order 委託單、官方英文工作紙及正式報告', 'Bundled Dossier: Works Order Form, Official Worksheet & Formal Report')}
              </div>
              <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                ✓ {tx('已自動關聯並夾附', 'Auto-Linked & Bundled')}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Card A: Works Order Form */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">
                      📄 {tx('工程測試委託單', 'Works Order / Test Request Form')}
                    </span>
                    <Badge tone={liveRecord.worksOrderAttachment ? 'ok' : 'info'}>
                      {liveRecord.worksOrderAttachment
                        ? tx('已上載正本', 'Uploaded')
                        : tx('標準 FQS08 委託單', 'Standard FQS08')}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {liveRecord.worksOrderAttachment
                      ? `${liveRecord.worksOrderAttachment.fileName} (${liveRecord.worksOrderAttachment.fileSize}) · ${liveRecord.worksOrderAttachment.uploadedAt}`
                      : tx(
                          `工程單號：${liveRecord.worksOrderNo || '未填寫'} · 可直接預覽標準委託單或上載客戶簽發之委託單掃描本`,
                          `Works Order No.: ${liveRecord.worksOrderNo || 'N/A'} · Preview standard order form or upload client Works Order scan`
                        )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {liveRecord.worksOrderAttachment ? (
                    <button
                      type="button"
                      onClick={() =>
                        openPreviewDoc({
                          title: `${refNo} · Works Order (${liveRecord.worksOrderAttachment!.fileName})`,
                          subtitle: `${liveRecord.jobNo} · ${liveRecord.worksOrderNo || ''}`,
                          url: liveRecord.worksOrderAttachment!.dataUrl || `/server-docs/forms/${liveRecord.worksOrderAttachment!.fileName}`,
                          fileName: liveRecord.worksOrderAttachment!.fileName,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> {tx('預覽已上載委託單', 'Preview Uploaded Works Order')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openPreviewDoc({
                          title: `FQS08 · Works Order / Test Request Form (${refNo})`,
                          subtitle: `${liveRecord.jobNo} · WO: ${liveRecord.worksOrderNo || '—'} · Client: ${liveRecord.clientName || matchedJob?.client || '—'}`,
                          url: '/server-docs/forms/FQS08_Order_Form_Test_Request.doc',
                          fileName: 'FQS08_Order_Form_Test_Request.doc',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-brand" /> {tx('預覽 FQS08 委託單', 'Preview FQS08 Order Form')}
                    </button>
                  )}
                  <input
                    ref={woInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadDoc('worksOrder', f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => woInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-wash/50 px-3 py-2 font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {liveRecord.worksOrderAttachment
                      ? tx('更換委託單檔案', 'Replace Works Order')
                      : tx('上載 Works Order 檔案', 'Upload Works Order')}
                  </button>
                </div>
              </div>

              {/* Card B: Official Completed Worksheet & Formal Report */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">
                      📋 {tx('官方英文測試工作紙及正式報告', 'Official English Worksheet & Formal Report')}
                    </span>
                    <Badge tone="ok">{tx('已自動生成', 'Auto-Generated')}</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {liveRecord.worksheetAttachment
                      ? `${tx('已夾附簽署版：', 'Signed Scan: ')}${liveRecord.worksheetAttachment.fileName} (${liveRecord.worksheetAttachment.fileSize})`
                      : tx(
                          '系統已根據現場計算數據及樣本資料自動生成全英文官方工作紙及 HOKLAS 正式報告',
                          'Automatically generated full-English Official Worksheet & HOKLAS Formal Report from test data'
                        )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReportPreviewMode('worksheet')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> {tx('開啟英文 Worksheet', 'Open English Worksheet')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportPreviewMode('formal_report')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {tx('開啟正式報告', 'Open Formal Report')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadOfficialExcel}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 font-extrabold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" /> .xlsx
                  </button>
                  <input
                    ref={wsInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadDoc('worksheet', f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => wsInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-brand" /> {tx('上載簽署掃描本', 'Upload Signed Scan')}
                  </button>
                  {liveRecord.worksheetAttachment && (
                    <button
                      type="button"
                      onClick={() =>
                        openPreviewDoc({
                          title: `${refNo} · Signed Worksheet (${liveRecord.worksheetAttachment!.fileName})`,
                          subtitle: `${liveRecord.jobNo} · ${liveRecord.stpCode}`,
                          url: liveRecord.worksheetAttachment!.dataUrl || `/server-docs/forms/${liveRecord.worksheetAttachment!.fileName}`,
                          fileName: liveRecord.worksheetAttachment!.fileName,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-brand-wash/60 px-2.5 py-2 font-extrabold text-brand-deep cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> {tx('檢視掃描本', 'View Scan')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Block 3: Site Test Photos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 font-extrabold text-slate-900 text-sm">
                <Camera className="h-4 w-4 text-brand" />
                3. {tx(`現場測試相片紀錄 (${liveRecord.sitePhotos?.length || 0})`, `Site Test Photos (${liveRecord.sitePhotos?.length || 0})`)}
              </div>
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleUploadPhoto(e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-wash/60 px-3 py-1.5 font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" /> {tx('新增現場相片', 'Add Site Photo')}
                </button>
              </div>
            </div>

            {!liveRecord.sitePhotos || liveRecord.sitePhotos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-slate-400">
                {tx('暫未附有現場測試相片，可點擊右上角「新增現場相片」上載並夾附於此測試紀錄內', 'No site photos attached yet. Click "Add Site Photo" above to attach.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {liveRecord.sitePhotos.map((ph, idx) => (
                  <div key={ph.id} className="group relative rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5">
                    <img
                      src={ph.dataUrl}
                      alt={ph.caption || ph.fileName}
                      referrerPolicy="no-referrer"
                      onClick={() =>
                        openPreviewDoc({
                          title: `${refNo} · ${ph.caption || ph.fileName}`,
                          subtitle: `${liveRecord.jobNo} · Site Photo #${idx + 1}`,
                          url: ph.dataUrl,
                          fileName: ph.fileName,
                        })
                      }
                      className="h-32 w-full rounded-lg object-cover bg-slate-900 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="truncate font-semibold text-slate-700">{ph.caption || ph.fileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (liveRecord.sitePhotos || []).filter((item) => item.id !== ph.id);
                          updateCalcRecord(liveRecord.id, { sitePhotos: next });
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title={tx('移除相片', 'Remove photo')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-xs">
          <button
            type="button"
            onClick={() => {
              deleteCalcRecord(liveRecord.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 font-bold text-rose-600 hover:bg-rose-50 cursor-pointer" hidden={!perms.canDeleteRecords}
          >
            <Trash2 className="h-3.5 w-3.5" /> {tx('刪除此測試紀錄', 'Delete Record')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
          >
            {tx('關閉視窗', 'Close Window')}
          </button>
        </div>
      </div>

      <HoklasReportPreview
        record={reportPreviewMode ? liveRecord : null}
        job={matchedJob}
        initialDocMode={reportPreviewMode || 'worksheet'}
        onClose={() => setReportPreviewMode(null)}
      />
    </div>
  );
};
