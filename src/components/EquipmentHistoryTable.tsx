import React, { useState, useMemo } from 'react';
import { EquipmentItem, EquipmentLoanRecord } from '../types';
import { usePrefs } from '../prefs';
import { Badge } from './Badge';
import { LoanDetailModal } from './LoanDetailModal';
import { Search, Download, X, History } from 'lucide-react';

export interface EquipmentHistoryTableProps {
  loans: EquipmentLoanRecord[];
  equipmentMap: Map<string, EquipmentItem>;
  filterCode: string | null;
  onClearFilterCode: () => void;
  onOpenDetail: (code: string) => void;
  onOpenReturn: (eq: EquipmentItem) => void;
}

export const EquipmentHistoryTable: React.FC<EquipmentHistoryTableProps> = ({
  loans,
  equipmentMap,
  filterCode,
  onClearFilterCode,
  onOpenDetail,
  onOpenReturn,
}) => {
  const { tx } = usePrefs();
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'returned'>('all');
  const [search, setSearch] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const sortedLoans = useMemo(
    () => [...loans].sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt)),
    [loans]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedLoans.filter((ln) => {
      if (filterCode && ln.equipmentCode !== filterCode) return false;
      if (stateFilter === 'active' && ln.returnedAt) return false;
      if (stateFilter === 'returned' && !ln.returnedAt) return false;
      if (!q) return true;
      const eq = equipmentMap.get(ln.equipmentCode);
      const hay = `${ln.equipmentCode} ${eq?.name || ''} ${ln.borrowerName} ${ln.returnedBy || ''} ${ln.jobNo} ${ln.siteLocation} ${ln.returnStore || ''} ${ln.remark || ''} ${ln.returnRemark || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sortedLoans, filterCode, stateFilter, search, equipmentMap]);

  const handleExportCsv = () => {
    const bom = '\uFEFF';
    const rows = [
      ['Loan ID', 'Equipment Code', 'Instrument Name', 'Status', 'Borrower', 'Job No.', 'Site Location', 'Checkout Time', 'Expected Return', 'Returned Time', 'Returned By', 'Return Store', 'Condition', 'Checkout Remark', 'Return Remark'],
      ...filtered.map((ln) => {
        const eq = equipmentMap.get(ln.equipmentCode);
        return [
          ln.id, ln.equipmentCode, eq?.name || '—', ln.returnedAt ? 'Returned' : 'On Loan',
          ln.borrowerName, ln.jobNo || '—', ln.siteLocation, ln.checkoutAt, ln.expectedReturn,
          ln.returnedAt || '—', ln.returnedBy || '—', ln.returnStore || '—', ln.returnCondition || '—',
          ln.remark || '', ln.returnRemark || '',
        ];
      }),
    ];
    const csv = bom + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Equipment_Loan_History_${filterCode || 'All'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tx('搜尋器材編號、借用／交還人、Site 地盤或備註...', 'Search Code, Name, Borrower, Site, or Remark...')}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ['all', tx('全部紀錄 All', 'All Logs')],
            ['active', tx('📍 借出中 On Loan', '📍 On Loan')],
            ['returned', tx('✓ 已交還 Returned', '✓ Returned')],
          ] as const).map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setStateFilter(k)} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition cursor-pointer ${stateFilter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {lbl}
            </button>
          ))}
          <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 cursor-pointer">
            <Download className="h-3.5 w-3.5 text-brand" /> {tx('匯出 CSV', 'Export CSV')}
          </button>
        </div>
      </div>
      {filterCode && (
        <div className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand-wash/60 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-brand-deep">
            <History className="h-4 w-4" />
            <span>{tx(`正篩選單一器材借還紀錄：${filterCode}`, `Showing history for equipment: ${filterCode}`)}</span>
            {equipmentMap.get(filterCode) && <span className="text-slate-600 font-normal">({equipmentMap.get(filterCode)?.name})</span>}
          </div>
          <button type="button" onClick={onClearFilterCode} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-extrabold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <X className="h-3.5 w-3.5" /> {tx('顯示全部器材紀錄', 'Show All History')}
          </button>
        </div>
      )}

      <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 font-semibold">
            {tx('沒有符合條件的借出／交還紀錄', 'No matching checkout / return history records')}
          </div>
        ) : (
          filtered.map((ln) => {
            const eq = equipmentMap.get(ln.equipmentCode);
            const condTone = ln.returnCondition === 'damaged' ? 'bad' : ln.returnCondition === 'needs_check' ? 'warn' : 'ok';
            const condLabel = ln.returnCondition === 'damaged' ? tx('異常送修', 'Damaged') : ln.returnCondition === 'needs_check' ? tx('待檢查', 'Check') : tx('正常', 'Good');
            return (
              <div key={ln.id} onClick={() => setSelectedLoanId(ln.id)} className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-brand-wash/30 cursor-pointer transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white whitespace-nowrap">{ln.equipmentCode}</span>
                    <span className="font-extrabold text-slate-900 truncate">{eq?.name || '—'}</span>
                  </div>
                  <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>{ln.returnedAt ? tx('✓ 已交還', '✓ Returned') : tx('📍 借出中', '📍 On Loan')}</Badge>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 space-y-1 text-[11px]">
                  <div className="font-bold text-brand-deep">📍 {ln.siteLocation} {ln.jobNo ? `(${ln.jobNo})` : ''}</div>
                  <div className="text-slate-700">{tx('借出：', 'Out: ')}<span className="font-semibold">{ln.borrowerName}</span> · {ln.checkoutAt}（{tx('預計歸還', 'Due')} {ln.expectedReturn}）</div>
                  {ln.returnedAt && (
                    <div className="flex flex-wrap items-center gap-1.5 text-emerald-800">
                      <span>{tx('交還：', 'In: ')}{ln.returnedAt} · {ln.returnStore || eq?.store || 'Office'}</span>
                      {ln.returnCondition && <Badge tone={condTone}>{condLabel}</Badge>}
                    </div>
                  )}
                  {(ln.remark || ln.returnRemark) && <div className="text-slate-500">{ln.remark || ln.returnRemark}</div>}
                </div>
                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <span className="font-mono text-[10px] text-slate-400">{ln.id}</span>
                  {!ln.returnedAt && eq ? (
                    <button type="button" onClick={() => onOpenReturn(eq)} className="rounded-xl bg-emerald-600 px-3 py-1.5 font-extrabold text-white whitespace-nowrap cursor-pointer">{tx('交還', 'Return')}</button>
                  ) : (
                    <button type="button" onClick={() => setSelectedLoanId(ln.id)} className="rounded-xl border border-slate-200 px-2.5 py-1 font-bold text-slate-600 whitespace-nowrap cursor-pointer">{tx('詳情', 'Details')}</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3">{tx('狀態', 'Status')}</th>
              <th className="px-3 py-3">{tx('器材編號及名稱', 'Equipment')}</th>
              <th className="px-3 py-3">{tx('借出 Checkout 詳情', 'Checkout Details')}</th>
              <th className="px-3 py-3">{tx('目的地 Site / Job', 'Site / Job')}</th>
              <th className="px-3 py-3">{tx('交還 Return 詳情及狀況', 'Return Details & Condition')}</th>
              <th className="px-3 py-3">{tx('備註 Remark', 'Remarks')}</th>
              <th className="px-4 py-3 text-right">{tx('操作', 'Action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-semibold">
                  {tx('沒有符合條件的借出／交還紀錄', 'No matching checkout / return history records')}
                </td>
              </tr>
            ) : (
              filtered.map((ln) => {
                const eq = equipmentMap.get(ln.equipmentCode);
                const condLabel = ln.returnCondition === 'damaged'
                  ? tx('Damaged 異常送修', 'Damaged')
                  : ln.returnCondition === 'needs_check'
                  ? tx('Needs Check 待檢查', 'Needs Check')
                  : tx('Good 正常', 'Good');
                const condTone = ln.returnCondition === 'damaged' ? 'bad' : ln.returnCondition === 'needs_check' ? 'warn' : 'ok';
                return (
                  <tr key={ln.id} onClick={() => setSelectedLoanId(ln.id)} className="hover:bg-brand-wash/30 transition align-top cursor-pointer">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>
                        {ln.returnedAt ? tx('✓ 已交還', '✓ Returned') : tx('📍 借出中', '📍 On Loan')}
                      </Badge>
                      <div className="mt-1 font-mono text-[10px] text-slate-400">{ln.id}</div>
                    </td>
                    <td className="px-3 py-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenDetail(ln.equipmentCode); }}>
                      <div className="font-mono font-extrabold text-slate-900 hover:text-brand">{ln.equipmentCode}</div>
                      <div className="text-[11px] text-slate-500">{eq?.name || '—'}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{ln.borrowerName}</div>
                      <div className="font-mono text-[11px] text-slate-600">{tx('借出：', 'Out: ')}{ln.checkoutAt}</div>
                      <div className="font-mono text-[11px] text-slate-400">{tx('預計歸還：', 'Due: ')}{ln.expectedReturn}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-brand-deep">📍 {ln.siteLocation}</div>
                      {ln.jobNo && <div className="font-mono text-[11px] text-slate-500">Job: {ln.jobNo}</div>}
                    </td>
                    <td className="px-3 py-3">
                      {ln.returnedAt ? (
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-emerald-700">{tx('交還：', 'In: ')}{ln.returnedAt}</div>
                          <div className="text-[11px] text-slate-600">
                            {ln.returnedBy ? `${ln.returnedBy} · ` : ''}{tx('入倉：', 'Store: ')}{ln.returnStore || eq?.store || 'Office'}
                          </div>
                          {ln.returnCondition && <Badge tone={condTone}>{condLabel}</Badge>}
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-700">{tx('尚未交還入倉', 'Pending return')}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-[230px] space-y-1 text-[11px] text-slate-600">
                      {ln.remark && <div><span className="font-bold text-slate-700">{tx('借出：', 'Out: ')}</span>{ln.remark}</div>}
                      {ln.returnRemark && <div><span className="font-bold text-emerald-700">{tx('交還：', 'In: ')}</span>{ln.returnRemark}</div>}
                      {!ln.remark && !ln.returnRemark && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {!ln.returnedAt && eq ? (
                        <button type="button" onClick={() => onOpenReturn(eq)} className="inline-flex h-8 w-[4.75rem] items-center justify-center rounded-xl bg-emerald-600 px-2 font-extrabold text-white hover:bg-emerald-700 whitespace-nowrap cursor-pointer">
                          {tx('交還', 'Return')}
                        </button>
                      ) : (
                        <button type="button" onClick={() => setSelectedLoanId(ln.id)} className="inline-flex h-8 w-[4.75rem] items-center justify-center rounded-xl border border-slate-200 px-2 font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap cursor-pointer">
                          {tx('詳情', 'Details')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(() => {
        const selectedLoan = selectedLoanId ? loans.find((l) => l.id === selectedLoanId) || null : null;
        const selectedEq = selectedLoan ? equipmentMap.get(selectedLoan.equipmentCode) || null : null;
        return (
          <LoanDetailModal
            loan={selectedLoan}
            equipment={selectedEq}
            onClose={() => setSelectedLoanId(null)}
            onOpenReturn={selectedLoan && !selectedLoan.returnedAt && selectedEq ? () => onOpenReturn(selectedEq) : undefined}
            onOpenEquipment={selectedLoan ? () => { onOpenDetail(selectedLoan.equipmentCode); setSelectedLoanId(null); } : undefined}
          />
        );
      })()}
    </div>
  );
};
