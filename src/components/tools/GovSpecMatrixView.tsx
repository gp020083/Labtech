import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import {
  HK_GOV_SPECS,
  GOV_DEPTS,
  BD_ROCK_TABLE_2_1,
  GovDeptId,
  GovTestSpecItem,
} from '../../data/hkGovSpecs';
import { Search, Copy, Calculator, FileCheck2, Landmark, AlertCircle } from 'lucide-react';

const DEPT_VISUAL_THEME: Record<
  GovDeptId,
  {
    cellBg: string;
    deptTagCls: string;
    headlineCls: string;
    clauseCls: string;
  }
> = {
  CEDD: {
    cellBg: 'bg-sky-50/45 border-sky-200/80',
    deptTagCls: 'bg-sky-600 text-white',
    headlineCls: 'border-sky-300/90 bg-sky-100/90 text-sky-950',
    clauseCls: 'text-sky-800/80 bg-white/80 border-sky-200/80',
  },
  ASD: {
    cellBg: 'bg-emerald-50/45 border-emerald-200/80',
    deptTagCls: 'bg-emerald-600 text-white',
    headlineCls: 'border-emerald-300/90 bg-emerald-100/90 text-emerald-950',
    clauseCls: 'text-emerald-800/80 bg-white/80 border-emerald-200/80',
  },
  HOUSING: {
    cellBg: 'bg-amber-50/45 border-amber-200/80',
    deptTagCls: 'bg-amber-600 text-white',
    headlineCls: 'border-amber-300/90 bg-amber-100/90 text-amber-950',
    clauseCls: 'text-amber-900/80 bg-white/80 border-amber-200/80',
  },
  BD: {
    cellBg: 'bg-violet-50/45 border-violet-200/80',
    deptTagCls: 'bg-violet-600 text-white',
    headlineCls: 'border-violet-300/90 bg-violet-100/90 text-violet-950',
    clauseCls: 'text-violet-900/80 bg-white/80 border-violet-200/80',
  },
};

const METRIC_TONE_CHIP_CLS: Record<
  'brand' | 'emerald' | 'amber' | 'rose' | 'violet',
  string
