import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { JobItem } from '../types';
import { Badge } from '../components/Badge';
import { SiteMapBox, buildPinnedGoogleMapsUrl } from '../components/SiteMapBox';
import { JobDetailDrawer, JobEditModal } from '../components/JobModals';
import { MapPin, Plus, Search, Copy, Edit3, Wrench, ExternalLink, Map as MapIcon } from 'lucide-react';

export const MobileJobsView: React.FC<{ onNavigateEquipment: () => void }> = ({ onNavigateEquipment }) => {
  const { jobs, equipment, pushToast } = useApp();
  const { tx } = usePrefs();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'with_eq' | 'all'>('active');
  const [expandedMapNo, setExpandedMapNo] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [editingJob, setEditingJob] = useState<JobItem | 'new' | null>(null);

  const eqCountByJob = useMemo(() => {
    const map: Record<string, number> = {};
    equipment.forEach((e) => {
      if (e.currentLoan?.jobNo) map[e.currentLoan.jobNo] = (map[e.currentLoan.jobNo] || 0) + 1;
    });
    return map;
  }, [equipment]);

  const activeCount = jobs.filter((j) => j.status === 'active').length;
  const withEqCount = jobs.filter((j) => (eqCountByJob[j.no] || 0) > 0).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter === 'active' && j.status !== 'active') return false;
      if (filter === 'with_eq' && !(eqCountByJob[j.no] > 0)) return false;
      if (!q) return true;
      return `${j.no} ${j.companyProjNo} ${j.shortName} ${j.project} ${j.mapAddress || ''} ${j.site} ${j.scope} ${j.client}`
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, query, filter, eqCountByJob]);

  const handleCopy = (j: JobItem) => {
    const txt = `${j.no} | ${j.companyProjNo} | ${j.shortName}\nLocation: ${j.mapAddress || j.site}\nMap: ${buildPinnedGoogleMapsUrl(j)}`;
    navigator.clipboard?.writeText(txt);
    pushToast(tx('已複製地盤資料及地圖連結', 'Site Info & Map Link Copied'), j.shortName);
  };

  return (
    <div className="space-y-2.5 w-full min-w-0">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 border border-slate-200/90 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">{tx('工程及地盤目錄', 'Projects & Sites')}</h1>
          <p className="text-[11px] text-slate-500">{tx(`進行中 ${activeCount} 個 · 共 ${jobs.length} 個專案`, `${activeCount} Active · ${jobs.length} Total`)}</p>
        </div>
        <button type="button" onClick={() => setEditingJob('new')} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white shadow-xs shrink-0 whitespace-nowrap cursor-pointer">
          <Plus className="h-3.5 w-3.5 shrink-0" /> {tx('新增地盤', 'New Site')}
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tx('搜尋 Site ID、工程編號、地盤名稱...', 'Search Site ID, Project No., Name...')}
          className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        {([
          ['active', tx(`進行中 (${activeCount})`, `Active (${activeCount})`)],
          ['with_eq', tx(`有儀器 (${withEqCount})`, `Gear (${withEqCount})`)],
          ['all', tx(`全部 (${jobs.length})`, `All (${jobs.length})`)],
        ] as const).map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-xl py-2 px-1 font-extrabold whitespace-nowrap cursor-pointer ${filter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((j) => {
          const eqCount = eqCountByJob[j.no] || 0;
          const mapOpen = expandedMapNo === j.no;
          return (
            <div key={j.no} className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-2 text-xs overflow-hidden">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white whitespace-nowrap">{j.no}</span>
                  <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep whitespace-nowrap">{j.companyProjNo}</span>
                  {eqCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 whitespace-nowrap"><Wrench className="h-3 w-3 shrink-0" /> {eqCount}</span>}
                </div>
                <div className="shrink-0">
                  <Badge tone={j.status === 'active' ? 'ok' : 'mute'}>{j.status === 'active' ? 'Active' : 'Done'}</Badge>
                </div>
              </div>
              <div onClick={() => setSelectedJob(j)} className="cursor-pointer space-y-1">
                <div className="text-sm font-extrabold text-slate-900 leading-snug break-words">{j.shortName}</div>
                <div className="text-[11px] text-slate-600 flex items-start gap-1 leading-snug"><MapPin className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" /><span className="break-words">{j.mapAddress || j.site}</span></div>
                {j.scope && <div className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 leading-snug break-words">Scope: {j.scope}</div>}
              </div>
              {mapOpen && <SiteMapBox job={j} heightClass="h-44" />}
              <div className="grid grid-cols-12 gap-1.5 pt-0.5">
                <a href={buildPinnedGoogleMapsUrl(j)} target="_blank" rel="noopener noreferrer" className="col-span-6 inline-flex items-center justify-center gap-1 rounded-xl bg-brand py-2 px-2 font-extrabold text-white whitespace-nowrap">
                  Google Maps <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <button type="button" onClick={() => setExpandedMapNo(mapOpen ? null : j.no)} className="col-span-3 inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 px-1.5 font-bold text-slate-700 whitespace-nowrap cursor-pointer">
                  <MapIcon className="h-3.5 w-3.5 text-brand shrink-0" /> {mapOpen ? tx('收起', 'Hide') : tx('地圖', 'Map')}
                </button>
                <div className="col-span-3 grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => handleCopy(j)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 py-2 text-slate-600 cursor-pointer" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setEditingJob(j)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 py-2 text-slate-600 cursor-pointer" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} onEdit={(j) => { setSelectedJob(null); setEditingJob(j); }} onGoEquipment={() => { setSelectedJob(null); onNavigateEquipment(); }} />
      {editingJob && <JobEditModal existing={editingJob === 'new' ? null : editingJob} onClose={() => setEditingJob(null)} />}
    </div>
  );
};
