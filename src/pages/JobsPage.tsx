import React, { useState, useMemo } from 'react';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { JobItem } from '../types';
import { Badge } from '../components/Badge';
import { SiteMapBox, buildPinnedGoogleMapsUrl } from '../components/SiteMapBox';
import { JobDetailDrawer, JobEditModal } from '../components/JobModals';
import { MapPin, Plus, Search, Copy, Edit3, Wrench, ExternalLink, LayoutGrid, List, Calculator } from 'lucide-react';

export const JobsPage: React.FC<{ onNavigateEquipment?: () => void }> = ({ onNavigateEquipment }) => {
  const { jobs, equipment, calcRecords, pushToast } = useApp();
  const { tx } = usePrefs();
  const canEditSites = usePermissions().canManageSites;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'with_eq' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [editingJob, setEditingJob] = useState<JobItem | 'new' | null>(null);

  const eqCountByJob = useMemo(() => {
    const map: Record<string, number> = {};
    equipment.forEach((e) => {
      if (e.currentLoan?.jobNo) map[e.currentLoan.jobNo] = (map[e.currentLoan.jobNo] || 0) + 1;
    });
    return map;
  }, [equipment]);

  const calcCountByJob = useMemo(() => {
    const map: Record<string, number> = {};
    calcRecords.forEach((c) => {
      if (c.jobNo) map[c.jobNo] = (map[c.jobNo] || 0) + 1;
    });
    return map;
  }, [calcRecords]);

  const activeCount = jobs.filter((j) => j.status === 'active').length;
  const withEqCount = jobs.filter((j) => (eqCountByJob[j.no] || 0) > 0).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter === 'active' && j.status !== 'active') return false;
      if (filter === 'with_eq' && !(eqCountByJob[j.no] > 0)) return false;
      if (!q) return true;
      const hay = `${j.no} ${j.companyProjNo} ${j.shortName} ${j.project} ${j.mapAddress || ''} ${j.site} ${j.scope} ${j.client}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, query, filter, eqCountByJob]);

  const handleCopy = (j: JobItem) => {
    const txt = `${j.no} | ${j.companyProjNo} | ${j.shortName}\nLocation: ${j.mapAddress || j.site}\nMap: ${buildPinnedGoogleMapsUrl(j)}`;
    navigator.clipboard?.writeText(txt);
    pushToast(tx('已 Copy Site ID & Map Link', 'Site ID & Map Link Copied'), `${j.companyProjNo} · ${j.shortName}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 sm:px-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
              {tx('工程及地盤目錄', 'Projects & Site Locations')}
            </h1>
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-600 tabular-nums">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" /> {tx('列表', 'List')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> {tx('地圖', 'Maps')}
              </button>
            </div>

            {canEditSites && (
              <button
                type="button"
                onClick={() => setEditingJob('new')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> {tx('新增工程地盤', 'Add Site')}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx('搜尋 Site ID、工程編號、地盤名稱或地址...', 'Search Site ID, Project No., Name or Address...')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2 text-xs sm:text-sm outline-none focus:border-brand focus:bg-white transition"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {([
              ['active', tx('進行中', 'Active'), activeCount],
              ['with_eq', tx('有儀器在場', 'With Gear'), withEqCount],
              ['all', tx('全部', 'All'), jobs.length],
            ] as const).map(([k, label, cnt]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  filter === k
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {label} <span className="ml-0.5 font-mono opacity-80">{cnt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
            {filtered.map((j) => {
              const eqCount = eqCountByJob[j.no] || 0;
              const calcCount = calcCountByJob[j.no] || 0;
              return (
                <div
                  key={j.no}
                  onClick={() => setSelectedJob(j)}
                  className="p-3.5 space-y-2 cursor-pointer hover:bg-brand-wash/30 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white whitespace-nowrap">{j.no}</span>
                      <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep whitespace-nowrap">{j.companyProjNo}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {eqCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 whitespace-nowrap"><Wrench className="h-3 w-3 shrink-0" /> {eqCount}</span>}
                      {calcCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-brand-wash border border-brand/25 px-2 py-0.5 font-bold text-brand-deep whitespace-nowrap"><Calculator className="h-3 w-3 shrink-0" /> {calcCount}</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-slate-900 leading-snug break-words">{j.shortName}</div>
                    <div className="text-[11px] text-slate-500 leading-snug break-words">{j.mapAddress || j.site}</div>
                    {j.scope && <div className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 leading-snug break-words">Scope: {j.scope}</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand/10 px-3 py-1.5 font-bold text-brand-deep">Google Maps <ExternalLink className="h-3 w-3" /></a>
                    <button type="button" onClick={() => handleCopy(j)} className="ml-auto rounded-xl border border-slate-200 p-1.5 text-slate-500 cursor-pointer" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                    <button type="button" hidden={!canEditSites} onClick={() => setEditingJob(j)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 cursor-pointer" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/70 font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">
                <tr className="whitespace-nowrap">
                  <th className="px-5 py-3.5">Site ID</th>
                  <th className="px-4 py-3.5">Project No.</th>
                  <th className="px-4 py-3.5">{tx('地盤簡稱及地址', 'Site Name & Location')}</th>
                  <th className="px-4 py-3.5">Scope</th>
                  <th className="px-4 py-3.5">{tx('在場儀器 / Job Ref. 測試紀錄', 'Gear / Job Ref. Records')}</th>
                  <th className="px-5 py-3.5 text-right">{tx('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((j) => {
                  const eqCount = eqCountByJob[j.no] || 0;
                  const calcCount = calcCountByJob[j.no] || 0;
                  return (
                    <tr
                      key={j.no}
                      onClick={() => setSelectedJob(j)}
                      className="group hover:bg-brand-wash/35 transition cursor-pointer"
                    >
                      <td className="px-5 py-4 font-mono font-extrabold text-slate-900 whitespace-nowrap">{j.no}</td>
                      <td className="px-4 py-4 font-mono font-bold text-brand-deep whitespace-nowrap">{j.companyProjNo}</td>
                      <td className="px-4 py-4 max-w-md">
                        <div className="font-extrabold text-slate-900 group-hover:text-brand text-[13px]">{j.shortName}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500 truncate">{j.mapAddress || j.site}</div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700 whitespace-nowrap">{j.scope || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {eqCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-800 whitespace-nowrap"><Wrench className="h-3 w-3" /> {eqCount}</span>}
                          {calcCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-wash border border-brand/25 px-2.5 py-1 font-bold text-brand-deep whitespace-nowrap">
                              <Calculator className="h-3 w-3" /> {tx(`${calcCount} 份測試紀錄`, `${calcCount} Records`)}
                            </span>
                          )}
                          {eqCount === 0 && calcCount === 0 && <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                          <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand/10 px-3 py-1.5 font-bold text-brand-deep hover:bg-brand hover:text-white whitespace-nowrap shrink-0">Google Maps <ExternalLink className="h-3 w-3 shrink-0" /></a>
                          <button type="button" onClick={() => handleCopy(j)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:text-brand shrink-0 cursor-pointer" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                          <button type="button" hidden={!canEditSites} onClick={() => setEditingJob(j)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((j) => {
          const eqCount = eqCountByJob[j.no] || 0;
          return (
            <div key={j.no} className="flex flex-col justify-between rounded-3xl border border-slate-200/85 bg-white p-4 shadow-sm hover:shadow-md transition space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">{j.no}</span>
                    <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep">{j.companyProjNo}</span>
                    <Badge tone={j.status === 'active' ? 'ok' : 'mute'}>{j.status === 'active' ? tx('Active', 'Active') : tx('Completed', 'Completed')}</Badge>
                  </div>
                  <button type="button" onClick={() => handleCopy(j)} title="Copy Site ID & Map Link" className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-brand cursor-pointer">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div onClick={() => setSelectedJob(j)} className="cursor-pointer">
                  <h2 className="text-base font-extrabold text-slate-900 hover:text-brand transition">{j.shortName}</h2>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{j.mapAddress || j.site}</p>
                </div>

                <SiteMapBox job={j} heightClass="h-40" />

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                  {j.scope && <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700">Scope: {j.scope}</span>}
                  {eqCount > 0 && (
                    <button type="button" onClick={() => setSelectedJob(j)} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 cursor-pointer">
                      <Wrench className="h-3 w-3" /> {tx(`${eqCount} 件器材在場`, `${eqCount} On Site`)}
                    </button>
                  )}
                </div>
                {j.remark && <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 line-clamp-1">{j.remark}</div>}
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-brand/10 py-2 font-bold text-brand-deep hover:bg-brand hover:text-white transition">
                  Google Maps <ExternalLink className="h-3 w-3" />
                </a>
                <button type="button" onClick={() => setSelectedJob(j)} className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">{tx('詳情 Info', 'Details')}</button>
                <button type="button" hidden={!canEditSites} onClick={() => setEditingJob(j)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer" title="Edit Site"><Edit3 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} onEdit={(j) => setEditingJob(j)} onGoEquipment={() => onNavigateEquipment?.()} />
      {editingJob && <JobEditModal existing={editingJob === 'new' ? null : editingJob} onClose={() => setEditingJob(null)} />}
    </div>
  );
};
