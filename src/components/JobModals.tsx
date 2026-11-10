import React, { useState } from 'react';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { FieldCalcRecord, JobItem } from '../types';
import { REF_TODAY, downloadCalcRecordCsv } from '../utils';
import { Badge } from './Badge';
import { SiteMapBox, buildPinnedGoogleMapsUrl } from './SiteMapBox';
import { HoklasReportPreview } from './HoklasReportPreview';
import { TestRecordDetailModal } from './TestRecordDetailModal';
import { X, Copy, ExternalLink, Edit3, Wrench, Calculator, Trash2, Printer, FolderOpen, Hash, Search, Filter } from 'lucide-react';

const REPORT_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  BL: { zh: 'BL 水泥漿泌水及膨脹', en: 'BL Bleeding & Expansion' },
  FC: { zh: 'FC 流錐測試', en: 'FC Flow Cone' },
  KD: { zh: 'KD Koden 超聲波', en: 'KD Koden Ultrasonic' },
  SO: { zh: 'SO 跨孔超聲波', en: 'SO Sonic Logging' },
  PLT: { zh: 'PLT 平板載荷', en: 'PLT Plate Load' },
  PO: { zh: 'PO 岩石點荷載', en: 'PO Point Load' },
  VC: { zh: 'VC 雙軸測斜儀', en: 'VC Inclinometer' },
};

