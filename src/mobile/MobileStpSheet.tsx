import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { downloadBlankTemplate } from '../utils';
import { resolveDocLink } from '../driveDocs';
import { Badge } from '../components/Badge';
import { X, Eye, Download, UploadCloud, AlertOctagon, Users } from 'lucide-react';

export const MobileStpSheet: React.FC = () => {
  const { stpPreviewCode, setStpPreviewCode, tests, uploadStpDocFile, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  if (!stpPreviewCode) return null;
  const test = tests.find((t) => t.code === stpPreviewCode) || tests[0];
  const files = test.stpFiles || [];
  const docTypes = ['ALL', ...Array.from(new Set(files.map((f) => f.docType).filter(Boolean) as string[]))];
  const visibleFiles = docTypeFilter === 'ALL' ? files : files.filter((f) => f.docType === docTypeFilter);

  const handleUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadStpDocFile(test.code, {
        fileName: f.name,
        fileSize: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        docType: docTypeFilter === 'ALL' ? tx('受控 STP PDF', 'Controlled STP PDF') : docTypeFilter,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      ev.target.value = '';
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white h-[100dvh] w-full max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={test.acc ? 'ok' : 'warn'}>{test.acc ? tx('現行受控 STP', 'Controlled STP') : 'Draft STP'}</Badge>
            <span className="font-mono text-xs font-extrabold text-brand-deep">{test.stpDocCode} · {test.stpRev}</span>
          </div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">{test.code} — {test.name}</div>
          <div className="text-[11px] text-slate-500">{test.std} · Eff: {test.stpEffectiveDate}</div>
        </div>
        <button type="button" onClick={() => setStpPreviewCode(null)} className="rounded-xl bg-slate-200/70 p-2 text-slate-700 shrink-0 cursor-pointer"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3.5 text-xs">
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-rose-800">
          <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="text-[11px] font-semibold leading-snug">
            {tx(`僅提供最新生效受控版（${test.stpDocCode} ${test.stpRev}）；所有舊版已作廢封存。`, `Serves current controlled revision (${test.stpDocCode} ${test.stpRev}) only; obsolete versions are locked.`)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {test.stpPdfUrl && (
            <>
              <button type="button" onClick={() => openPreviewDoc({ title: `${test.stpDocCode} (${test.stpRev})`, url: test.stpPdfUrl!, fileName: `${test.stpDocCode}.pdf`, subtitle: test.std })} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand py-3 text-sm font-extrabold text-white shadow-xs cursor-pointer">
                <Eye className="h-4 w-4" /> {tx(`預覽受控 STP PDF (${test.stpDocCode})`, `Preview Controlled STP (${test.stpDocCode})`)}
              </button>
              <a href={resolveDocLink(test.stpPdfUrl).downloadUrl || test.stpPdfUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand/40 bg-white py-2.5 font-extrabold text-brand-deep">
                <Download className="h-3.5 w-3.5" /> {tx('下載 STP PDF', 'Download STP')}
              </a>
            </>
          )}
          <button type="button" onClick={() => downloadBlankTemplate(test)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand/40 bg-brand-wash/50 py-2.5 font-extrabold text-brand-deep cursor-pointer">
            <Download className="h-3.5 w-3.5" /> {tx('下載 Worksheet', 'Download WS')}
          </button>
          {test.orderFormUrl && <button type="button" onClick={() => openPreviewDoc({ title: `${test.code} — FQS08`, url: test.orderFormUrl! })} className="rounded-xl border border-slate-200 bg-slate-50 py-2 font-bold text-slate-700 cursor-pointer">{tx('預覽 FQS08 委託單', 'FQS08 Order Form')}</button>}
          {test.dailyRecordUrl && <button type="button" onClick={() => openPreviewDoc({ title: `${test.code} — FQS09`, url: test.dailyRecordUrl! })} className="rounded-xl border border-slate-200 bg-slate-50 py-2 font-bold text-slate-700 cursor-pointer">{tx('預覽 FQS09 每日紀錄', 'FQS09 Daily Record')}</button>}
          {test.muTemplateUrl && <button type="button" onClick={() => openPreviewDoc({ title: `${test.code} — MU`, url: test.muTemplateUrl! })} className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 py-2 font-bold text-slate-700 cursor-pointer">{tx('預覽 MU 測量不確定度表', 'Preview MU Uncertainty Sheet')}</button>}
        </div>

        {(test.approvedSignatories?.length || test.qualifiedOperators?.length) ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-900"><Users className="h-4 w-4 text-emerald-700" /> {tx('FQS49 授權人員', 'FQS49 Personnel')}</span>
              <button type="button" onClick={() => openPreviewDoc({ title: 'FQS49', url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' })} className="font-bold text-emerald-800 underline cursor-pointer">{tx('原檔', 'PDF')}</button>
            </div>
            {test.approvedSignatories?.length ? <div><span className="font-bold text-slate-600">{tx('簽署人 (AS)：', 'AS: ')}</span><span className="font-semibold text-slate-900">{test.approvedSignatories.join(lang === 'en' ? ', ' : '、')}</span></div> : null}
            {test.qualifiedOperators?.length ? <div><span className="font-bold text-slate-600">{tx('操作員：', 'Operators: ')}</span><span className="text-slate-800">{test.qualifiedOperators.join(lang === 'en' ? ', ' : '、')}</span></div> : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
          <div className="font-extrabold text-slate-900">{tx('📋 現行 STP 核心檢查要點', '📋 Key Checkpoints')}</div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 leading-relaxed">
            {test.keyParams.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="font-bold">{tx('必備校準器材：', 'Required Gear: ')}</span>{test.equipmentTypes.join(', ')}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-slate-900">{tx(`📄 關聯文件及附件 (${files.length})`, `📄 Files & Attachments (${files.length})`)}</span>
            <label className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 font-extrabold text-white cursor-pointer">
              <UploadCloud className="h-3.5 w-3.5" /> {tx('上傳', 'Upload')}
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          {docTypes.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {docTypes.map((dt) => (
                <button key={dt} type="button" onClick={() => setDocTypeFilter(dt)} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold shrink-0 cursor-pointer ${docTypeFilter === dt ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {dt === 'ALL' ? tx('全部類別', 'All') : dt}
                </button>
              ))}
            </div>
          )}
          {visibleFiles.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-slate-900">{f.fileName}</div>
                <div className="text-[10px] text-slate-500">{f.docType || 'File'} · {f.fileSize}</div>
              </div>
              {f.dataUrl && <button type="button" onClick={() => openPreviewDoc({ title: f.fileName, url: f.dataUrl!, fileName: f.fileName })} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 font-extrabold text-brand-deep shrink-0 cursor-pointer">{tx('預覽', 'View')}</button>}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
          <div className="font-extrabold text-slate-700">{tx('版本紀錄（舊版已鎖定）', 'Revision History')}</div>
          {test.versions.map((v) => (
            <div key={v.ver} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-slate-100">
              <div className="min-w-0 flex-1">
                <div className={`font-mono font-bold ${v.status === 'obsolete' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{v.ver}</div>
                {v.note && <div className="text-[10px] text-slate-500">{v.note}</div>}
              </div>
              <Badge tone={v.status === 'current' ? 'ok' : 'bad'}>{v.status === 'current' ? tx('現行', 'Current') : tx('作廢', 'Obsolete')}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
