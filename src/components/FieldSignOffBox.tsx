import React, { useRef, useState } from 'react';
import { usePrefs } from '../prefs';
import { FieldCalcPhoto } from '../types';
import { SitePhotoAttachmentControl } from './SitePhotoAttachmentControl';
import { PenTool, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';

export const FieldSignOffBox: React.FC<{
  stpCode: string;
  jobNo: string;
  signedBy: string;
  onChangeSignedBy: (val: string) => void;
  signedRole: string;
  onChangeSignedRole: (val: string) => void;
  signatureDataUrl: string;
  onChangeSignature: (dataUrl: string) => void;
  sitePhotos: FieldCalcPhoto[];
  onChangePhotos: (photos: FieldCalcPhoto[]) => void;
  hidePhotoSection?: boolean;
}> = ({
  stpCode,
  jobNo,
  signedBy,
  onChangeSignedBy,
  signedRole,
  onChangeSignedRole,
  signatureDataUrl,
  onChangeSignature,
  sitePhotos,
  onChangePhotos,
  hidePhotoSection = false,
}) => {
  const { tx } = usePrefs();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCoords(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChangeSignature(canvas.toDataURL('image/png'));
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChangeSignature('');
  };

  const handleGenerateDemoSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(35, 68);
    ctx.bezierCurveTo(65, 22, 95, 85, 130, 42);
    ctx.bezierCurveTo(155, 20, 175, 74, 215, 50);
    ctx.lineTo(295, 46);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'italic bold 13px sans-serif';
    const label = signedBy.trim() || 'Ir. C.W. Lam (RSS Witness)';
    ctx.fillText(label, 42, 86);

    if (!signedBy.trim()) onChangeSignedBy('Ir. C.W. Lam');
    if (!signedRole.trim()) onChangeSignedRole('Resident Site Staff (RSS)');
    onChangeSignature(canvas.toDataURL('image/png'));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
          <PenTool className="h-3.5 w-3.5 text-brand" />
          <span>
            {tx(
              '✍️ 現場電子簽署確認（連同紀錄及相片同步至 Google Drive）',
              '✍️ Field Digital Sign-Off (Synced to Google Drive with Record & Photos)'
            )}
          </span>
        </div>
        {signatureDataUrl && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> {tx('已簽署確認', 'Signed')}
          </span>
        )}
      </div>

      <div className={hidePhotoSection ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
        {/* Canvas Signature Pad */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600">
                {tx('現場簽收人姓名', 'Witness / Signer Name')}
              </label>
              <input
                value={signedBy}
                onChange={(e) => onChangeSignedBy(e.target.value)}
                placeholder={tx('如：Ir. C.W. Lam / 陳監工', 'e.g. Ir. C.W. Lam')}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600">
                {tx('職稱／單位', 'Role / Organization')}
              </label>
              <input
                value={signedRole}
                onChange={(e) => onChangeSignedRole(e.target.value)}
                placeholder={tx('如：Resident Site Staff / 總承建商', 'e.g. RSS / Main Contractor')}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500">
                {tx('手寫簽名板（支援滑鼠或手指觸控簽署）', 'Canvas Signature Pad (Mouse / Touch)')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerateDemoSignature}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-wash px-2 py-0.5 text-[10px] font-extrabold text-brand-deep hover:bg-brand-wash/80 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> {tx('一鍵示範簽名', 'Demo Sign')}
                </button>
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> {tx('清除', 'Clear')}
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={360}
              height={96}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 touch-none cursor-crosshair"
            />
          </div>
        </div>

        {/* Site Photos / Sketch Attachment (1-2 photos) when not already rendered above */}
        {!hidePhotoSection && (
          <SitePhotoAttachmentControl
            stpCode={stpCode}
            jobNo={jobNo}
            sitePhotos={sitePhotos}
            onChangePhotos={onChangePhotos}
          />
        )}
      </div>
    </div>
  );
};
