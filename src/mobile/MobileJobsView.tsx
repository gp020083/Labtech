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
    <div
      className="space-y-2.5 w-full min-w-0"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {/* Header Card */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold text-slate-900 leading-snug">
            {tx('工程及地盤目錄', 'Projects & Sites')}
          </h1>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 tabular-nums">
            {tx(`進行中 ${activeCount} 項 · 共 ${jobs.length} 項`, `${activeCount} Active · ${jobs.length} Total`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingJob('new')}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-xl bg-brand px-3.5 text-xs font-extrabold text-white shadow-xs active:bg-brand-deep whitespace-nowrap cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>{tx('新增地盤', 'New Site')}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tx('搜尋 Site ID、工程編號或地盤名稱...', 'Search Site ID, Project No. or Name...')}
          className="h-11 min-h-[44px] w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand shadow-xs"
        />
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        {(
          [
            ['active', tx('進行中', 'Active'), activeCount],
            ['with_eq', tx('有儀器', 'Gear'), withEqCount],
            ['all', tx('全部', 'All'), jobs.length],
          ] as const
        ).map(([k, lbl, cnt]) => {
          const on = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 font-extrabold whitespace-nowrap tabular-nums transition cursor-pointer ${
                on ? 'bg-slate-900 text-white shadow-2xs' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span>{lbl}</span>
              <span className="font-mono text-[11px] opacity-85">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Site Cards */}
      <div className="space-y-2.5">
        {filtered.map((j) => {
          const eqCount = eqCountByJob[j.no] || 0;
          const mapOpen = expandedMapNo === j.no;
          return (
            <div
              key={j.no}
              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 text-xs overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white tabular-nums whitespace-nowrap">
                    {j.no}
                  </span>
                  <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep tabular-nums whitespace-nowrap">
                    {j.companyProjNo}
                  </span>
                  {eqCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800 tabular-nums whitespace-nowrap">
                      <Wrench className="h-3 w-3 shrink-0" />
                      {eqCount}
                    </span>
                  )}
                </div>
                <div className="shrink-0">
                  <Badge tone={j.status === 'active' ? 'ok' : 'mute'}>
                    {j.status === 'active' ? tx('進行中', 'Active') : tx('已完結', 'Done')}
                  </Badge>
                </div>
              </div>

              <div onClick={() => setSelectedJob(j)} className="cursor-pointer space-y-1.5">
                <div className="text-sm font-extrabold text-slate-900 leading-snug break-words">
                  {j.shortName}
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-snug">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="break-words min-w-0">{j.mapAddress || j.site}</span>
                </div>
                {j.scope && (
                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 leading-snug break-words">
                    Scope · {j.scope}
                  </div>
                )}
              </div>

              {mapOpen && <SiteMapBox job={j} heightClass="h-44" />}

              <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2">
                <a
                  href={buildPinnedGoogleMapsUrl(j)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 font-extrabold text-white active:bg-brand-deep whitespace-nowrap"
                >
                  <span className="truncate">Google Maps</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedMapNo(mapOpen ? null : j.no)}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-700 active:bg-slate-100 whitespace-nowrap cursor-pointer"
                >
                  <MapIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span>{mapOpen ? tx('收起', 'Hide') : tx('地圖', 'Map')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(j)}
                  aria-label={tx('複製地盤資料', 'Copy Site Info')}
                  className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 active:bg-slate-50 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingJob(j)}
                  aria-label={tx('編輯地盤', 'Edit Site')}
                  className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 active:bg-slate-50 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <JobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onEdit={(j) => {
          setSelectedJob(null);
          setEditingJob(j);
        }}
        onGoEquipment={() => {
          setSelectedJob(null);
          onNavigateEquipment();
        }}
      />
      {editingJob && (
        <JobEditModal
          existing={editingJob === 'new' ? null : editingJob}
          onClose={() => setEditingJob(null)}
        />
      )}
    </div>
  );
};
