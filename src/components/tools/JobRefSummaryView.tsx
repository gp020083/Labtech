import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { FieldCalcRecord } from '../../types';
import { buildHoklasFieldWorksheetData } from '../../utils/limsProcessTools';
import {
  getOfficialTemplateMeta,
  triggerCompletedExcelDownload,
  generateSequentialJobRefNo,
  collectPreviousClientOptions,
} from '../../utils/completedWorksheetGenerator';
import { HoklasReportPreview } from '../HoklasReportPreview';
import {
  Hash,
  Plus,
  Trash2,
  Search,
  FileSpreadsheet,
  Printer,
  Award,
  FolderKanban,
  Filter,
} from 'lucide-react';

export const JobRefSummaryView: React.FC<{
  onJumpToCalc?: (stpCode: string) => void;
}> = () => {
  const {
    jobs,
    equipment,
    tests,
    calcRecords,
    saveCalcRecord,
    deleteCalcRecord,
    pushToast,
  } = useApp();
  const { tx } = usePrefs();

  const [filterJobNo, setFilterJobNo] = useState<string>('ALL');
  const [filterStp, setFilterStp] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Dispatch Form State
  const [newJobNo, setNewJobNo] = useState<string>(jobs[0]?.no || 'LT0001');
  const [newStpCode, setNewStpCode] = useState<string>('FC');
  const [newClient, setNewClient] = useState<string>('');
  const [newWorksOrderNo, setNewWorksOrderNo] = useState<string>('');
  const [newBatchNo, setNewBatchNo] = useState<string>('');
  const [newSampleId, setNewSampleId] = useState<string>('');
  const [newLocationNote, setNewLocationNote] = useState<string>('');

  const [previewState, setPreviewState] = useState<{
    record: FieldCalcRecord;
    mode: 'worksheet' | 'formal_report';
  } | null>(null);
  const previousClients = useMemo(
    () => collectPreviousClientOptions(jobs, calcRecords),
    [jobs, calcRecords]
  );

  const nextPreviewRefNo = useMemo(
    () => generateSequentialJobRefNo(newJobNo, newStpCode, calcRecords),
    [newJobNo, newStpCode, calcRecords]
  );

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calcRecords.filter((r) => {
      if (filterJobNo !== 'ALL' && r.jobNo !== filterJobNo) return false;
      if (filterStp !== 'ALL' && r.stpCode !== filterStp) return false;
      if (!q) return true;
      const hay = [
        r.jobRefNo,
        r.jobNo,
        r.projectTitle,
        r.clientName,
        r.worksOrderNo,
        r.batchNo,
        r.sampleId,
        r.locationNote,
        r.operatorName,
        r.stpCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [calcRecords, filterJobNo, filterStp, searchQuery]);

  const handleQuickDispatch = () => {
    const job = jobs.find((j) => j.no === newJobNo);
    const assignedRef = generateSequentialJobRefNo(newJobNo, newStpCode, calcRecords);
    const meta = getOfficialTemplateMeta(newStpCode, tests);
    saveCalcRecord({
      jobNo: newJobNo,
      jobRefNo: assignedRef,
      clientName: newClient.trim() || undefined,
      worksOrderNo: newWorksOrderNo.trim() || undefined,
      batchNo: newBatchNo.trim() || undefined,
      sampleId: newSampleId.trim() || undefined,
      projectTitle: job?.project || job?.shortName || newJobNo,
      stpCode: newStpCode,
      title: `${newStpCode} (${meta.worksheetFormCode})`,
      locationNote: newLocationNote.trim() || undefined,
      summary: `[${newStpCode}] Job Ref. No. ${assignedRef} assigned for ${newJobNo}`,
      pass: true,
    });
    pushToast(
      tx(`已派發 Job Ref. No.: ${assignedRef}`, `Assigned Job Ref. No.: ${assignedRef}`),
      `${newJobNo} · ${job?.shortName || ''}`
    );
    setNewLocationNote('');
    setNewSampleId('');
  };
  const handleDownloadExcelForRecord = (r: FieldCalcRecord) => {
    const job = jobs.find((j) => j.no === r.jobNo) || null;
    const ws = buildHoklasFieldWorksheetData({
      record: r,
      job,
      equipment,
      tests,
    });
    const downloadedName = triggerCompletedExcelDownload({
      stpCode: r.stpCode,
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
      structured: r.structuredData,
      tests,
      equipmentRegistry: equipment,
      job,
      record: r,
    });
    pushToast(
      tx('已匯出官方 Excel (.xlsx)', 'Exported Official Excel (.xlsx)'),
      downloadedName
    );
  };

  const handleDeleteRecord = (r: FieldCalcRecord) => {
    const refLabel = r.jobRefNo || `HKL-${r.jobNo}-${r.id}`;
    deleteCalcRecord(r.id);
    pushToast(
      tx(`🗑️ 已刪除紀錄 ${refLabel}`, `🗑️ Deleted Record ${refLabel}`),
      `${r.jobNo} · ${r.stpCode}`
    );
  };

  const uniqueProjectsCount = new Set(calcRecords.map((r) => r.jobNo)).size;
  const passCount = calcRecords.filter((r) => r.pass).length;
  return (
    <div className="space-y-4 text-xs">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">
            {tx('已派發 Job Ref. No. 總數', 'Total Dispatched Ref. Nos.')}
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-indigo-950">
            {calcRecords.length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">
            {tx('涵蓋工程數量 (Projects)', 'Active Projects Logged')}
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-brand-deep">
            {uniqueProjectsCount}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">
            {tx('合格測試紀錄 (PASS)', 'Compliant Records (PASS)')}
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-emerald-700">
            {passCount}
          </div>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-indigo-800">
            {tx('下一個自動派發編號預覽', 'Next Auto Job Ref. No.')}
          </div>
          <div className="mt-1 font-mono text-base font-black text-indigo-950 truncate">
            {nextPreviewRefNo}
          </div>
        </div>
      </div>

      {/* Add / Dispatch New Job Reference No. Card */}
      <div className="rounded-3xl border border-indigo-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
              <Hash className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {tx('🎯 快速編配新 Job Reference No. (Assign New Job Ref. No.)', '🎯 Quick Dispatch New Job Reference No.')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {tx(
                  '選擇工程項目 (Project) 及測試方法 (Test Method)，即可為技術員編配獨立 Job Ref. No. 並登記至工程總表',
                  'Select Project and Test Method to assign a sequential Job Reference No. and log it to the registry.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickDispatch}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            {tx(`編配並新增 ${nextPreviewRefNo}`, `Assign & Add ${nextPreviewRefNo}`)}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div>
            <label className="font-bold text-slate-600">Project / Job No.</label>
            <select
              value={newJobNo}
              onChange={(e) => setNewJobNo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-900"
            >
              {jobs.map((j) => (
                <option key={j.no} value={j.no}>
                  {j.no} · {j.shortName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-600">Test Method</label>
            <select
              value={newStpCode}
              onChange={(e) => setNewStpCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-900"
            >
              <option value="FC">FC · Flow Cone (C939)</option>
              <option value="BL">BL · Grout Bleeding (C940)</option>
              <option value="KD">KD · Koden Ultrasonic (TM3)</option>
              <option value="PLT">PLT · Plate Load Test</option>
              <option value="PO">PO · Point Load (D5731)</option>
              <option value="VC">VC · Inclinometer</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-600">Client 客戶名稱 (手動輸入或下拉選擇歷史客戶)</label>
            <div className="mt-1 flex gap-1.5">
              <input
                list="summary-prev-clients"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Type Client Name..."
                className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-amber-50/30 px-2.5 py-2 font-bold text-slate-900"
              />
              <datalist id="summary-prev-clients">
                {previousClients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setNewClient(e.target.value);
                }}
                className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 font-bold text-slate-700"
              >
                <option value="">📂 歷史客戶...</option>
                {previousClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-600">Works Order No. (手動輸入)</label>
            <input
              value={newWorksOrderNo}
              onChange={(e) => setNewWorksOrderNo(e.target.value)}
              placeholder="e.g. WO/2026/018"
              className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-2.5 py-2 font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600">Location in Work</label>
            <input
              value={newLocationNote}
              onChange={(e) => setNewLocationNote(e.target.value)}
              placeholder="e.g. Pile P12 / Bay B"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600">Batch No. (手動輸入)</label>
            <input
              value={newBatchNo}
              onChange={(e) => setNewBatchNo(e.target.value)}
              placeholder="e.g. B-01"
              className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-2.5 py-2 font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600">Sample Identification No. (手動輸入)</label>
            <input
              value={newSampleId}
              onChange={(e) => setNewSampleId(e.target.value)}
              placeholder="e.g. GS-01"
              className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-2.5 py-2 font-mono font-bold text-slate-900"
            />
          </div>
        </div>
      </div>
      {/* Registry Filter Bar & Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx(
                `📋 Job Ref. No. 總表及測試工程紀錄 (${filteredRecords.length} / ${calcRecords.length})`,
                `📋 Job Ref. No. Registry & Project Summary (${filteredRecords.length} / ${calcRecords.length})`
              )}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tx('搜尋 Ref No / Client / WO / Sample ID...', 'Search Ref No / Client / WO...')}
                className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 w-56"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filterJobNo}
                onChange={(e) => setFilterJobNo(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none"
              >
                <option value="ALL">{tx('全部工程 (All Projects)', 'All Projects')}</option>
                {jobs.map((j) => (
                  <option key={j.no} value={j.no}>
                    {j.no} · {j.shortName}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filterStp}
              onChange={(e) => setFilterStp(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="ALL">{tx('全部測試 (All Tests)', 'All Tests')}</option>
              <option value="FC">FC · Flow Cone</option>
              <option value="BL">BL · Grout Bleeding</option>
              <option value="KD">KD · Koden Test</option>
              <option value="PLT">PLT · Plate Load</option>
              <option value="PO">PO · Point Load</option>
              <option value="VC">VC · Inclinometer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-extrabold text-slate-600 whitespace-nowrap">
              <tr>
                <th className="px-3 py-2.5">Job Reference No.</th>
                <th className="px-3 py-2.5">Project / Site</th>
                <th className="px-3 py-2.5">Client &amp; Works Order No.</th>
                <th className="px-3 py-2.5">Batch / Sample ID / Location</th>
                <th className="px-3 py-2.5">Operator &amp; Time</th>
                <th className="px-3 py-2.5 text-right">{tx('操作 / 生成及刪除', 'Actions / Gen & Delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">
                    {tx('暫無符合條件的 Job Ref. No. 紀錄', 'No matching Job Reference No. records found.')}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const matchedJob = jobs.find((j) => j.no === r.jobNo);
                  const refDisplay = r.jobRefNo || `HKL-${r.jobNo}-${r.id}`;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-block rounded-lg bg-indigo-100 px-2 py-0.5 font-mono text-xs font-extrabold text-indigo-950">
                          {refDisplay}
                        </span>
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                          {r.stpCode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-extrabold text-slate-900">{r.jobNo}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {r.projectTitle || matchedJob?.project || matchedJob?.shortName || r.jobNo}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800">
                          {r.clientName || matchedJob?.client || '—'}
                        </div>
                        <div className="font-mono text-[11px] text-amber-800">
                          WO: {r.worksOrderNo || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">
                        <div>Batch: {r.batchNo || '—'} · Sample: {r.sampleId || '—'}</div>
                        <div className="text-slate-500">Loc: {r.locationNote || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{r.operatorName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{r.testedAt}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadExcelForRecord(r)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-700 cursor-pointer"
                            title="Download Completed Official Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" /> .xlsx
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewState({ record: r, mode: 'worksheet' })}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" /> Worksheet
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewState({ record: r, mode: 'formal_report' })}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[11px] font-extrabold text-amber-950 hover:bg-amber-100 cursor-pointer"
                          >
                            <Award className="h-3.5 w-3.5 text-amber-700" /> Report
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            title="Delete Job Ref. No. Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> {tx('刪除', 'Del')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewState && (
        <HoklasReportPreview
          record={previewState.record}
          structuredData={previewState.record.structuredData}
          initialDocMode={previewState.mode}
          onClose={() => setPreviewState(null)}
        />
      )}
    </div>
  );
};