export const JobDetailDrawer: React.FC<{
  job: JobItem | null;
  onClose: () => void;
  onEdit: (job: JobItem) => void;
  onGoEquipment: () => void;
}> = ({ job, onClose, onEdit, onGoEquipment }) => {
  const { equipment, calcRecords, deleteCalcRecord, pushToast } = useApp();
  const perms = usePermissions();
  const { tx } = usePrefs();
  const [worksheetRec, setWorksheetRec] = useState<FieldCalcRecord | null>(null);
  const [detailRec, setDetailRec] = useState<FieldCalcRecord | null>(null);
  const [recSearch, setRecSearch] = useState('');
  const [recStpFilter, setRecStpFilter] = useState<string>('ALL');
  const [recStatusFilter, setRecStatusFilter] = useState<'ALL' | 'PASS' | 'REVIEW'>('ALL');
  if (!job) return null;

  const siteEq = equipment.filter((e) => e.currentLoan?.jobNo === job.no);
  const siteCalcs = calcRecords.filter((c) => c.jobNo === job.no);

  const stpCounts: Record<string, number> = {};
  siteCalcs.forEach((c) => {
    stpCounts[c.stpCode] = (stpCounts[c.stpCode] || 0) + 1;
  });
  const availableStpCodes = ['BL', 'FC', 'KD', 'SO', 'PLT', 'PO', 'VC'].filter(
    (code) => (stpCounts[code] || 0) > 0 || recStpFilter === code
  );

  const filteredSiteCalcs = siteCalcs.filter((c) => {
    if (recStpFilter !== 'ALL' && c.stpCode !== recStpFilter) return false;
    if (recStatusFilter === 'PASS' && !c.pass) return false;
    if (recStatusFilter === 'REVIEW' && c.pass) return false;
    const q = recSearch.trim().toLowerCase();
    if (!q) return true;
    const typeInfo = REPORT_TYPE_LABELS[c.stpCode];
    const hay = [
      c.jobRefNo,
      c.id,
      c.stpCode,
      typeInfo?.zh,
      typeInfo?.en,
      c.title,
      c.summary,
      c.worksOrderNo,
      c.batchNo,
      c.sampleId,
      c.locationNote,
      c.clientName,
      c.operatorName,
      c.testedAt,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  const copySiteInfo = () => {
    const text = `${job.no} | ${job.companyProjNo} | ${job.shortName}\nLocation: ${job.mapAddress || job.site}\nGoogle Maps: ${buildPinnedGoogleMapsUrl(job)}`;
    navigator.clipboard?.writeText(text);
    pushToast(tx('已複製地盤編號及 Google Maps 連結', 'Site ID & Google Maps link copied'), `${job.companyProjNo} · ${job.shortName}`);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white">{job.no}</span>
              <span className="rounded-lg bg-brand-wash px-2.5 py-0.5 font-mono text-xs font-extrabold text-brand-deep">{job.companyProjNo}</span>
              <Badge tone={job.status === 'active' ? 'ok' : 'mute'}>
                {job.status === 'active' ? tx('進行中 Active', 'Active') : tx('已完工 Done', 'Completed')}
              </Badge>
            </div>
            <h3 className="mt-1.5 text-lg font-extrabold text-slate-900">{job.shortName}</h3>
            <p className="text-xs text-slate-500 line-clamp-2">{job.project}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <SiteMapBox job={job} heightClass="h-48" />

          <div className="flex flex-wrap gap-2">
            <a
              href={buildPinnedGoogleMapsUrl(job)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 font-bold text-white hover:bg-brand-deep"
            >
              📍 {tx('Google Maps 紅針導航', 'Google Maps Pin Navigation')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={copySiteInfo}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-brand" /> {tx('Copy 資料', 'Copy Info')}
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onEdit(job); }} hidden={!perms.canManageSites}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" /> {tx('修改', 'Edit')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
            <div className="col-span-2">
              <div className="text-[11px] font-semibold text-slate-400">{tx('Site Location 地址', 'Site Location Address')}</div>
              <div className="mt-0.5 font-bold text-slate-900">{job.mapAddress || job.site}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Scope</div>
              <div className="mt-0.5 font-bold text-brand-deep">{job.scope || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Client</div>
              <div className="mt-0.5 font-semibold text-slate-800">{job.client || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[11px] font-semibold text-slate-400">{tx('現場備註 Remark', 'Site Remark')}</div>
              <div className="mt-0.5 font-medium text-slate-700">{job.remark || '—'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                <Wrench className="h-3.5 w-3.5 text-brand" /> {tx(`在場 Equipment (${siteEq.length})`, `On-Site Equipment (${siteEq.length})`)}
              </span>
              <button type="button" onClick={() => { onClose(); onGoEquipment(); }} className="font-bold text-brand hover:underline cursor-pointer">
                {tx('前往 Equipment →', 'Go to Equipment →')}
              </button>
            </div>
            {siteEq.length === 0 ? (
              <div className="text-slate-400">{tx('目前未有器材借出至此地盤', 'No equipment currently checked out to this site')}</div>
            ) : (
              siteEq.map((eq) => (
                <div key={eq.code} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{eq.code}</span>
                    <span className="ml-2 text-slate-600">{eq.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-deep">{eq.currentLoan?.borrowerName}</span>
                </div>
              ))
            )}
          </div>

          {/* Field Calculation Logs & Job Ref. No. Dossier linked to this Site Job */}
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-slate-900">
                <Calculator className="h-4 w-4 text-brand" />
                {tx(
                  `本工程 Job Ref. No. 及現場測試計算紀錄`,
                  `Site Job Ref. No. & Field Test Records (${filteredSiteCalcs.length} / ${siteCalcs.length})`
                )}
              </span>
              <span className="text-[11px] font-semibold text-brand-deep">
                {tx('點擊任何紀錄列即可彈出完整結果及夾附文件視窗', 'Click any record row to open full result & bundled files')}
              </span>
            </div>

            {siteCalcs.length > 0 && (
              <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white/90 p-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={recSearch}
                      onChange={(e) => setRecSearch(e.target.value)}
                      placeholder={tx(
                        '搜尋 Job Ref. No. (如 LT0002-BL-009) / 委託單 WO / 批次樣本 / 樁號位置 / 技術員...',
                        'Search Job Ref. No. / Works Order / Sample ID / Location / Operator...'
                      )}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white"
                    />
                    {recSearch && (
                      <button
                        type="button"
                        onClick={() => setRecSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={recStpFilter}
                        onChange={(e) => setRecStpFilter(e.target.value)}
                        className="bg-transparent text-xs font-extrabold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="ALL">{tx(`全部報告類型 (${siteCalcs.length})`, `All Report Types (${siteCalcs.length})`)}</option>
                        {(['BL', 'FC', 'KD', 'SO', 'PLT', 'PO', 'VC'] as const).map((code) => (
                          <option key={code} value={code}>
                            {tx(REPORT_TYPE_LABELS[code].zh, REPORT_TYPE_LABELS[code].en)} ({stpCounts[code] || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={recStatusFilter}
                      onChange={(e) => setRecStatusFilter(e.target.value as 'ALL' | 'PASS' | 'REVIEW')}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-extrabold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="ALL">{tx('全部狀態', 'All Status')}</option>
                      <option value="PASS">{tx('PASS 合規', 'PASS Only')}</option>
                      <option value="REVIEW">{tx('REVIEW 待覆核', 'REVIEW Only')}</option>
                    </select>
                  </div>
                </div>

                {/* Quick Report Type Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setRecStpFilter('ALL')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                      recStpFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tx(`全部 (${siteCalcs.length})`, `All (${siteCalcs.length})`)}
                  </button>
                  {availableStpCodes.map((code) => {
                    const active = recStpFilter === code;
                    const count = stpCounts[code] || 0;
                    const label = REPORT_TYPE_LABELS[code];
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setRecStpFilter(active ? 'ALL' : code)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                          active
                            ? 'bg-brand text-white shadow-2xs'
                            : 'bg-brand-wash/70 text-brand-deep hover:bg-brand-wash border border-brand/20'
                        }`}
                      >
                        <span className="font-mono">{code}</span>
                        <span>· {tx(label?.zh.replace(`${code} `, '') || code, label?.en.replace(`${code} `, '') || code)}</span>
                        <span className={`rounded px-1 text-[10px] font-mono ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {siteCalcs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 py-5 text-center text-slate-400">
                {tx('暫無已儲存之現場測試計算紀錄（於「現場計算與工作紙」完成計算並派發 Job Ref. No. 後將自動歸檔至此地盤）', 'No field test records yet. Records saved with this site Job No. will appear here.')}
              </div>
            ) : filteredSiteCalcs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 py-5 text-center space-y-2">
                <div className="text-slate-400 font-semibold">
                  {tx('找不到符合搜尋或報告類型篩選條件之 Job Ref. No. 紀錄', 'No Job Ref. No. records match your search or report type filter')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecSearch('');
                    setRecStpFilter('ALL');
                    setRecStatusFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-bold text-white cursor-pointer"
                >
                  {tx('清除篩選條件', 'Reset Filters')}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSiteCalcs.map((rec) => {
                  const refNo = rec.jobRefNo || rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setDetailRec(rec)}
                      className="group rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs transition-all hover:border-brand/50 hover:shadow-md cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">
                            <Hash className="h-3 w-3 text-amber-300" /> {refNo}
                          </span>
                          <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep">
                            {rec.stpCode}
                          </span>
                          {rec.worksOrderNo && (
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                              WO: {rec.worksOrderNo}
                            </span>
                          )}
                          {rec.locationNote && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                              {rec.locationNote}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={rec.pass ? 'ok' : 'warn'}>{rec.pass ? 'PASS 合規' : 'REVIEW'}</Badge>
                        </div>
                      </div>

                      <div className="line-clamp-2 rounded-xl bg-slate-50/90 px-3 py-2 font-mono text-[11px] text-slate-700">
                        {rec.summary}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            📋 {tx('官方英文 Worksheet', 'Official Worksheet')}
                          </span>
                          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                            📄 {rec.worksOrderAttachment ? tx('已上載 Works Order', 'Works Order Attached') : 'FQS08 Works Order'}
                          </span>
                          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            📷 {tx(`相片 (${rec.sitePhotos?.length || 0})`, `Photos (${rec.sitePhotos?.length || 0})`)}
                          </span>
                          <span className="text-slate-400 ml-1">
                            {rec.operatorName} · {rec.testedAt}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setDetailRec(rec)}
                            className="inline-flex items-center gap-1 rounded-xl bg-brand px-2.5 py-1 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                          >
                            <FolderOpen className="h-3 w-3" /> {tx('檢視結果及附件', 'Open Dossier')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorksheetRec(rec)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <Printer className="h-3 w-3" /> Worksheet
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCalcRecord(rec.id)} hidden={!perms.canDeleteRecords}
                            title={tx('刪除此紀錄', 'Delete record')}
                            className="rounded-xl border border-slate-200 p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <HoklasReportPreview record={worksheetRec} job={job} onClose={() => setWorksheetRec(null)} />
      <TestRecordDetailModal record={detailRec} job={job} onClose={() => setDetailRec(null)} />
    </div>
  );
};

export const JobEditModal: React.FC<{
  existing: JobItem | null;
  onClose: () => void;
}> = ({ existing, onClose }) => {
  const { jobs, addOrUpdateJob } = useApp();
  const { tx } = usePrefs();
  const nextNo = `LT${String(jobs.length + 1).padStart(4, '0')}`;
  const [no] = React.useState(existing?.no || nextNo);
  const [companyProjNo, setCompanyProjNo] = React.useState(existing?.companyProjNo || '');
  const [shortName, setShortName] = React.useState(existing?.shortName || '');
  const [mapAddress, setMapAddress] = React.useState(existing?.mapAddress || existing?.site || '');
  const [project, setProject] = React.useState(existing?.project || '');
  const [scope, setScope] = React.useState(existing?.scope || 'KD + SO');
  const [client, setClient] = React.useState(existing?.client || '');
  const [lat, setLat] = React.useState(existing?.lat ? String(existing.lat) : '');
  const [lng, setLng] = React.useState(existing?.lng ? String(existing.lng) : '');
  const [status, setStatus] = React.useState<'active' | 'completed'>(existing?.status || 'active');
  const [remark, setRemark] = React.useState(existing?.remark || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOrUpdateJob({
      no,
      companyProjNo: companyProjNo.trim() || no,
      shortName: shortName.trim() || mapAddress.trim(),
      date: existing?.date || REF_TODAY,
      project: project.trim() || shortName.trim(),
      scope: scope.trim(),
      client: client.trim(),
      site: mapAddress.trim(),
      mapAddress: mapAddress.trim(),
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      status,
      remark: remark.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            {existing ? tx(`修改工程 Site (${no})`, `Edit Site (${no})`) : tx(`新增工程 Site (${no})`, `Add Site (${no})`)}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div><label className="font-bold text-slate-600">{tx('Company Project No. *', 'Company Project No. *')}</label><input required value={companyProjNo} onChange={(e) => setCompanyProjNo(e.target.value)} placeholder="CMP-26-015 / DGP0105" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono" /></div>
          <div><label className="font-bold text-slate-600">{tx('地盤簡稱 Site Name *', 'Site Short Name *')}</label><input required value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder={tx('如 啟德體育園 / 屯門南', 'e.g. Kai Tak / Tuen Mun South')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
        </div>
        <div><label className="font-bold text-slate-600">{tx('Location 地址（用於地圖紅針定位）*', 'Site Address (for Map Pin) *')}</label><input required value={mapAddress} onChange={(e) => setMapAddress(e.target.value)} placeholder={tx('如 九龍旺角山東街 47 號地盤入口', 'e.g. 47 Shan Tung St, Mong Kok')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-2.5">
          <div><label className="font-bold text-slate-600">{tx('Lat 緯度（選填）', 'Latitude (Optional)')}</label><input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="22.3182" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-mono" /></div>
          <div><label className="font-bold text-slate-600">{tx('Lng 經度（選填）', 'Longitude (Optional)')}</label><input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="114.1706" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-mono" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div><label className="font-bold text-slate-600">Scope</label><input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="KD + SO + FC" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /></div>
          <div><label className="font-bold text-slate-600">{tx('Status 狀態', 'Status')}</label><select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'completed')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm"><option value="active">{tx('進行中 Active', 'Active')}</option><option value="completed">{tx('已完工 Completed', 'Completed')}</option></select></div>
        </div>
        <div><label className="font-bold text-slate-600">{tx('Contract Project / Client', 'Contract Title / Client')}</label><input value={project} onChange={(e) => setProject(e.target.value)} placeholder={tx('工程合約名稱', 'Contract Title')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /><input value={client} onChange={(e) => setClient(e.target.value)} placeholder={tx('Client 名稱（選填）', 'Client Name (Optional)')} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div><label className="font-bold text-slate-600">{tx('現場備註 Remark（聯絡人 / 閘口）', 'Site Remark (Contact / Gate)')}</label><input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={tx('例如：二號閘進入，聯絡陳先生 9123-xxxx', 'e.g. Gate 2 entrance, Mr Chan 9123-xxxx')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">{tx('取消', 'Cancel')}</button>
          <button type="submit" className="rounded-xl bg-brand px-5 py-2 font-bold text-white hover:bg-brand-deep cursor-pointer">{tx('Save 地盤 & Location', 'Save Site & Location')}</button>
        </div>
      </form>
    </div>
  );
};
