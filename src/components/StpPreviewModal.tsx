import React from 'react';
import { createPortal } from 'react-dom';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { downloadBlankTemplate } from '../utils';
import { resolveDocLink } from '../driveDocs';
import { Badge } from './Badge';
import { CalCertUploadBox } from './CalCertUploadBox';
import { SharedDocUploadBox } from './SharedDocUploadBox';
import { X, FileCheck2, Download, AlertOctagon, Eye, Users } from 'lucide-react';

function isTopmostModalBackdrop(target: HTMLElement | null): boolean {
  if (!target) return false;
  const backdrops = Array.from(
    document.querySelectorAll<HTMLElement>('[data-modal-backdrop="true"]:not([data-auth-gate="true"])')
  );
  if (backdrops.length === 0) return true;
  const getZ = (el: HTMLElement) => {
    const attrZ = Number(el.dataset.modalZ);
    if (!Number.isNaN(attrZ) && attrZ > 0) return attrZ;
    const computed = Number.parseInt(window.getComputedStyle(el).zIndex, 10);
    return Number.isNaN(computed) ? 0 : computed;
  };
  let topEl = backdrops[0];
  let topZ = getZ(topEl);
  for (let i = 1; i < backdrops.length; i++) {
    const z = getZ(backdrops[i]);
    if (z >= topZ) {
      topEl = backdrops[i];
      topZ = z;
    }
  }
  return topEl === target;
}

