import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { SharedDocAttachment } from '../types';
import { resolveDocLink } from '../driveDocs';
import { UploadCloud, FileText, Eye, Download, FolderSync } from 'lucide-react';

export const SharedDocUploadBox: React.FC<{
  title: string;
  buttonLabel: string;
  docTypeOptions: string[];
  docs: SharedDocAttachment[];
  onUpload: (doc: { fileName: string; fileSize: string; docType: string; dataUrl?: string }) => void;
  onPreviewToast?: (fileName: string) => void;
}> = ({ title, buttonLabel, docTypeOptions, docs, onUpload, onPreviewToast }) => {
  const { openPreviewDoc } = useApp();
  const { tx } = usePrefs();
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.docType) set.add(d.docType); });
    docTypeOptions.forEach((o) => { if (o) set.add(o); });
    return Array.from(set);
  }, [docs, docTypeOptions]);

  const countByType = useMemo(() => {
    const map: Record<string, number> = {};
    docs.forEach((d) => {
      const k = d.docType || 'Attachment';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [docs]);

  const visibleDocs = useMemo(
    () => (selectedType === 'ALL' ? docs : docs.filter((d) => d.docType === selectedType)),
    [docs, selectedType]
  );

  const uploadTargetType = selectedType === 'ALL' ? (docTypeOptions[0] || '受控 STP PDF') : selectedType;

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
                docType: uploadTargetType,
                dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
              });
              resolve();
            };
            reader.readAsDataURL(file);
          })
      )
    );
    e.target.value = '';
  };

  return (
    <div className="rounded-xl border border-line bg-ground/70 p-3.5 space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-ink">{title} ({visibleDocs.length}/{docs.length})</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-deep">
          <FolderSync className="h-3.5 w-3.5" />{tx('Google Drive 雲端同步歸檔（支援多選批次上傳）', 'Google Drive Synced Vault (Batch Multi-File Supported)')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter or select document category"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-brand cursor-pointer"
        >
          <option value="ALL">{tx(`全部文件類別 (${docs.length})`, `All Categories (${docs.length})`)}</option>
          {allCategories.map((opt) => (
            <option key={opt} value={opt}>
              {opt} ({countByType[opt] || 0})
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 font-bold text-white hover:bg-brand-deep cursor-pointer">
          <UploadCloud className="h-3.5 w-3.5" />
          <span>{selectedType === 'ALL' ? buttonLabel : tx(`批次上傳「${selectedType}」`, `Batch Upload ${selectedType}`)}</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {selectedType !== 'ALL' && (
          <button type="button" onClick={() => setSelectedType('ALL')} className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
            {tx('顯示全部', 'Show All')}
          </button>
        )}
      </div>

      {visibleDocs.length > 0 ? (
        <div className="divide-y divide-line rounded-lg border border-line bg-paper">
          {visibleDocs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-ink truncate">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate">{d.fileName}</span>
                  {d.docType && <span className="rounded bg-brand-wash px-1.5 py-0.5 text-[10px] text-brand-deep shrink-0">{d.docType}</span>}
                </div>
                <div className="text-[10px] text-ink-faint truncate">{d.fileSize} · {d.uploadedBy} · {d.serverPath}</div>
              </div>
              {d.dataUrl ? (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPreviewDoc({ title: d.fileName, url: d.dataUrl!, fileName: d.fileName, subtitle: d.docType || d.serverPath })}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-wash px-2.5 py-1 font-bold text-brand-deep hover:bg-brand hover:text-white transition cursor-pointer"
                  >
                    <Eye className="h-3 w-3" /> {tx('預覽', 'Preview')}
                  </button>
                  <a href={resolveDocLink(d.dataUrl, d.fileName).downloadUrl || d.dataUrl} download={d.fileName} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-brand hover:underline">
                    <Download className="h-3 w-3" /> {tx('下載', 'Download')}
                  </a>
                </div>
              ) : (
                <button type="button" onClick={() => onPreviewToast?.(d.fileName)} className="shrink-0 font-bold text-brand hover:underline cursor-pointer">{tx('開啟', 'Open')}</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-paper/60 px-3 py-3 text-[11px] text-ink-faint">
          {selectedType === 'ALL'
            ? tx('暫無已上載文件，點選上方按鈕即可上傳歸檔。', 'No uploaded files yet. Click above to attach.')
            : tx(`目前暫無「${selectedType}」類別之文件，可點選上方按鈕直接上傳，或按「顯示全部」檢視其他附件。`, `No files under "${selectedType}" yet. Upload above or click Show All.`)}
        </div>
      )}
    </div>
  );
};
