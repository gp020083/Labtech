import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { FieldCalcRecord, JobItem } from '../types';
import { REF_TODAY, downloadCalcRecordCsv } from '../utils';
import { Badge } from './Badge';
import { SiteMapBox, buildPinnedGoogleMapsUrl } from './SiteMapBox';
import { HoklasReportPreview } from './HoklasReportPreview';
import { X, Copy, ExternalLink, Edit3, Wrench, Calculator, Download, Trash2, Printer } from 'lucide-react';

export const JobDetailDrawer: React.FC<{
  job: JobItem | null;
  onClose: () => void;
  onEdit: (job: JobItem) => void;
  onGoEquipment: () => void;
}> = ({ job, onClose, onEdit, onGoEquipment }) => {
  const { equipment, calcRecords, deleteCalcRecord, pushToast } = useApp();
  const { tx } = usePrefs();
  const [worksheetRec, setWorksheetRec] = useState<FieldCalcRecord | null>(null);
  if (!job) return null;

  const siteEq = equipment.filter((e) => e.currentLoan?.jobNo === job.no);
  const siteCalcs = calcRecords.filter((c) => c.jobNo === job.no);

  const copySiteInfo = () => {
    const text = `${job.no} | ${job.companyProjNo} | ${job.shortName}\nLocation: ${job.mapAddress || job.site}\nGoogle Maps: ${buildPinnedGoogleMapsUrl(job)}`;
    navigator.clipboard?.writeText(text);
    pushToast(tx('已 Copy Site ID 及 Google Maps 連結', 'Site ID & Google Maps link copied'), `${job.companyProjNo} · ${job.shortName}`);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/45 sm:items-stretch sm:justify-end"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] sm:max-h-none sm:h-full w-full max-w-lg flex-col rounded-t-3xl sm:rounded-none bg-white shadow-2xl">
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
              onClick={() => { onClose(); onEdit(job); }}
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

          {/* Field Calculation Logs linked to this Site Job */}
          <div className="rounded-2xl border border-brand/25 bg-brand-wash/25 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-slate-900">
                <Calculator className="h-4 w-4 text-brand" />
                {tx(`現場測試計算紀錄 (${siteCalcs.length})`, `Field Calculation Logs (${siteCalcs.length})`)}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">HOKLAS 298</span>
            </div>
            {siteCalcs.length === 0 ? (
              <div className="text-slate-400">
                {tx('暫無已儲存之現場計算紀錄（可於 TOOL 計算機點擊「儲存至地盤」新增）', 'No saved field calculations yet (Save from TOOL calculators)')}
              </div>
            ) : (
              <div className="space-y-2">
                {siteCalcs.map((rec) => (
                  <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">{rec.stpCode}</span>
                        <span className="font-mono font-extrabold text-brand-deep">{rec.id}</span>
                        {rec.locationNote && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">{rec.locationNote}</span>}
                        {rec.signatureDataUrl && <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">✍️ {rec.signedBy || tx('已簽署', 'Signed')}</span>}
                      </div>
                      <Badge tone={rec.pass ? 'ok' : 'warn'}>{rec.pass ? 'PASS 合規' : 'REVIEW'}</Badge>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-800 leading-relaxed overflow-x-auto">
                      {rec.summary}
                    </pre>
                    {rec.sitePhotos && rec.sitePhotos.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>📷 {tx(`附加現場相片 (${rec.sitePhotos.length}/2)`, `Attached Site Photos (${rec.sitePhotos.length}/2)`)}</span>
                          <span className="text-emerald-700 font-bold">
                            ✓ Google Drive (05_User_Uploads)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {rec.sitePhotos.map((ph, pIdx) => (
                            <div key={ph.id} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 space-y-1">
                              <div className="relative">
                                <img
                                  src={ph.dataUrl}
                                  alt={ph.caption || ph.fileName}
                                  referrerPolicy="no-referrer"
                                  className="h-20 w-full rounded-md object-cover bg-slate-900"
                                />
                                <span className="absolute top-1 left-1 rounded bg-slate-900/80 px-1 py-0.5 font-mono text-[9px] font-bold text-white">
                                  #{pIdx + 1} · {ph.compressedSizeBytes ? `${Math.max(1, Math.round(ph.compressedSizeBytes / 1024))} KB` : 'JPEG'}
                                </span>
                              </div>
                              <div className="truncate text-[10px] font-semibold text-slate-700" title={ph.caption || ph.fileName}>
                                {ph.caption || ph.fileName}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>👤 {rec.operatorName} · {rec.testedAt}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWorksheetRec(rec)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          <Printer className="h-3 w-3" /> {tx('HOKLAS 報告', 'Worksheet')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(rec.summary);
                            pushToast(tx('已複製計算紀錄', 'Copied calculation record'), rec.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadCalcRecordCsv(rec, job)}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-wash/60 px-2 py-1 font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer"
                        >
                          <Download className="h-3 w-3" /> CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCalcRecord(rec.id)}
                          title={tx('刪除此紀錄', 'Delete record')}
                          className="rounded-lg border border-slate-200 p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <HoklasReportPreview record={worksheetRec} job={job} onClose={() => setWorksheetRec(null)} />
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
