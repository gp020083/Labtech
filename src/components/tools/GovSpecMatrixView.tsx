import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { HK_GOV_SPECS, GOV_DEPTS, BD_ROCK_TABLE_2_1, GovDeptId, GovTestSpecItem } from '../../data/hkGovSpecs';
import { Search, Copy, Calculator, FileCheck2, Landmark } from 'lucide-react';

export const GovSpecMatrixView: React.FC<{
  onJumpCalc: (calcId: NonNullable<GovTestSpecItem['calcId']>) => void;
}> = ({ onJumpCalc }) => {
  const { setStpPreviewCode, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const [deptFilter, setDeptFilter] = useState<'ALL' | GovDeptId>('ALL');
  const [testFilter, setTestFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HK_GOV_SPECS.filter((item) => {
      if (testFilter !== 'ALL' && item.id !== testFilter) return false;
      if (!q) return true;
      const deptsText = Object.values(item.depts)
        .map((d) => `${d.clauseZh} ${d.clauseEn} ${d.criteriaZh} ${d.criteriaEn} ${d.keyLimitBadge}`)
        .join(' ');
      const hay = `${item.titleZh} ${item.titleEn} ${item.testStd} ${item.stpCode || ''} ${deptsText}`.toLowerCase();
      return hay.includes(q);
    });
  }, [testFilter, query]);

  const handleCopySpec = (item: GovTestSpecItem) => {
    const lines = GOV_DEPTS.map((d) => {
      const r = item.depts[d.id];
      const flat = (lang === 'en' ? r.criteriaEn : r.criteriaZh).replace(/\n/g, ' ； ');
      return `[${d.short}] (${lang === 'en' ? r.clauseEn : r.clauseZh}): ${flat}`;
    });
    const txt = `【${lang === 'en' ? item.titleEn : item.titleZh} — ${item.testStd}】\n${lines.join('\n')}`;
    navigator.clipboard?.writeText(txt);
    pushToast(tx('已複製部門驗收要求', 'Copied Spec Requirements'), item.testStd);
  };

  const activeDepts = deptFilter === 'ALL' ? GOV_DEPTS : GOV_DEPTS.filter((d) => d.id === deptFilter);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx('搜尋 1:75 / 1:100 / Bleeding 2% / Cat 1(c) / CS1 27°C / 98% MDD / ASTM...', 'Search 1:75 / Bleeding 2% / Cat 1(c) / CS1 27°C / 98% MDD / ASTM...')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDeptFilter('ALL')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold cursor-pointer transition ${deptFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {tx('全部 4 部門並排', 'Compare All 4 Depts')}
            </button>
            {GOV_DEPTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDeptFilter(d.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-extrabold cursor-pointer transition ${deptFilter === d.id ? d.badgeCls + ' ring-2 ring-slate-900/15' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button type="button" onClick={() => setTestFilter('ALL')} className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${testFilter === 'ALL' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}>
            {tx(`全部 Tests (${HK_GOV_SPECS.length})`, `All Tests (${HK_GOV_SPECS.length})`)}
          </button>
          {HK_GOV_SPECS.map((item) => (
            <button key={item.id} type="button" onClick={() => setTestFilter(item.id)} className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${testFilter === item.id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'}`}>
              {item.emoji} {item.stpCode || item.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="md:hidden space-y-3 text-xs">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{item.emoji} {lang === 'en' ? item.titleEn : item.titleZh}</div>
                <div className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">{item.testStd}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.calcId && (
                  <button type="button" onClick={() => onJumpCalc(item.calcId!)} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white cursor-pointer">
                    <Calculator className="h-3 w-3" /> {tx('計算', 'Calc')}
                  </button>
                )}
                {item.stpCode && (
                  <button type="button" onClick={() => setStpPreviewCode(item.stpCode!)} className="rounded-lg border border-brand/35 bg-brand-wash/40 px-2 py-1 text-[11px] font-extrabold text-brand-deep cursor-pointer">STP</button>
                )}
                <button type="button" onClick={() => handleCopySpec(item)} className="rounded-lg border border-slate-200 p-1 text-slate-600 cursor-pointer"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70">
              {activeDepts.map((d) => {
                const req = item.depts[d.id];
                const bullets = (lang === 'en' ? req.criteriaEn : req.criteriaZh).split('\n');
                return (
                  <div key={d.id} className="p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-extrabold ${d.badgeCls}`}>{d.short}</span>
                      <span className="font-mono text-[10px] font-bold text-slate-400 truncate">{lang === 'en' ? req.clauseEn : req.clauseZh}</span>
                    </div>
                    <ul className="space-y-0.5 text-[11px] font-semibold text-slate-800 leading-snug">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-1"><span className="text-brand font-bold">•</span><span>{b}</span></li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-700">
            <tr>
              <th className="w-56 px-4 py-3">{tx('測試項目 / Standard', 'Test & Standard')}</th>
              {activeDepts.map((d) => (
                <th key={d.id} className="px-3.5 py-3">
                  <span className={`inline-block rounded-lg border px-2 py-0.5 text-[11px] font-extrabold ${d.badgeCls}`}>{d.short}</span>
                </th>
              ))}
              <th className="w-32 px-4 py-3 text-right">{tx('工具 / STP', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-3.5">
                  <div className="font-extrabold text-slate-900">{item.emoji} {lang === 'en' ? item.titleEn : item.titleZh}</div>
                  <div className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">{item.testStd}</div>
                </td>
                {activeDepts.map((d) => {
                  const req = item.depts[d.id];
                  const bullets = (lang === 'en' ? req.criteriaEn : req.criteriaZh).split('\n');
                  return (
                    <td key={d.id} className="px-3.5 py-3.5">
                      <div className="mb-1 font-mono text-[10px] font-bold text-slate-400">{lang === 'en' ? req.clauseEn : req.clauseZh}</div>
                      <ul className="space-y-0.5 text-[11px] font-semibold text-slate-800 leading-snug">
                        {bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-1"><span className="text-brand font-bold">•</span><span>{b}</span></li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
                <td className="px-4 py-3.5">
                  <div className="flex flex-col items-end gap-1.5">
                    {item.calcId && (
                      <button type="button" onClick={() => onJumpCalc(item.calcId!)} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-brand-deep cursor-pointer">
                        <Calculator className="h-3 w-3" /> {tx('計算工具', 'Calc')}
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      {item.stpCode && (
                        <button type="button" onClick={() => setStpPreviewCode(item.stpCode!)} className="inline-flex items-center gap-1 rounded-lg border border-brand/35 bg-brand-wash/40 px-2 py-1 text-[11px] font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer">
                          <FileCheck2 className="h-3 w-3" /> STP
                        </button>
                      )}
                      <button type="button" onClick={() => handleCopySpec(item)} title="Copy Spec" className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 cursor-pointer"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-3xl border border-violet-200/90 bg-gradient-to-br from-violet-50/70 via-white to-slate-50 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-violet-700" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx('🪨 BD 屋宇署《Code of Practice for Foundations 2017》Table 2.1 岩石級別速查表', '🪨 BD Code of Practice for Foundations 2017 — Table 2.1 Rock Categories')}
            </h3>
          </div>
          <span className="font-mono text-[11px] font-bold text-violet-800">{tx('按連續 1.0m Core Run 評定', 'Evaluated per 1.0m Core Run')}</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-violet-200/70 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-violet-50/80 text-violet-950 font-extrabold border-b border-violet-100">
              <tr><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">{tx('岩石風化等級 Weathering Grade', 'Weathering Grade')}</th><th className="px-3 py-2.5">Min TCR</th><th className="px-3 py-2.5">Min Is(50)</th><th className="px-3 py-2.5">Min UCS</th><th className="px-3 py-2.5">{tx('容許承載力 qa', 'Allowable Bearing qa')}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {BD_ROCK_TABLE_2_1.map((row) => (
                <tr key={row.cat} className="hover:bg-violet-50/30">
                  <td className="px-3 py-2 font-extrabold text-violet-800">{row.cat}</td>
                  <td className="px-3 py-2 font-sans font-semibold text-slate-700">{row.grade}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">{row.tcr}</td>
                  <td className="px-3 py-2 font-extrabold text-brand-deep">{row.is50}</td>
                  <td className="px-3 py-2 text-slate-700">{row.ucs}</td>
                  <td className="px-3 py-2 font-bold text-emerald-700">{row.qa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