> = {
  brand: 'border-sky-200 bg-white text-slate-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  violet: 'border-violet-200 bg-violet-50 text-violet-950',
};

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
        .map((d) => {
          const mTxt = (d.metrics || []).map((m) => `${m.label} ${m.value}`).join(' ');
          return `${d.clauseZh} ${d.clauseEn} ${d.criteriaZh} ${d.criteriaEn} ${d.keyLimitBadge} ${d.highlightBadge || ''} ${mTxt}`;
        })
        .join(' ');
      const hay =
        `${item.titleZh} ${item.titleEn} ${item.summaryZh} ${item.summaryEn} ${item.testStd} ${item.stpCode || ''} ${deptsText}`.toLowerCase();
      return hay.includes(q);
    });
  }, [testFilter, query]);

  const handleCopySpec = (item: GovTestSpecItem) => {
    const lines = GOV_DEPTS.map((d) => {
      const r = item.depts[d.id];
      const flat = (lang === 'en' ? r.criteriaEn : r.criteriaZh).replace(/\n/g, ' ； ');
      return `[${d.short}] ${lang === 'en' ? r.clauseEn : r.clauseZh} — ${flat}`;
    });
    const txt = `【${item.stpCode || item.id.toUpperCase()} · ${lang === 'en' ? item.titleEn : item.titleZh} — ${item.testStd}】\n${lines.join('\n')}`;
    navigator.clipboard?.writeText(txt);
    pushToast(tx('已複製部門驗收標準', 'Copied Dept Acceptance Criteria'), `${item.stpCode || ''} · ${item.testStd}`);
  };

  const activeDepts =
    deptFilter === 'ALL' ? GOV_DEPTS : GOV_DEPTS.filter((d) => d.id === deptFilter);

  return (
    <div className="space-y-4">
      {/* Top Filter & Department Legend Bar */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx(
                '搜尋 1:75 / 1:100 / 0.5% / 15–30 s / Table 7.4 / EXC.T910.1 / Cl. 8.6 / ASTM...',
                'Search 1:75 / 1:100 / 0.5% / 15–30 s / Table 7.4 / EXC.T910.1 / Cl. 8.6...'
              )}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-brand focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDeptFilter('ALL')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold cursor-pointer transition ${
                deptFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tx('4 部門並排對照', 'Compare All 4 Depts')}
            </button>
            {GOV_DEPTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDeptFilter(d.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-extrabold cursor-pointer transition ${
                  deptFilter === d.id
                    ? `${d.badgeCls} ring-2 ring-slate-900/15`
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{d.short}</span>
                <span className="hidden sm:inline ml-1 font-mono text-[10px] opacity-80">
                  · {d.editionTag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 7 LabTech Accredited / Scope Test Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => setTestFilter('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
              testFilter === 'ALL'
                ? 'bg-brand text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            {tx(`全部 ${HK_GOV_SPECS.length} 項測試`, `All ${HK_GOV_SPECS.length} Tests`)}
          </button>
          {HK_GOV_SPECS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTestFilter(item.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
                testFilter === item.id
                  ? 'bg-brand text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <span className="font-mono">{item.stpCode || item.id.toUpperCase()}</span>
              <span className="ml-1 font-semibold">
                · {lang === 'en' ? item.titleEn.split('—')[0].trim() : item.titleZh}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Test-by-Test 4-Department Visual Comparison Blocks */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
          {tx('找不到符合搜尋條件的政府部門驗收標準', 'No matching HK Government specification entries found.')}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden"
            >
              {/* Block Header: Test Code Pill + Title + Standard + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:px-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.stpCode && (
                      <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-black text-white">
                        {item.stpCode}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {lang === 'en' ? item.titleEn : item.titleZh}
                    </h3>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                      {item.testStd}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {lang === 'en' ? item.summaryEn : item.summaryZh}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {item.calcId && (
                    <button
                      type="button"
                      onClick={() => onJumpCalc(item.calcId!)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-extrabold text-white hover:bg-brand-deep cursor-pointer shadow-2xs transition"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      {tx('開啟計算表', 'Calculator')}
                    </button>
                  )}
                  {item.stpCode && (
                    <button
                      type="button"
                      onClick={() => setStpPreviewCode(item.stpCode!)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-brand/35 bg-brand-wash/50 px-3 py-1.5 text-xs font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer transition"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      {tx('預覽 STP', 'Preview STP')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopySpec(item)}
                    title={tx('複製此測試 4 部門要求', 'Copy 4-Dept Criteria')}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 4-Column Department Comparison Grid */}
              <div
                className={`grid gap-3 p-3.5 sm:p-4 ${
                  activeDepts.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {activeDepts.map((d) => {
                  const req = item.depts[d.id];
                  const theme = DEPT_VISUAL_THEME[d.id];
                  const headline = req.highlightBadge || req.keyLimitBadge;
                  const metrics = req.metrics || [];
                  const clauseLabel = lang === 'en' ? req.clauseEn : req.clauseZh;

                  return (
                    <div
                      key={d.id}
                      className={`flex flex-col justify-between rounded-2xl border p-3.5 space-y-2.5 ${theme.cellBg}`}
                    >
                      <div className="space-y-2">
                        {/* Dept Tag + Clause Chip */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-black tracking-wide ${theme.deptTagCls}`}
                          >
                            {d.short}
                          </span>
                          <span
                            className={`truncate rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${theme.clauseCls}`}
                            title={clauseLabel}
                          >
                            {clauseLabel}
                          </span>
                        </div>

                        {/* Headline Standard Pill */}
                        <div
                          className={`rounded-xl border px-2.5 py-1.5 font-mono text-xs font-black tabular-nums leading-snug ${theme.headlineCls}`}
                        >
                          {headline}
                        </div>

                        {/* Structured Key-Value Metric Rows */}
                        {metrics.length > 0 ? (
                          <div className="space-y-1.5 pt-0.5">
                            {metrics.map((m, idx) => {
                              const chipCls = METRIC_TONE_CHIP_CLS[m.tone || 'brand'];
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white/90 px-2.5 py-1.5"
                                >
                                  <span className="text-[11px] font-semibold text-slate-600 leading-tight">
                                    {m.label}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${chipCls}`}
                                  >
                                    {m.value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1 text-[11px] font-semibold text-slate-800 leading-snug">
                            {(lang === 'en' ? req.criteriaEn : req.criteriaZh)
                              .split('\n')
                              .map((line, idx) => (
                                <div key={idx}>{line}</div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BD CoP Foundations 2017 (2024 Ed.) Table 2.1 Quick Reference Card */}
      <div className="rounded-3xl border border-violet-200/90 bg-gradient-to-br from-violet-50/70 via-white to-slate-50 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-violet-700" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx(
                'BD 屋宇署 Code of Practice for Foundations 2017 · 2024 Ed. — Table 2.1 岩石級別速查表',
                'BD Code of Practice for Foundations 2017 · 2024 Ed. — Table 2.1 Rock Categories'
              )}
            </h3>
          </div>
          <span className="rounded-lg border border-violet-200 bg-violet-100/70 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-violet-900">
            {tx('按連續 1.0 m Core Run 評定', 'Evaluated per 1.0 m Core Run')}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-violet-200/70 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-violet-50/80 text-violet-950 font-extrabold border-b border-violet-100 whitespace-nowrap">
              <tr>
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3 py-2.5">
                  {tx('風化等級 Weathering Grade', 'Weathering Grade')}
                </th>
                <th className="px-3 py-2.5">Min TCR</th>
                <th className="px-3 py-2.5">Min Is(50)</th>
                <th className="px-3 py-2.5">Min UCS</th>
                <th className="px-3.5 py-2.5">
                  {tx('推定容許承載力 qa', 'Presumed Bearing qa')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {BD_ROCK_TABLE_2_1.map((row) => (
                <tr key={row.cat} className="hover:bg-violet-50/30">
                  <td className="px-3.5 py-2.5 font-extrabold text-violet-900 whitespace-nowrap">
                    {row.cat}
                  </td>
                  <td className="px-3 py-2.5 font-sans font-semibold text-slate-700">
                    {row.grade}
                  </td>
                  <td className="px-3 py-2.5 font-black text-slate-900 whitespace-nowrap">
                    {row.tcr}
                  </td>
                  <td className="px-3 py-2.5 font-extrabold text-brand-deep">
                    {row.is50}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{row.ucs}</td>
                  <td className="px-3.5 py-2.5 font-black text-emerald-700 whitespace-nowrap">
                    {row.qa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-start gap-2 rounded-2xl border border-violet-200/80 bg-violet-50/60 px-3.5 py-2.5 text-[11px] font-bold text-violet-950">
          <AlertCircle className="h-4 w-4 shrink-0 text-violet-700 mt-0.5" />
          <div className="space-y-0.5">
            <div>
              {tx(
                '強制核實深度：岩層須鑽探核實最少 5 m 深度，或最少 2 倍樁底直徑，以較大者為準。',
                'Mandatory Proving Depth: Rock quality must be proved to at least 5 m depth below foundation base or 2 × pile diameter.'
              )}
            </div>
            <div className="text-violet-800/90 font-semibold">
              {tx(
                'HOKLAS 298 及 STP06 Rev. 2 認可範圍：僅限徑向及軸向岩芯試樣，嚴禁測試不規則塊狀試樣；ASTM D5731 適用於 UCS > 15 MPa 岩石。',
                'HOKLAS 298 & STP06 Rev. 2 Scope: Diametral and Axial rock core specimens ONLY — blocks/irregular lumps prohibited; valid for UCS > 15 MPa.'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