export const StpPreviewModal: React.FC = () => {
  const { stpPreviewCode, setStpPreviewCode, tests, equipment, uploadStpCalCert, uploadStpDocFile, openPreviewDoc, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const backdropRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!stpPreviewCode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isTopmostModalBackdrop(backdropRef.current)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setStpPreviewCode(null);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [stpPreviewCode, setStpPreviewCode]);

  if (!stpPreviewCode || typeof document === 'undefined') return null;

  const test = tests.find((t) => t.code === stpPreviewCode) || tests[0];
  const worksheetPdfHref = (test.worksheetPdfUrl || test.worksheetUrl)
    ? resolveDocLink(test.worksheetPdfUrl || test.worksheetUrl).downloadUrl || test.worksheetPdfUrl || test.worksheetUrl
    : undefined;

  const handleDownloadControlledStpHtml = () => {
    const html = `<!doctype html><html lang="zh-Hant-HK"><head><meta charset="utf-8"><title>${test.stpDocCode} ${test.stpRev}</title>
    <style>body{font-family:"Microsoft JhengHei",sans-serif;max-width:800px;margin:32px auto;padding:24px;border:3px solid #0e7f79;border-radius:12px;color:#17201f}
    .stamp{background:#e3f3ea;color:#1f7a4d;padding:8px 14px;font-weight:bold;border-radius:6px;display:inline-block;margin-bottom:16px}
    h1{margin:0 0 8px;font-size:22px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #cbd5d4;padding:8px 12px;text-align:left;font-size:13px}
    .warn{background:#fcebec;color:#c8333a;padding:10px 14px;border-radius:6px;font-size:12px;font-weight:bold}</style></head>
    <body><div class="stamp">✓ LABTECH 受控現行有效版本 · CONTROLLED CURRENT COPY — HOKLAS 298</div>
    <h1>${test.stpDocCode} · ${test.stpRev} — ${test.name}</h1>
    <table><tr><th>標準方法</th><td>${test.std}</td><th>生效日期</th><td>${test.stpEffectiveDate}</td></tr>
    <tr><th>對應空白 Worksheet</th><td colspan="3">${test.worksheetCode}</td></tr></table>
    <h3>現場操作及評審核心檢查要點：</h3><ul>${test.keyParams.map((k) => `<li>${k}</li>`).join('')}</ul>
    <h3>指定校驗器材類別：</h3><p>${test.equipmentTypes.join('、')}</p>
    <div class="warn">⚠️ 品質管制警告：所有舊版程序書已由系統封存作廢，現場測試及 HOKLAS 評審嚴禁使用舊版！</div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test.stpDocCode}_${test.stpRev.replace(/\s+/g, '')}_Controlled.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      ref={backdropRef}
      data-modal-backdrop="true"
      data-modal-z="90"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && setStpPreviewCode(null)}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl bg-paper shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ok">✓ {tx('現行受控 STP · CURRENT CONTROLLED', 'CURRENT CONTROLLED STP')}</Badge>
              <span className="font-mono text-xs font-bold text-brand-deep">
                {test.stpDocCode} · {test.stpRev}
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-bold text-ink">
              {test.code} — {test.name}
            </h2>
            <p className="text-xs text-ink-soft">
              {tx(`標準 Standard：${test.std} ｜ Effective：${test.stpEffectiveDate}`, `Standard: ${test.std} | Effective: ${test.stpEffectiveDate}`)}
            </p>
          </div>
          <button
            onClick={() => setStpPreviewCode(null)}
            className="rounded-lg p-1 text-ink-faint hover:bg-ground hover:text-ink cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <div className="flex items-start gap-3 rounded-xl border border-[#c8333a]/30 bg-[#fcebec]/70 p-3.5 text-xs text-[#c8333a]">
            <AlertOctagon className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {tx('受控版本保護機制 · HOKLAS 品質管制', 'Obsolete STP Lock Protection · HOKLAS Controlled')}
              </div>
              <p className="mt-0.5 text-[#8d2227]">
                {tx(
                  `本頁面僅提供最新生效之受控版本。所有已作廢舊版均已封存並鎖定下載，確保現場測試及 HOKLAS 評審採用正確受控文件。`,
                  `This page strictly serves the latest controlled revision — ${test.stpDocCode} ${test.stpRev}. Superseded revisions are locked from download to prevent outdated STP usage on site.`
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ground p-3.5 text-xs">
            {test.stpPdfUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => openPreviewDoc({ title: `${test.stpDocCode} ${test.stpRev} — ${test.name}`, url: test.stpPdfUrl!, fileName: `${test.stpDocCode}.pdf`, subtitle: test.std })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 font-bold text-white hover:bg-brand-deep cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  {tx(`預覽受控 STP PDF · ${test.stpDocCode}`, `Preview Controlled STP · ${test.stpDocCode}`)}
                </button>
                <a
                  href={resolveDocLink(test.stpPdfUrl).downloadUrl || test.stpPdfUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-paper px-3 py-2 font-bold text-brand-deep hover:bg-brand-wash"
                >
                  <Download className="h-3.5 w-3.5" />
                  {tx('下載 STP PDF', 'Download STP PDF')}
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDownloadControlledStpHtml}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-bold text-white hover:bg-brand-deep cursor-pointer"
              >
                <FileCheck2 className="h-4 w-4" />
                {tx(`下載受控 STP · ${test.stpDocCode} ${test.stpRev}`, `Download Controlled STP · ${test.stpDocCode} ${test.stpRev}`)}
              </button>
            )}
            {(test.worksheetPdfUrl || test.worksheetUrl) && (
              <button
                type="button"
                onClick={() => openPreviewDoc({ title: `${test.code} — ${test.worksheetCode}`, url: test.worksheetPdfUrl || test.worksheetUrl!, fileName: `${test.worksheetCode}.pdf` })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-paper px-3 py-2 font-bold text-brand-deep hover:bg-brand-wash cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                {tx('預覽空白 Worksheet', 'Preview Worksheet')}
              </button>
            )}
            {worksheetPdfHref ? (
              <a
                href={worksheetPdfHref}
                download={`${test.worksheetCode}.pdf`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-paper px-3 py-2 font-bold text-brand-deep hover:bg-brand-wash"
              >
                <Download className="h-3.5 w-3.5" />
                {tx('下載 Worksheet PDF', 'Download WS PDF')}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => downloadBlankTemplate(test)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-paper px-3 py-2 font-bold text-brand-deep hover:bg-brand-wash cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                {tx('下載 Worksheet', 'Download WS')}
              </button>
            )}
            {test.orderFormUrl && (
              <button type="button" onClick={() => openPreviewDoc({ title: `${test.code} — ${tx('FQS08 測試委託單', 'FQS08 Test Order Form')}`, url: test.orderFormUrl! })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-paper px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Eye className="h-3.5 w-3.5" /> {tx('FQS08 委託單', 'FQS08 Order Form')}
              </button>
            )}
            {test.dailyRecordUrl && (
              <button type="button" onClick={() => openPreviewDoc({ title: `${test.code} — ${tx('FQS09 每日現場紀錄', 'FQS09 Daily Site Record')}`, url: test.dailyRecordUrl! })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-paper px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Eye className="h-3.5 w-3.5" /> {tx('FQS09 每日紀錄', 'FQS09 Daily Record')}
              </button>
            )}
            {test.muTemplateUrl && (
              <button type="button" onClick={() => openPreviewDoc({ title: `${test.code} — ${tx('MU 測量不確定度評估表', 'Measurement Uncertainty MU Sheet')}`, url: test.muTemplateUrl! })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-paper px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Eye className="h-3.5 w-3.5" /> {tx('MU 不確定度表', 'MU Sheet')}
              </button>
            )}
          </div>

          {(test.approvedSignatories?.length || test.qualifiedOperators?.length) ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-900">
                  <Users className="h-4 w-4 text-emerald-700" />
                  {tx('FQS49 授權簽署人 AS 及合資格操作員名單', 'FQS49 Approved Signatories & Qualified Operators')}
                </span>
                <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS49 合資格操作員及授權簽署人名單', 'FQS49 List of Qualified Operators & Approved Signatories'), url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' })} className="font-bold text-emerald-800 hover:underline cursor-pointer">
                  {tx('預覽 FQS49 原檔', 'Preview FQS49')}
                </button>
              </div>
              {test.approvedSignatories && test.approvedSignatories.length > 0 && (
                <div><span className="font-bold text-slate-600">{tx('授權簽署人 AS：', 'Approved Signatories: ')}</span><span className="font-semibold text-slate-900">{test.approvedSignatories.join(lang === 'en' ? ', ' : '、')}</span></div>
              )}
              {test.qualifiedOperators && test.qualifiedOperators.length > 0 && (
                <div><span className="font-bold text-slate-600">{tx('合資格操作員：', 'Qualified Operators: ')}</span><span className="text-slate-800">{test.qualifiedOperators.join(lang === 'en' ? ', ' : '、')}</span></div>
              )}
            </div>
          ) : null}

          {perms.canManageDocs && (<SharedDocUploadBox
            title={tx(`📄 ${test.code} 受控 STP PDF / 附件`, `📄 ${test.code} Controlled STP PDF / Attachments`)}
            buttonLabel={tx('上傳 STP / 附件', 'Upload STP / File')}
            docTypeOptions={[
              tx('受控 STP PDF', 'Controlled STP PDF'),
              tx('空白 Worksheet PDF', 'Blank Worksheet PDF'),
              tx('FQS08 委託單', 'FQS08 Order Form'),
              tx('FQS09 每日紀錄', 'FQS09 Daily Record'),
              tx('操作指南 PDF', 'Field Guide PDF'),
            ]}
            docs={test.stpFiles || []}
            onUpload={(doc) => uploadStpDocFile(test.code, doc)}
            onPreviewToast={(fn) => pushToast(tx('已開啟 STP 文件', 'Opened STP file'), fn)}
          />)}

          <div className="rounded-xl border border-line p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              {tx('現行 STP 測試及數據記錄核心檢查要點', 'Current STP Key Checkpoints')}
            </h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-xs text-ink leading-relaxed">
              {test.keyParams.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <div className="pt-2 border-t border-line text-xs">
              <span className="font-semibold text-ink-soft">{tx('必備有效 Calibrated Equipment：', 'Required Calibrated Equipment: ')}</span>{' '}
              <span className="text-ink">{test.equipmentTypes.join(', ')}</span>
            </div>
          </div>

          {perms.canManageDocs && (<CalCertUploadBox
            title={tx(`📄 ${test.code} STP 關聯 Cal Cert 管理`, `📄 ${test.code} Linked Calibration Certificates`)}
            certs={test.calCerts || []}
            eqOptions={equipment
              .filter((e) => (e.testTags || e.tests.split('+').map((s) => s.trim())).includes(test.code))
              .map((e) => ({ code: e.code, name: e.name }))}
            onUpload={(d) =>
              uploadStpCalCert({
                stpCode: test.code,
                fileName: d.fileName,
                fileSize: d.fileSize,
                eqCode: d.eqCode,
                dueDate: d.dueDate,
                certNo: d.certNo,
                dataUrl: d.dataUrl,
              })
            }
            onPreviewToast={(fn) => pushToast(tx('已開啟 Cal Cert', 'Opened Cal Cert'), fn)}
          />)}

          <div className="rounded-xl border border-line overflow-hidden">
            <div className="border-b border-line bg-ground px-4 py-2.5 text-xs font-bold text-ink-soft">
              {tx('Revision 歷史 — Obsolete 舊版已鎖定作廢', 'Revision History — Obsolete Locked')}
            </div>
            <div className="divide-y divide-line text-xs">
              {test.versions.map((v) => (
                <div
                  key={v.ver}
                  className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${
                    v.status === 'obsolete' ? 'bg-ground/60 text-ink-faint' : 'bg-paper'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${v.status === 'obsolete' ? 'line-through' : 'text-ink'}`}>
                      {v.ver}
                    </span>
                    {v.note && <span className="text-[11px]">— {v.note}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]">{v.date}</span>
                    {v.status === 'current' ? (
                      <Badge tone="ok">{tx('現行 Current', 'Current')}</Badge>
                    ) : (
                      <Badge tone="bad">{tx('Obsolete 作廢', 'Obsolete · Locked')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
