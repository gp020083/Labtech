import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { SERVER_QUALITY_DOCS, FQS49_MATRIX, ServerQualityDoc } from '../data/serverDocsCatalog';
import { resolveDocLink } from '../driveDocs';
import { Badge } from './Badge';
import { Search, Eye, Download } from 'lucide-react';

export const QualityDocsVaultTable: React.FC = () => {
  const { openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [cat, setCat] = useState<'all' | ServerQualityDoc['category']>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return SERVER_QUALITY_DOCS.filter((d) => {
      if (cat !== 'all' && d.category !== cat) return false;
      if (!kw) return true;
      return `${d.code} ${d.titleZh} ${d.titleEn} ${d.testCode || ''} ${d.format}`.toLowerCase().includes(kw);
    });
  }, [cat, q]);

  const cats: [typeof cat, string][] = [
    ['all', tx(`全部文件 (${SERVER_QUALITY_DOCS.length})`, `All Docs (${SERVER_QUALITY_DOCS.length})`)],
    ['hoklas', tx('HOKLAS 及組織架構', 'HOKLAS & Org')],
    ['order_daily', tx('FQS08 委託單 & FQS09 現場紀錄', 'FQS08 & FQS09 Forms')],
    ['cal_qc', tx('校準、月檢及借還表格', 'Cal & QC Forms')],
    ['mu_ref', tx('MU 不確定度及工程實績', 'MU & Job References')],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('搜尋表格編號 (FQS08 / FQS09 / FCC01 / MU / HOKLAS)...', 'Search form code or title...')} className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {cats.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setCat(k)} className={`rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${cat === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
        {filtered.map((d) => (
          <div key={d.id} className="p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-extrabold text-brand-deep">{d.code}</span>
                {d.testCode && <span className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep">{d.testCode}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-500">{d.revDate}</span>
                <Badge tone={d.format === 'PDF' ? 'ok' : 'brand'}>{d.format}</Badge>
              </div>
            </div>
            <div className="font-extrabold text-slate-900 leading-snug">{lang === 'en' ? d.titleEn : d.titleZh}</div>
            <div className="flex items-center gap-2 pt-0.5">
              <button type="button" onClick={() => openPreviewDoc({ title: `${d.code} — ${lang === 'en' ? d.titleEn : d.titleZh}`, url: d.url, fileName: `${d.code}.${d.format.toLowerCase()}`, subtitle: `Rev: ${d.revDate} · ${d.format}` })} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white cursor-pointer">
                <Eye className="h-3.5 w-3.5" /> {tx('預覽', 'Preview')}
              </button>
              <a href={resolveDocLink(d.url).downloadUrl || d.url} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700">
                <Download className="h-3.5 w-3.5" /> {tx('下載', 'Download')}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="w-36 px-4 py-3">{tx('文件編號', 'Code')}</th>
              <th className="px-3 py-3">{tx('文件名稱', 'Document Title')}</th>
              <th className="w-24 px-3 py-3">{tx('關聯項目', 'Test')}</th>
              <th className="w-28 px-3 py-3">{tx('修訂日期', 'Rev Date')}</th>
              <th className="w-20 px-3 py-3">{tx('格式', 'Format')}</th>
              <th className="px-4 py-3 text-right">{tx('檢視及下載', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/80 transition">
                <td className="px-4 py-3 font-mono font-extrabold text-brand-deep whitespace-nowrap">{d.code}</td>
                <td className="px-3 py-3 font-bold text-slate-900">{lang === 'en' ? d.titleEn : d.titleZh}</td>
                <td className="px-3 py-3 whitespace-nowrap">{d.testCode ? <span className="rounded bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep whitespace-nowrap">{d.testCode}</span> : <span className="text-slate-400">—</span>}</td>
                <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{d.revDate}</td>
                <td className="px-3 py-3 whitespace-nowrap"><Badge tone={d.format === 'PDF' ? 'ok' : 'brand'}>{d.format}</Badge></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openPreviewDoc({ title: `${d.code} — ${lang === 'en' ? d.titleEn : d.titleZh}`, url: d.url, fileName: `${d.code}.${d.format.toLowerCase()}`, subtitle: `Rev: ${d.revDate} · ${d.format}` })}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand px-2.5 py-1.5 font-extrabold text-white hover:bg-brand-deep whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('預覽', 'Preview')}
                    </button>
                    <a href={resolveDocLink(d.url).downloadUrl || d.url} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0">
                      <Download className="h-3.5 w-3.5 shrink-0" /> {tx('下載', 'Download')}
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PersonnelMatrixTable: React.FC = () => {
  const { openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const sep = lang === 'en' ? ', ' : '、';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
        <div>
          <div className="font-extrabold text-emerald-900">{tx('FQS49 授權簽署人 (Approved Signatories) 及合資格操作員矩陣', 'FQS49 Approved Signatories & Qualified Operators Matrix')}</div>
          <div className="mt-0.5 text-emerald-800">{tx('資料同步自品質文件 FQS49 (2026-03-23) 及 HOKLAS 298 認可範圍證書 (Issue 2026-07-24)。', 'Synced from FQS49 (23 Mar 2026) and HOKLAS 298 Scope of Accreditation (Issue 24 Jul 2026).')}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openPreviewDoc({ title: tx('HOKLAS 298 認可範圍證書 (Scope of Accreditation)', 'HOKLAS 298 Scope of Accreditation'), url: '/server-docs/forms/HOKLAS298_Scope_of_Accreditation_260727.pdf' })} className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 font-extrabold text-white hover:bg-emerald-800 cursor-pointer">
            <Eye className="h-3.5 w-3.5" /> {tx('預覽 HOKLAS 298 證書', 'Preview HOKLAS 298')}
          </button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS49 合資格操作員及授權簽署人名單', 'FQS49 List of Qualified Operators & Approved Signatories'), url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' })} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 font-bold text-emerald-900 hover:bg-emerald-50 cursor-pointer">
            <Eye className="h-3.5 w-3.5" /> {tx('預覽 FQS49 名單', 'Preview FQS49')}
          </button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('MWI01 職責說明及人員能力要求 rev 4', 'MWI01 Job Descriptions & Competence Requirements rev 4'), url: '/server-docs/forms/MWI01_Job_Descriptions_Competence_rev4_260206.pdf' })} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 font-bold text-emerald-900 hover:bg-emerald-50 cursor-pointer">
            <Eye className="h-3.5 w-3.5" /> {tx('預覽 MWI01', 'Preview MWI01')}
          </button>
        </div>
      </div>

      <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
        {FQS49_MATRIX.map((r) => (
          <div key={r.code} className="p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">{r.code}</span>
                <span className="font-extrabold text-slate-900 truncate">{r.testName}</span>
              </div>
              <Badge tone={r.hoklasStatus === 'Accredited' ? 'ok' : 'warn'}>{r.hoklasStatus}</Badge>
            </div>
            <div className="text-[11px] text-slate-500">{r.standard}</div>
            <div className="rounded-xl bg-slate-50 p-2.5 space-y-1 text-[11px]">
              <div><span className="font-bold text-slate-600">{tx('授權簽署人：', 'AS: ')}</span><span className="font-semibold text-emerald-900">{r.signatories.join(sep)}</span></div>
              <div><span className="font-bold text-slate-600">{tx('合資格操作員：', 'Operators: ')}</span><span className="text-slate-800">{r.qualifiedOperators.length ? r.qualifiedOperators.join(sep) : tx('籌備評核中', 'Pending')}</span></div>
              {r.trainees.length > 0 && <div><span className="font-bold text-slate-500">{tx('受訓中：', 'Trainees: ')}</span><span className="text-slate-600">{r.trainees.join(sep)}</span></div>}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="w-16 px-4 py-3">Code</th>
              <th className="w-56 px-3 py-3">{tx('測試項目及標準', 'Test Method & Standard')}</th>
              <th className="w-28 px-3 py-3">{tx('HOKLAS 狀態', 'Status')}</th>
              <th className="px-3 py-3">{tx('授權簽署人 (Approved Signatories)', 'Approved Signatories (AS)')}</th>
              <th className="px-3 py-3">{tx('合資格操作員 (Qualified Operators)', 'Qualified Operators')}</th>
              <th className="w-48 px-4 py-3">{tx('受訓中人員 (Trainees)', 'In Training')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FQS49_MATRIX.map((r) => (
              <tr key={r.code} className="hover:bg-slate-50/80 transition">
                <td className="px-4 py-3.5"><span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono font-extrabold text-white">{r.code}</span></td>
                <td className="px-3 py-3.5">
                  <div className="font-extrabold text-slate-900">{r.testName}</div>
                  <div className="text-[11px] text-slate-500">{r.standard}</div>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap"><Badge tone={r.hoklasStatus === 'Accredited' ? 'ok' : 'warn'}>{r.hoklasStatus}</Badge></td>
                <td className="px-3 py-3.5 font-semibold text-emerald-900">{r.signatories.join(sep)}</td>
                <td className="px-3 py-3.5 text-slate-800">{r.qualifiedOperators.length ? r.qualifiedOperators.join(sep) : <span className="text-slate-400">{tx('籌備評核中', 'Pending Assessment')}</span>}</td>
                <td className="px-4 py-3.5 text-slate-600">{r.trainees.length ? r.trainees.join(sep) : <span className="text-slate-400">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
