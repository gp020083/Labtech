import React, { useState, useMemo } from 'react';
import { usePermissions } from '../../permissions';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { FieldCalcRecord } from '../../types';
import {
  getOfficialTemplateMeta,
  generateSequentialJobRefNo,
  collectPreviousClientOptions,
} from '../../utils/completedWorksheetGenerator';
import { HoklasReportPreview } from '../HoklasReportPreview';
import { TestRecordDetailModal } from '../TestRecordDetailModal';
import {
  Hash,
  Plus,
  Trash2,
  Search,
  Printer,
  Award,
  FolderKanban,
  Filter,
  FolderOpen,
  FileText,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const REGISTER_TEST_TYPES = [
  {
    code: 'KD',
    shortEn: 'Koden',
    nameZh: 'Koden 超聲波孔壁',
    nameEn: 'Koden Ultrasonic',
    std: 'HKCI TM3',
    accredited: true,
    activeCardCls: 'border-sky-500 bg-sky-50/90 ring-2 ring-sky-500/20',
    badgeCls: 'bg-sky-600 text-white',
    softBadgeCls: 'bg-sky-100 text-sky-900 border-sky-200',
    sectionBarCls: 'border-sky-200 bg-sky-50/70',
  },
  {
    code: 'SO',
    shortEn: 'Sonic',
    nameZh: '跨孔超聲波測井',
    nameEn: 'Sonic Logging',
    std: 'ASTM D6760',
    accredited: true,
    activeCardCls: 'border-indigo-500 bg-indigo-50/90 ring-2 ring-indigo-500/20',
    badgeCls: 'bg-indigo-600 text-white',
    softBadgeCls: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    sectionBarCls: 'border-indigo-200 bg-indigo-50/70',
  },
  {
    code: 'FC',
    shortEn: 'Flow Cone',
    nameZh: '水泥漿流錐流動度',
    nameEn: 'Flow Cone Efflux',
    std: 'ASTM C939',
    accredited: true,
    activeCardCls: 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/20',
    badgeCls: 'bg-emerald-600 text-white',
    softBadgeCls: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    sectionBarCls: 'border-emerald-200 bg-emerald-50/70',
  },
  {
    code: 'BL',
    shortEn: 'Bleeding',
    nameZh: '水泥漿泌水及膨脹',
    nameEn: 'Grout Bleeding',
    std: 'ASTM C940',
    accredited: true,
    activeCardCls: 'border-teal-500 bg-teal-50/90 ring-2 ring-teal-500/20',
    badgeCls: 'bg-teal-600 text-white',
    softBadgeCls: 'bg-teal-100 text-teal-900 border-teal-200',
    sectionBarCls: 'border-teal-200 bg-teal-50/70',
  },
  {
    code: 'PO',
    shortEn: 'Point Load',
    nameZh: '岩石點荷載強度',
    nameEn: 'Point Load Index',
    std: 'ASTM D5731',
    accredited: true,
    activeCardCls: 'border-violet-500 bg-violet-50/90 ring-2 ring-violet-500/20',
    badgeCls: 'bg-violet-600 text-white',
    softBadgeCls: 'bg-violet-100 text-violet-900 border-violet-200',
    sectionBarCls: 'border-violet-200 bg-violet-50/70',
  },
  {
    code: 'PLT',
    shortEn: 'Plate Load',
    nameZh: '平板載荷試驗',
    nameEn: 'Plate Load Test',
    std: 'BS 1377-9',
    accredited: false,
    activeCardCls: 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/20',
    badgeCls: 'bg-amber-600 text-white',
    softBadgeCls: 'bg-amber-100 text-amber-950 border-amber-200',
    sectionBarCls: 'border-amber-200 bg-amber-50/70',
  },
  {
    code: 'VC',
    shortEn: 'Verticality',
    nameZh: '鑽孔垂直度檢測',
    nameEn: 'Verticality Survey',
    std: 'PeeWee / INC',
    accredited: false,
    activeCardCls: 'border-rose-500 bg-rose-50/90 ring-2 ring-rose-500/20',
    badgeCls: 'bg-rose-600 text-white',
    softBadgeCls: 'bg-rose-100 text-rose-900 border-rose-200',
    sectionBarCls: 'border-rose-200 bg-rose-50/70',
  },
] as const;

type RegisterTestCode = (typeof REGISTER_TEST_TYPES)[number]['code'];

function parseJobRefSeqKey(ref?: string | null, id?: string | null): number {
  const raw = (ref || id || '').trim();
  const m = raw.match(/^[A-Z]{2,4}-(\d{2})(\d{4})/i);
  if (!m) return 0;
  return parseInt(m[1], 10) * 10000 + parseInt(m[2], 10);
}

function extractPileOrSampleLabel(r: FieldCalcRecord): string {
  if (r.sampleId && r.sampleId.trim()) return r.sampleId.trim();
  if (r.batchNo && r.batchNo.trim()) return r.batchNo.trim();
  const loc = (r.locationNote || '').trim();
  if (!loc) return '—';
  const parts = loc.split('·').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || loc;
}

export const JobRefSummaryView: React.FC<{
  onJumpToCalc?: (stpCode: string) => void;
}> = ({ onJumpToCalc }) => {
  const {
    jobs,
    tests,
    calcRecords,
    saveCalcRecord,
    deleteCalcRecord,
    openPreviewDoc,
    pushToast,
  } = useApp();
  const { tx } = usePrefs();
  const perms = usePermissions();

  const [filterStp, setFilterStp] = useState<string>('ALL');
  const [filterJobNo, setFilterJobNo] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Streamlined Quick Dispatch Form State — Test Type FIRST
  const [newStpCode, setNewStpCode] = useState<RegisterTestCode>('SO');
  const [newJobNo, setNewJobNo] = useState<string>(jobs[0]?.no || 'LT0002');
  const [newClient, setNewClient] = useState<string>('');
  const [newSampleId, setNewSampleId] = useState<string>('');
  const [newLocationNote, setNewLocationNote] = useState<string>('');

  const [previewState, setPreviewState] = useState<{
    record: FieldCalcRecord;
    mode: 'worksheet' | 'formal_report';
  } | null>(null);
  const [detailRecord, setDetailRecord] = useState<FieldCalcRecord | null>(null);

  const previousClients = useMemo(
    () => collectPreviousClientOptions(jobs, calcRecords),
    [jobs, calcRecords]
  );

  // Per-Test-Type Summary Matrix (count + next <TEST>-<YY><NNNN>)
  const testStatsMap = useMemo(() => {
    const map: Record<string, { count: number; nextRef: string }> = {};
    for (const item of REGISTER_TEST_TYPES) {
      const count = calcRecords.filter((r) => r.stpCode.toUpperCase() === item.code).length;
      const nextRef = generateSequentialJobRefNo(newJobNo, item.code, calcRecords);
      map[item.code] = { count, nextRef };
    }
    return map;
  }, [calcRecords, newJobNo]);

  const nextPreviewRefNo = useMemo(
    () => testStatsMap[newStpCode]?.nextRef || generateSequentialJobRefNo(newJobNo, newStpCode, calcRecords),
    [testStatsMap, newJobNo, newStpCode, calcRecords]
  );

  const handleSelectTestCard = (code: string) => {
    setFilterStp(code);
    if (code !== 'ALL') {
      setNewStpCode(code as RegisterTestCode);
    }
  };

  const handleJobSelectChange = (jobNoVal: string) => {
    setNewJobNo(jobNoVal);
    const matched = jobs.find((j) => j.no === jobNoVal);
    if (matched?.client && !newClient.trim()) {
      const cleanClient = matched.client.split('(')[0].trim();
      setNewClient(cleanClient);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calcRecords.filter((r) => {
      if (filterStp !== 'ALL' && r.stpCode.toUpperCase() !== filterStp) return false;
      if (filterJobNo !== 'ALL' && r.jobNo !== filterJobNo) return false;
      if (!q) return true;
      const hay = [
        r.jobRefNo,
        r.id,
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
  }, [calcRecords, filterStp, filterJobNo, searchQuery]);

  // Group filtered records by Test Type in official order, sorted by descending <TEST>-<YY><NNNN>
  const groupedSections = useMemo(() => {
    const activeTypes =
      filterStp === 'ALL'
        ? REGISTER_TEST_TYPES
        : REGISTER_TEST_TYPES.filter((t) => t.code === filterStp);

    return activeTypes
      .map((meta) => {
        const rows = filteredRecords
          .filter((r) => r.stpCode.toUpperCase() === meta.code)
          .sort((a, b) => {
            const diff = parseJobRefSeqKey(b.jobRefNo, b.id) - parseJobRefSeqKey(a.jobRefNo, a.id);
            if (diff !== 0) return diff;
            return (b.testedAt || '').localeCompare(a.testedAt || '');
          });
        return {
          meta,
          rows,
          totalForTest: testStatsMap[meta.code]?.count ?? 0,
          nextRef: testStatsMap[meta.code]?.nextRef ?? `${meta.code}-260001`,
        };
      })
      .filter((sec) => filterStp !== 'ALL' || sec.rows.length > 0 || (!searchQuery.trim() && filterJobNo === 'ALL'));
  }, [filteredRecords, filterStp, testStatsMap, searchQuery, filterJobNo]);

  const handleQuickDispatch = () => {
    const job = jobs.find((j) => j.no === newJobNo);
    const assignedRef = generateSequentialJobRefNo(newJobNo, newStpCode, calcRecords);
    const tplMeta = getOfficialTemplateMeta(newStpCode, tests);
    const resolvedClient =
      newClient.trim() || (job?.client ? job.client.split('(')[0].trim() : undefined);
    const sampleClean = newSampleId.trim();
    const locClean = newLocationNote.trim();
    const combinedLoc =
      locClean && sampleClean && !locClean.includes(sampleClean)
        ? `${locClean} · ${sampleClean}`
        : locClean || sampleClean || job?.site || undefined;

    saveCalcRecord({
      jobNo: newJobNo,
      jobRefNo: assignedRef,
      clientName: resolvedClient,
      sampleId: sampleClean || undefined,
      projectTitle: job?.project || job?.shortName || newJobNo,
      stpCode: newStpCode,
      title: `${newStpCode} · ${tplMeta.worksheetFormCode}`,
      locationNote: combinedLoc,
      summary: `[${newStpCode}] Job Ref. No. ${assignedRef} assigned · Project ${newJobNo}${sampleClean ? ` · Pile/Sample ${sampleClean}` : ''}`,
      pass: true,
    });
    pushToast(
      tx(`已派發 Job Ref. No.：${assignedRef}`, `Assigned Job Ref. No.: ${assignedRef}`),
      `${newStpCode} · ${newJobNo}${sampleClean ? ` · ${sampleClean}` : ''}`
    );
    setNewSampleId('');
    setNewLocationNote('');
  };

  const handleDeleteRecord = (r: FieldCalcRecord) => {
    const refLabel = r.jobRefNo || r.id;
    deleteCalcRecord(r.id);
    pushToast(
      tx(`已刪除登記紀錄 ${refLabel}`, `Deleted Record ${refLabel}`),
      `${r.stpCode} · ${r.jobNo}`
    );
  };

  const openServerRegisterPdf = () => {
    openPreviewDoc({
      title: tx('LabTech 伺服器工作登記總表 PDF', 'LabTech Server Job Register PDF'),
      url: '/server-docs/schedules/LabTech_Job_Register.pdf',
      fileName: 'LabTech_Job_Register.pdf',
      subtitle: 'KD · SO · FC · BL · PO · PLT · VC Official Job Reference Sequence',
    });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Top Test-Type Segmented Matrix / Cards */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx(
                '按測試類別編排 Job Reference No. 登記矩陣',
                'Job Reference No. Matrix by Test Method'
              )}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {tx(
                '依 LabTech 伺服器登記冊規則按測試種類獨立順號編配，點選測試卡可即時篩選紀錄並切換派發類別',
                'Sequenced independently per Test Type per LabTech Server Register — tap any test card to filter & select for dispatch.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openServerRegisterPdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:border-brand/40 hover:bg-brand-wash/40 hover:text-brand-deep cursor-pointer transition"
          >
            <FileText className="h-3.5 w-3.5 text-brand" />
            {tx('伺服器登記總表 PDF', 'Server Job Register PDF')}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {/* ALL Card */}
          <button
            type="button"
            onClick={() => handleSelectTestCard('ALL')}
            className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition cursor-pointer ${
              filterStp === 'ALL'
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-extrabold text-xs">
                {tx('全部類別', 'All Tests')}
              </span>
              <span
                className={`rounded-lg px-1.5 py-0.5 font-mono text-[10px] font-extrabold tabular-nums ${
                  filterStp === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tx(`${calcRecords.length} 份`, `${calcRecords.length}`)}
              </span>
            </div>
            <div
              className={`mt-2 font-mono text-[11px] font-bold ${
                filterStp === 'ALL' ? 'text-slate-200' : 'text-slate-500'
              }`}
            >
              {tx('7 項測試獨立順號', '7 Test Registers')}
            </div>
          </button>

          {/* 7 Test-Type Cards */}
          {REGISTER_TEST_TYPES.map((t) => {
            const stat = testStatsMap[t.code] || { count: 0, nextRef: `${t.code}-260001` };
            const isSelected = filterStp === t.code;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => handleSelectTestCard(t.code)}
                className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition cursor-pointer ${
                  isSelected
                    ? t.activeCardCls
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs font-black text-slate-900 truncate">
                    {t.code} · {t.shortEn}
                  </span>
                  <span className="shrink-0 rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-slate-700 tabular-nums">
                    {tx(`${stat.count} 份`, `${stat.count}`)}
                  </span>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70">
                  <div className="text-[10px] font-semibold text-slate-500">
                    {tx('下一個', 'Next Ref')}
                  </div>
                  <div className="font-mono text-xs font-black text-indigo-950 tabular-nums truncate">
                    {stat.nextRef}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Streamlined Quick Dispatch Card — Test Type FIRST */}
      <div className="rounded-3xl border border-indigo-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-2xs">
              <Hash className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {tx('派發新 Job Ref. No.', 'Dispatch New Job Ref. No.')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {tx(
                  '先選測試類別自動鎖定下一個順號，再填寫工程、客戶及樁號或樣本編號即可派發',
                  'Choose Test Type first to lock the next sequential number, then fill Project, Client & Pile/Sample No.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickDispatch}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 cursor-pointer shadow-xs transition"
          >
            <Plus className="h-4 w-4" />
            <span className="font-mono tracking-tight">
              {tx(`立即派發 ${nextPreviewRefNo}`, `Dispatch ${nextPreviewRefNo}`)}
            </span>
          </button>
        </div>

        {/* Test Type Selector Strip — FIRST */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
          <span className="px-2 text-[11px] font-extrabold text-slate-600">
            {tx('1. 測試類別：', '1. Test Type:')}
          </span>
          {REGISTER_TEST_TYPES.map((t) => {
            const active = newStpCode === t.code;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setNewStpCode(t.code)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                  active
                    ? `${t.badgeCls} shadow-2xs`
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="font-mono">{t.code}</span>
                <span className="hidden sm:inline font-semibold opacity-90">· {t.shortEn}</span>
              </button>
            );
          })}
        </div>

        {/* 4 Clean Responsive Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600">
              {tx('2. 工程 / 地盤', '2. Project / Site')}
            </label>
            <select
              value={newJobNo}
              onChange={(e) => handleJobSelectChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-900 focus:border-brand outline-none"
            >
              {jobs.map((j) => (
                <option key={j.no} value={j.no}>
                  {j.no} · {j.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600">
              {tx('3. 客戶名稱', '3. Customer Name')}
            </label>
            <div className="mt-1 flex gap-1.5">
              <input
                list="summary-prev-clients"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder={tx('輸入或選擇客戶...', 'Client name...')}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 focus:border-brand outline-none"
              />
              <datalist id="summary-prev-clients">
                {previousClients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <select
                value=""
                aria-label={tx('快速選擇歷史客戶', 'Select historical client')}
                onChange={(e) => {
                  if (e.target.value) setNewClient(e.target.value);
                }}
                className="w-24 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 font-bold text-slate-700"
              >
                <option value="">{tx('歷史客戶', 'Recent')}</option>
                {previousClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600">
              {tx('4. 樁號 / 樣本編號', '4. Pile / Sample No.')}
            </label>
            <input
              value={newSampleId}
              onChange={(e) => setNewSampleId(e.target.value)}
              placeholder={tx('例如 SBP03 / BP01 / BH12', 'e.g. SBP03 / BP01 / BH12')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-mono font-bold text-slate-900 focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600">
              {tx('5. 測試位置 / 備註', '5. Site Location / W.O.')}
            </label>
            <input
              value={newLocationNote}
              onChange={(e) => setNewLocationNote(e.target.value)}
              placeholder={tx('例如 荔枝角工地 / Q260002', 'e.g. Site Area B / W.O. Ref')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-semibold text-slate-900 focus:border-brand outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Test-Grouped Register View (Search + Project Filter + Grouped Sections) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx(
                `測試編號登記冊 · 共 ${filteredRecords.length} 份紀錄`,
                `Test Reference Register · ${filteredRecords.length} Records`
              )}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tx('搜尋編號 / 客戶 / 樁號 / 操作員...', 'Search Job No / Client / Pile...')}
                className="w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-brand outline-none"
              />
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={filterJobNo}
                onChange={(e) => setFilterJobNo(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none max-w-[170px]"
              >
                <option value="ALL">{tx('全部工程項目', 'All Projects')}</option>
                {jobs.map((j) => (
                  <option key={j.no} value={j.no}>
                    {j.no} · {j.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {groupedSections.every((s) => s.rows.length === 0) && (searchQuery.trim() || filterJobNo !== 'ALL') ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-400 font-semibold">
            {tx('找不到符合篩選條件的 Job Ref. No. 紀錄', 'No matching Job Reference No. records found.')}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSections.map(({ meta, rows, totalForTest, nextRef }) => (
              <div key={meta.code} className="rounded-2xl border border-slate-200 overflow-hidden">
                {/* Test Group Section Bar */}
                <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5 ${meta.sectionBarCls}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 font-mono text-xs font-black ${meta.badgeCls}`}>
                      {meta.code}
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {tx(meta.nameZh, meta.nameEn)}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-500">
                      · {meta.std}
                    </span>
                    <span className="rounded-md bg-white/90 border border-slate-200 px-2 py-0.5 font-mono text-[10px] font-extrabold text-slate-700 tabular-nums">
                      {tx(`已發出 ${totalForTest} 份`, `${totalForTest} issued`)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-mono text-[11px] font-black text-indigo-950 tabular-nums">
                      {tx(`下一個：${nextRef}`, `Next: ${nextRef}`)}
                    </span>
                    {onJumpToCalc && (
                      <button
                        type="button"
                        onClick={() => onJumpToCalc(meta.code)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 hover:border-brand/50 hover:text-brand-deep cursor-pointer"
                      >
                        <Calculator className="h-3 w-3 text-brand" />
                        {tx('開啟計算表', 'Calculator')}
                      </button>
                    )}
                  </div>
                </div>

                {rows.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/40 px-4 py-4 text-[11px] text-slate-500">
                    <span>
                      {tx(
                        `2026 年度暫未簽發 ${meta.code} 測試編號，首個可派發編號為 ${nextRef}`,
                        `No ${meta.code} reference numbers issued in 2026 yet — next available is ${nextRef}.`
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewStpCode(meta.code)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono font-extrabold text-indigo-900 hover:bg-indigo-100 cursor-pointer"
                    >
                      {tx(`選取 ${nextRef} 準備派發`, `Select ${nextRef}`)}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table — hidden on phones */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/90 border-b border-slate-200 font-extrabold text-slate-600 whitespace-nowrap">
                          <tr>
                            <th className="px-3.5 py-2.5">{tx('Job No.', 'Job No.')}</th>
                            <th className="px-3 py-2.5">{tx('客戶及工程項目', 'Customer & Project')}</th>
                            <th className="px-3 py-2.5">{tx('樁號 / 樣本編號', 'Pile / Sample No. & Site')}</th>
                            <th className="px-3 py-2.5">{tx('操作員及測試日期', 'Operator & Date')}</th>
                            <th className="px-3.5 py-2.5 text-right">{tx('詳情及 PDF 報告', 'Dossier & PDF Actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((r) => {
                            const matchedJob = jobs.find((j) => j.no === r.jobNo);
                            const refDisplay = r.jobRefNo || r.id;
                            const pileSample = extractPileOrSampleLabel(r);
                            const customerLabel =
                              r.clientName || (matchedJob?.client ? matchedJob.client.split('(')[0].trim() : '—');
                            const projLabel =
                              r.projectTitle || matchedJob?.project || matchedJob?.shortName || r.jobNo;

                            return (
                              <tr
                                key={r.id}
                                onClick={() => setDetailRecord(r)}
                                className="hover:bg-brand-wash/35 transition cursor-pointer"
                              >
                                <td className="px-3.5 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`inline-block rounded-lg border px-2.5 py-0.5 font-mono text-xs font-black tabular-nums ${meta.softBadgeCls}`}>
                                      {refDisplay}
                                    </span>
                                    {r.pass ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                    <span className="font-mono text-slate-600">{r.jobNo}</span>
                                    {r.worksOrderNo && (
                                      <>
                                        <span>·</span>
                                        <span className="font-mono text-indigo-700">{r.worksOrderNo}</span>
                                      </>
                                    )}
                                    {r.sitePhotos && r.sitePhotos.length > 0 && (
                                      <>
                                        <span>·</span>
                                        <span className="text-amber-700">照片 {r.sitePhotos.length}</span>
                                      </>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-3 max-w-[280px]">
                                  <div className="font-extrabold text-slate-900 truncate">
                                    {customerLabel}
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                                    {projLabel}
                                  </div>
                                </td>

                                <td className="px-3 py-3">
                                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-slate-900">
                                    {pileSample}
                                  </span>
                                  <div className="mt-0.5 text-[11px] text-slate-500 truncate max-w-[220px]">
                                    {r.locationNote || matchedJob?.site || '—'}
                                  </div>
                                </td>

                                <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="font-bold text-slate-800">{r.operatorName || '—'}</div>
                                  <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                    {r.testedAt}
                                  </div>
                                </td>

                                <td
                                  className="px-3.5 py-3 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setDetailRecord(r)}
                                      className="inline-flex items-center gap-1 rounded-xl bg-brand px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                                    >
                                      <FolderOpen className="h-3.5 w-3.5" />
                                      {tx('詳情及附件', 'Dossier')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewState({ record: r, mode: 'worksheet' })}
                                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      {tx('工作紙 PDF', 'Worksheet')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewState({ record: r, mode: 'formal_report' })}
                                      className="inline-flex items-center gap-1 rounded-xl border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[11px] font-extrabold text-amber-950 hover:bg-amber-100 cursor-pointer"
                                    >
                                      <Award className="h-3.5 w-3.5 text-amber-700" />
                                      {tx('正式報告 PDF', 'Report')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRecord(r)}
                                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition"
                                      title={tx('刪除此登記紀錄', 'Delete record')}
                                      hidden={!perms.canDeleteRecords}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Touch-Friendly Mobile Cards — zero horizontal overflow */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {rows.map((r) => {
                        const matchedJob = jobs.find((j) => j.no === r.jobNo);
                        const refDisplay = r.jobRefNo || r.id;
                        const pileSample = extractPileOrSampleLabel(r);
                        const customerLabel =
                          r.clientName || (matchedJob?.client ? matchedJob.client.split('(')[0].trim() : '—');
                        const projLabel =
                          r.projectTitle || matchedJob?.project || matchedJob?.shortName || r.jobNo;

                        return (
                          <div
                            key={r.id}
                            onClick={() => setDetailRecord(r)}
                            className="p-3.5 space-y-2.5 hover:bg-slate-50/70 transition cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className={`rounded-lg border px-2.5 py-0.5 font-mono text-xs font-black tabular-nums ${meta.softBadgeCls}`}>
                                  {refDisplay}
                                </span>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-slate-800">
                                  {pileSample}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono text-[10px] font-bold text-slate-500">
                                  {r.jobNo}
                                </span>
                                {r.pass ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                                )}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 break-words">
                                {customerLabel}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 break-words">
                                {projLabel}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                              <span className="truncate max-w-[60%]">
                                {r.locationNote || matchedJob?.site || '—'}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-slate-600 tabular-nums">
                                {r.operatorName || '—'} · {(r.testedAt || '').slice(0, 10)}
                              </span>
                            </div>

                            <div
                              className="flex flex-wrap items-center gap-1.5 pt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setDetailRecord(r)}
                                className="flex-1 min-w-[92px] inline-flex items-center justify-center gap-1 rounded-xl bg-brand px-2.5 py-2 text-[11px] font-extrabold text-white"
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                                {tx('詳情及附件', 'Dossier')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewState({ record: r, mode: 'worksheet' })}
                                className="flex-1 min-w-[92px] inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-2.5 py-2 text-[11px] font-extrabold text-white"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                {tx('工作紙 PDF', 'Worksheet')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewState({ record: r, mode: 'formal_report' })}
                                className="flex-1 min-w-[98px] inline-flex items-center justify-center gap-1 rounded-xl border border-amber-400 bg-amber-50 px-2.5 py-2 text-[11px] font-extrabold text-amber-950"
                              >
                                <Award className="h-3.5 w-3.5 text-amber-700" />
                                {tx('正式報告 PDF', 'Report')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(r)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-rose-600"
                                title={tx('刪除', 'Delete')}
                                hidden={!perms.canDeleteRecords}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {previewState && (
        <HoklasReportPreview
          record={previewState.record}
          structuredData={previewState.record.structuredData}
          initialDocMode={previewState.mode}
          onClose={() => setPreviewState(null)}
        />
      )}
      <TestRecordDetailModal
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
      />
    </div>
  );
};
