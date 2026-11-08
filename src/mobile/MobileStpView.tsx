import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { downloadBlankTemplate } from '../utils';
import { resolveDocLink } from '../driveDocs';
import { Badge } from '../components/Badge';
import { NewStpModal } from '../components/NewStpModal';
import { SERVER_QUALITY_DOCS, FQS49_MATRIX } from '../data/serverDocsCatalog';
import { Plus, Search, Star, Eye, BookOpen, Download } from 'lucide-react';

export const MobileStpView: React.FC = () => {
  const { tests, pinnedStps, togglePinStp, setStpPreviewCode, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [tab, setTab] = useState<'stp' | 'forms' | 'fqs49'>('stp');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | 'hoklas' | 'order_daily' | 'cal_qc' | 'mu_ref'>('all');
  const [newOpen, setNewOpen] = useState(false);

  const filteredStps = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tests.filter((t) =>
      !q || `${t.code} ${t.name} ${t.std} ${t.stpDocCode} ${t.worksheetCode}`.toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => (pinnedStps.includes(a.code) ? 0 : 1) - (pinnedStps.includes(b.code) ? 0 : 1));
  }, [tests, pinnedStps, query]);

  const filteredForms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVER_QUALITY_DOCS.filter((d) => {
      if (catFilter !== 'all' && d.category !== catFilter) return false;
      if (!q) return true;
      return `${d.code} ${d.titleZh} ${d.titleEn} ${d.testCode || ''}`.toLowerCase().includes(q);
    });
  }, [query, catFilter]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold text-slate-900">{tx('📄 受控 STP 及品質文件庫', '📄 Controlled STPs & Vault')}</h1>
            <p className="text-[11px] text-slate-500">{tx('HOKLAS 298 現行程序書、表格及授權名單', 'HOKLAS 298 STPs, Forms & FQS49 Matrix')}</p>
          </div>
          <button type="button" onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white cursor-pointer">
            <Plus className="h-4 w-4" /> STP
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-extrabold">
          <button type="button" onClick={() => setTab('stp')} className={`rounded-lg py-2 cursor-pointer ${tab === 'stp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>{tx(`受控 STP (${tests.length})`, `STPs (${tests.length})`)}</button>
          <button type="button" onClick={() => setTab('forms')} className={`rounded-lg py-2 cursor-pointer ${tab === 'forms' ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>{tx(`表格庫 (${SERVER_QUALITY_DOCS.length})`, `Forms (${SERVER_QUALITY_DOCS.length})`)}</button>
          <button type="button" onClick={() => setTab('fqs49')} className={`rounded-lg py-2 cursor-pointer ${tab === 'fqs49' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600'}`}>{tx('FQS49 名單', 'FQS49')}</button>
        </div>
      </div>

      {tab !== 'fqs49' && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx('搜尋 STP、FQS08、FQS09、HOKLAS、ASTM...', 'Search STP, FQS08, FQS09, HOKLAS, ASTM...')} className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand" />
        </div>
      )}

      {tab === 'stp' && (
        <div className="space-y-2.5 text-xs">
          {filteredStps.map((t) => {
            const isPinned = pinnedStps.includes(t.code);
            return (
              <div key={t.code} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button type="button" onClick={() => togglePinStp(t.code)} className={`rounded-lg p-1 cursor-pointer ${isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300'}`}>
                      <Star className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                    <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">{t.code}</span>
                    <span className="font-mono font-extrabold text-brand-deep truncate">{t.stpDocCode} ({t.stpRev})</span>
                  </div>
                  <Badge tone={t.acc ? 'ok' : 'warn'}>{t.acc ? 'HOKLAS' : 'Draft'}</Badge>
                </div>
                <div onClick={() => setStpPreviewCode(t.code)} className="cursor-pointer">
                  <div className="text-sm font-extrabold text-slate-900">{t.name}</div>
                  <div className="text-[11px] text-slate-500">{t.std}</div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" disabled={!t.stpPdfUrl} onClick={() => t.stpPdfUrl && openPreviewDoc({ title: `${t.stpDocCode} (${t.stpRev})`, url: t.stpPdfUrl, fileName: `${t.stpDocCode}.pdf`, subtitle: t.std })} className={`inline-flex items-center justify-center gap-1 rounded-xl border py-2 font-extrabold ${t.stpPdfUrl ? 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer' : 'border-slate-100 bg-slate-50 text-slate-300'}`}>
                    <Eye className="h-3.5 w-3.5" /> {tx('預覽 STP', 'Preview')}
                  </button>
                  <button type="button" onClick={() => setStpPreviewCode(t.code)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand py-2 font-extrabold text-white cursor-pointer">
                    <BookOpen className="h-3.5 w-3.5" /> {tx(`詳情 (${t.stpFiles?.length || 0})`, `Details (${t.stpFiles?.length || 0})`)}
                  </button>
                  <button type="button" onClick={() => downloadBlankTemplate(t)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand/40 bg-brand-wash/40 py-2 font-extrabold text-brand-deep cursor-pointer">
                    <Download className="h-3.5 w-3.5" /> WS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'forms' && (
        <div className="space-y-2.5 text-xs">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {([
              ['all', tx('全部', 'All')],
              ['hoklas', 'HOKLAS'],
              ['order_daily', 'FQS08/09'],
              ['cal_qc', tx('內檢/借還', 'Cal/Loan')],
              ['mu_ref', tx('MU/實績', 'MU/Ref')],
            ] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setCatFilter(k)} className={`rounded-xl px-3 py-1.5 font-extrabold shrink-0 cursor-pointer ${catFilter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{lbl}</button>
            ))}
          </div>
          {filteredForms.map((d) => {
            const title = lang === 'en' ? d.titleEn : d.titleZh;
            const dlUrl = resolveDocLink(d.url, d.code).downloadUrl || d.url;
            return (
              <div key={d.id} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep">{d.code}</span>
                  <span className="font-mono text-[10px] font-bold text-slate-400">{d.format} · {d.revDate}</span>
                </div>
                <div className="font-extrabold text-slate-900">{title}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openPreviewDoc({ title: `${d.code} — ${title}`, url: d.url, fileName: `${d.code}.${d.format.toLowerCase()}` })} className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand py-2 font-extrabold text-white cursor-pointer"><Eye className="h-3.5 w-3.5" /> {tx('預覽', 'Preview')}</button>
                  <a href={dlUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 font-extrabold text-slate-700"><Download className="h-3.5 w-3.5" /> {tx('下載', 'Download')}</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'fqs49' && (
        <div className="space-y-2.5 text-xs">
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS49 合資格操作員及授權簽署人名單', 'FQS49 Matrix PDF'), url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' })} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-700 py-2.5 font-extrabold text-white cursor-pointer">
            <Eye className="h-4 w-4" /> {tx('預覽 FQS49 授權名單原檔 PDF', 'Preview Official FQS49 PDF')}
          </button>
          {FQS49_MATRIX.map((row) => (
            <div key={row.code} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">{row.code}</span>
                <Badge tone={row.hoklasStatus === 'Accredited' ? 'ok' : 'warn'}>{row.hoklasStatus}</Badge>
              </div>
              <div className="font-extrabold text-slate-900">{row.testName} <span className="font-normal text-slate-500">({row.standard})</span></div>
              <div className="rounded-xl bg-emerald-50/60 p-2.5 space-y-1 text-[11px]">
                <div><span className="font-extrabold text-emerald-900">{tx('簽署人 (AS)：', 'AS: ')}</span>{row.signatories.join(', ')}</div>
                <div><span className="font-extrabold text-slate-700">{tx('操作員：', 'Operators: ')}</span>{row.qualifiedOperators.join(', ') || '—'}</div>
                {row.trainees.length > 0 && <div><span className="font-extrabold text-amber-800">{tx('培訓中：', 'In Training: ')}</span>{row.trainees.join(', ')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {newOpen && <NewStpModal onClose={() => setNewOpen(false)} />}
    </div>
  );
};
