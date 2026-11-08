import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { CalCertAttachment } from '../types';
import { resolveDocLink } from '../driveDocs';
import { UploadCloud, FileCheck2, Eye, Download, FolderSync } from 'lucide-react';

export const CalCertUploadBox: React.FC<{
  title: string;
  certs: CalCertAttachment[];
  defaultDueDate?: string;
  eqOptions?: { code: string; name: string }[];
  onUpload: (data: {
    fileName: string;
    fileSize: string;
    dueDate?: string;
    certNo?: string;
    eqCode?: string;
    dataUrl?: string;
  }) => void;
  onPreviewToast?: (fileName: string) => void;
}> = ({ title, certs, defaultDueDate = '', eqOptions, onUpload, onPreviewToast }) => {
  const { openPreviewDoc } = useApp();
  const { tx } = usePrefs();
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [certNo, setCertNo] = useState('');
  const [eqCode, setEqCode] = useState('');

  const countByEq = useMemo(() => {
    const map: Record<string, number> = {};
    certs.forEach((c) => {
      if (c.eqCode) map[c.eqCode] = (map[c.eqCode] || 0) + 1;
    });
    return map;
  }, [certs]);

  const visibleCerts = useMemo(
    () => (eqOptions && eqCode ? certs.filter((c) => c.eqCode === eqCode) : certs),
    [certs, eqOptions, eqCode]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await Promise.all(
      files.map(
        (file) =>
          new Promise<void>((resolve) => {
            const sizeKb = `${Math.max(1, Math.round(file.size / 1024))} KB`;
            const reader = new FileReader();
            reader.onload = () => {
              onUpload({
                fileName: file.name,
                fileSize: sizeKb,
                dueDate: dueDate || undefined,
                certNo: certNo.trim() || undefined,
                eqCode: eqOptions ? eqCode || undefined : undefined,
                dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
              });
              resolve();
            };
            reader.readAsDataURL(file);
          })
      )
    );
    setCertNo('');
    e.target.value = '';
  };

  return (
    <div className="rounded-xl border border-line bg-ground/70 p-3.5 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-ink">
          {title} ({eqOptions ? `${visibleCerts.length}/${certs.length}` : certs.length})
        </span>
        <div className="flex items-center gap-2">
          {eqOptions && eqCode && (
            <button type="button" onClick={() => setEqCode('')} className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
              {tx('顯示全部', 'Show All')}
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-deep font-semibold">
            <FolderSync className="h-3.5 w-3.5" />{tx('Google Drive 雲端同步歸檔（支援多選批次上傳）', 'Google Drive Synced Vault (Batch Multi-File Supported)')}
          </span>
        </div>
      </div>
      <div className={`grid grid-cols-1 gap-2 ${eqOptions ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {eqOptions && (
          <select value={eqCode} onChange={(e) => setEqCode(e.target.value)} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-brand cursor-pointer">
            <option value="">{tx(`全部關聯器材 (${certs.length})`, `All Linked Equipment (${certs.length})`)}</option>
            {eqOptions.map((eq) => (
              <option key={eq.code} value={eq.code}>
                {eq.code} · {eq.name} ({countByEq[eq.code] || 0})
              </option>
            ))}
          </select>
        )}
        <input type="text" value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder={tx('Cert No.（選填，如 CAL-26-089）', 'Cert No. (Opt., e.g. CAL-26-089)')} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-brand" />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} title={tx('Cal Due Date', 'Cal Due Date')} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-brand" />
        <label className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 font-bold text-white hover:bg-brand-deep cursor-pointer">
          <UploadCloud className="h-3.5 w-3.5" />
          <span>{eqOptions && eqCode ? tx(`上傳 ${eqCode} Cert`, `Upload ${eqCode} Cert`) : tx('批次上傳 Cal Cert', 'Batch Upload Certs')}</span>
          <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
      {visibleCerts.length > 0 ? (
        <div className="divide-y divide-line rounded-lg border border-line bg-paper">
          {visibleCerts.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-ink truncate">
                  <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />
                  <span className="truncate">{c.fileName}</span>
                  {c.eqCode && <span className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] text-brand-deep">{c.eqCode}</span>}
                </div>
                <div className="text-[10px] text-ink-faint truncate">
                  {c.dueDate ? `Due ${c.dueDate} · ` : ''}{c.uploadedBy} · {c.serverPath}
                </div>
              </div>
              {c.dataUrl ? (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPreviewDoc({ title: c.fileName, url: c.dataUrl!, fileName: c.fileName, subtitle: c.dueDate ? `Cal Due: ${c.dueDate}` : c.serverPath })}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-wash px-2.5 py-1 font-bold text-brand-deep hover:bg-brand hover:text-white transition cursor-pointer"
                  >
                    <Eye className="h-3 w-3" /> {tx('預覽', 'Preview')}
                  </button>
                  <a href={resolveDocLink(c.dataUrl, c.fileName).downloadUrl || c.dataUrl} download={c.fileName} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-brand hover:underline">
                    <Download className="h-3 w-3" /> {tx('下載', 'Download')}
                  </a>
                </div>
              ) : (
                <button type="button" onClick={() => onPreviewToast?.(c.fileName)} className="shrink-0 font-bold text-brand hover:underline cursor-pointer">{tx('開啟', 'View')}</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-paper/60 px-3 py-3 text-[11px] text-ink-faint">
          {eqOptions && eqCode
            ? tx(`目前暫無 ${eqCode} 之已上載 Cal Cert，可於上方直接上傳，或按「顯示全部」檢視其他器材證書。`, `No Cal Cert uploaded for ${eqCode} yet. Upload above or click Show All.`)
            : tx('暫無已上載之校準證書（Cal Cert），可於上方選取檔案上傳。', 'No calibration certificates uploaded yet.')}
        </div>
      )}
    </div>
  );
};
