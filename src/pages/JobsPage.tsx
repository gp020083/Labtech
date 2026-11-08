import React, { useState, useMemo } from 'react';
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-[11px] font-extrabold text-brand-deep">
            <MapPin className="h-3.5 w-3.5" /> SITE ID &amp; LOCATION DIRECTORY
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {tx('工程及地盤 Site ID & Location', 'Projects & Site Locations')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {tx('集中查閱工程 Project No.、地盤地址、互動街道地圖及 Google Maps 定位導航。', 'Check Project No., site address, zoomable street map, and Google Maps Pin navigation.')}
          </p>
        </div>
        <button type="button" onClick={() => setEditingJob('new')} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-brand-deep cursor-pointer shrink-0">
          <Plus className="h-4 w-4" /> {tx('新增 Site 地盤', 'Add New Site')}
        </button>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx('搜尋 LT0001 / CMP-26-011 / 旺角 / PolyU / 地盤地址...', 'Search LT0001 / CMP-26-011 / Site Name / Address...')}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ['active', tx(`進行中 (${activeCount})`, `Active (${activeCount})`)],
            ['with_eq', tx(`📦 有器材 (${withEqCount})`, `📦 Gear (${withEqCount})`)],
            ['all', tx(`全部 (${jobs.length})`, `All (${jobs.length})`)],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${filter === k ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 ml-auto sm:ml-1 shrink-0">
            <button type="button" onClick={() => setViewMode('table')} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${viewMode === 'table' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-900'}`}><List className="h-3.5 w-3.5" /> {tx('列表', 'List')}</button>
            <button type="button" onClick={() => setViewMode('cards')} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${viewMode === 'cards' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-900'}`}><LayoutGrid className="h-3.5 w-3.5" /> {tx('地圖', 'Maps')}</button>
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
                <div key={j.no} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white whitespace-nowrap">{j.no}</span>
                      <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep whitespace-nowrap">{j.companyProjNo}</span>
                      {j.scope && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{j.scope}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {eqCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800"><Wrench className="h-3 w-3" /> {eqCount}</span>}
                      {calcCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-brand-wash border border-brand/25 px-2 py-0.5 font-bold text-brand-deep"><Calculator className="h-3 w-3" /> {calcCount}</span>}
                    </div>
                  </div>
                  <div onClick={() => setSelectedJob(j)} className="cursor-pointer">
                    <div className="text-sm font-extrabold text-slate-900">{j.shortName}</div>
                    <div className="text-[11px] text-slate-500">{j.mapAddress || j.site}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button type="button" onClick={() => setSelectedJob(j)} className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-700 cursor-pointer">{tx('詳情 / 地圖', 'Map / Info')}</button>
                    <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand/10 px-3 py-1.5 font-bold text-brand-deep">Google Maps <ExternalLink className="h-3 w-3" /></a>
                    <button type="button" onClick={() => handleCopy(j)} className="ml-auto rounded-xl border border-slate-200 p-1.5 text-slate-500 cursor-pointer" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setEditingJob(j)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 cursor-pointer" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3">Site ID</th>
                <th className="px-3 py-3">Project No.</th>
                <th className="px-3 py-3">{tx('地盤簡稱及地址', 'Site Name & Location')}</th>
                <th className="px-3 py-3">Scope</th>
                <th className="px-3 py-3">{tx('在場器材 / 計算紀錄', 'Gear / Calc Logs')}</th>
                <th className="px-4 py-3 text-right">{tx('快速操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((j) => {
                const eqCount = eqCountByJob[j.no] || 0;
                const calcCount = calcCountByJob[j.no] || 0;
                return (
                  <tr key={j.no} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-extrabold text-slate-900 whitespace-nowrap">{j.no}</td>
                    <td className="px-3 py-3 font-mono font-bold text-brand-deep whitespace-nowrap">{j.companyProjNo}</td>
                    <td className="px-3 py-3 max-w-md cursor-pointer" onClick={() => setSelectedJob(j)}>
                      <div className="font-extrabold text-slate-900 hover:text-brand">{j.shortName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{j.mapAddress || j.site}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">{j.scope || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {eqCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 whitespace-nowrap"><Wrench className="h-3 w-3" /> {eqCount}</span>}
                        {calcCount > 0 && (
                          <button type="button" onClick={() => setSelectedJob(j)} className="inline-flex items-center gap-1 rounded-lg bg-brand-wash border border-brand/25 px-2 py-0.5 font-bold text-brand-deep hover:bg-brand hover:text-white transition whitespace-nowrap cursor-pointer">
                            <Calculator className="h-3 w-3" /> {tx(`${calcCount} 紀錄`, `${calcCount} Logs`)}
                          </button>
                        )}
                        {eqCount === 0 && calcCount === 0 && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                        <button type="button" onClick={() => setSelectedJob(j)} className="rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer">{tx('詳情／地圖', 'Map / Info')}</button>
                        <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand/10 px-2.5 py-1.5 font-bold text-brand-deep hover:bg-brand hover:text-white whitespace-nowrap shrink-0">Google Maps <ExternalLink className="h-3 w-3 shrink-0" /></a>
                        <button type="button" onClick={() => handleCopy(j)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:text-brand shrink-0 cursor-pointer" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setEditingJob(j)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
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
                {j.remark && <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 line-clamp-1">💡 {j.remark}</div>}
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-brand/10 py-2 font-bold text-brand-deep hover:bg-brand hover:text-white transition">
                  Google Maps <ExternalLink className="h-3 w-3" />
                </a>
                <button type="button" onClick={() => setSelectedJob(j)} className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">{tx('詳情 Info', 'Details')}</button>
                <button type="button" onClick={() => setEditingJob(j)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer" title="Edit Site"><Edit3 className="h-3.5 w-3.5" /></button>
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
