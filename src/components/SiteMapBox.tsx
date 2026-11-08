import React, { useState } from 'react';
import { usePrefs } from '../prefs';
import { JobItem } from '../types';
import { MapPin, ExternalLink, Navigation, Maximize2, ZoomIn, ZoomOut, X, Map as MapIcon } from 'lucide-react';

const HK_DISTRICT_COORDS: [string, number, number][] = [
  ['山東街', 22.3174, 114.1686],
  ['旺角', 22.3174, 114.1686],
  ['育才道', 22.3045, 114.1796],
  ['理大', 22.3045, 114.1796],
  ['PolyU', 22.3045, 114.1796],
  ['紅磡', 22.3045, 114.1796],
  ['朗邊', 22.4418, 114.0147],
  ['元朗', 22.4418, 114.0147],
  ['沙嶺', 22.5284, 114.1225],
  ['文錦渡', 22.5284, 114.1225],
  ['古洞', 22.5076, 114.1038],
  ['上水', 22.502, 114.128],
  ['粉嶺', 22.492, 114.139],
  ['窩仔街', 22.3324, 114.1669],
  ['石硤尾', 22.3324, 114.1669],
  ['大坑西', 22.3335, 114.1685],
  ['深水埗', 22.3307, 114.1622],
  ['長沙灣', 22.3358, 114.1562],
  ['荔枝角', 22.3372, 114.1483],
  ['LCK', 22.3372, 114.1483],
  ['承德街', 22.3248, 114.1885],
  ['Shing Tak', 22.3248, 114.1885],
  ['土瓜灣', 22.3175, 114.1878],
  ['啟德', 22.329, 114.198],
  ['九龍灣', 22.3236, 114.214],
  ['觀塘', 22.3104, 114.225],
  ['油塘', 22.2958, 114.2378],
  ['將軍澳', 22.307, 114.26],
  ['尖沙咀', 22.2976, 114.1722],
  ['佐敦', 22.305, 114.1715],
  ['油麻地', 22.313, 114.1706],
  ['九龍塘', 22.3369, 114.1762],
  ['荃灣', 22.3707, 114.1113],
  ['葵涌', 22.362, 114.131],
  ['青衣', 22.3584, 114.107],
  ['屯門', 22.3918, 113.9725],
  ['洪水橋', 22.4338, 113.9975],
  ['天水圍', 22.4605, 114.004],
  ['錦田', 22.4408, 114.0635],
  ['新田', 22.4995, 114.0765],
  ['大埔', 22.4508, 114.1642],
  ['沙田', 22.382, 114.188],
  ['火炭', 22.3965, 114.1955],
  ['馬鞍山', 22.4245, 114.2318],
  ['西貢', 22.3814, 114.2705],
  ['中環', 22.2819, 114.158],
  ['金鐘', 22.2796, 114.1655],
  ['灣仔', 22.2775, 114.173],
  ['銅鑼灣', 22.2802, 114.185],
  ['北角', 22.2912, 114.2005],
  ['鰂魚涌', 22.288, 114.212],
  ['柴灣', 22.2644, 114.2369],
  ['黃竹坑', 22.2481, 114.1678],
  ['香港仔', 22.2485, 114.1545],
  ['東涌', 22.289, 113.9415],
  ['赤鱲角', 22.308, 113.9185],
];

export function resolveJobCoords(job: JobItem): { lat: number; lng: number; matched: boolean } {
  if (typeof job.lat === 'number' && typeof job.lng === 'number' && !Number.isNaN(job.lat) && !Number.isNaN(job.lng)) {
    return { lat: job.lat, lng: job.lng, matched: true };
  }
  const text = `${job.mapAddress || ''} ${job.shortName || ''} ${job.site || ''} ${job.project || ''}`;
  for (const [kw, lat, lng] of HK_DISTRICT_COORDS) {
    if (text.toLowerCase().includes(kw.toLowerCase())) {
      return { lat, lng, matched: true };
    }
  }
  return { lat: 22.314, lng: 114.172, matched: false };
}

/**
 * 產生 Google Maps 座標定位標記 (Pin) 連結：
 * - 若有精準／地區座標，使用 `https://www.google.com/maps?q=lat,lng` 直接標記該座標
 * - 若為自訂新地址而未有座標，清除括號地段編號後以 `https://www.google.com/maps?q=地址, 香港` 標記
 */
export function buildPinnedGoogleMapsUrl(job: JobItem): string {
  if (
    job.googleMapsUrl &&
    job.googleMapsUrl.startsWith('http') &&
    !job.googleMapsUrl.includes('/maps/search/?api=1&query=')
  ) {
    return job.googleMapsUrl;
  }
  const { lat, lng, matched } = resolveJobCoords(job);
  if (matched) {
    return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  const rawAddr = (job.mapAddress || job.site || job.shortName || '香港')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .trim();
  return `https://www.google.com/maps?q=${encodeURIComponent(`${rawAddr}, 香港`)}`;
}

function computeTileGrid(lat: number, lng: number, z: number) {
  const n = Math.pow(2, z);
  const rad = (lat * Math.PI) / 180;
  const xf = ((lng + 180) / 360) * n;
  const yf = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const xt = Math.floor(xf);
  const yt = Math.floor(yf);
  const shiftX = Math.round((0.5 - (xf - xt)) * 256);
  const shiftY = Math.round((0.5 - (yf - yt)) * 256);
  return { xt, yt, yf, shiftX, shiftY };
}

export const SiteMapBox: React.FC<{ job: JobItem; heightClass?: string }> = ({
  job,
  heightClass = 'h-36',
}) => {
  const { lang, tx } = usePrefs();
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(17);
  const [viewMode, setViewMode] = useState<'google_embed' | 'street_tiles'>('google_embed');

  const addr = job.mapAddress || job.site || job.shortName || '香港';
  const { lat, lng, matched } = resolveJobCoords(job);
  const previewZ = 16;
  const preview = computeTileGrid(lat, lng, previewZ);
  const modalGrid = computeTileGrid(lat, lng, zoom);
  const externalHref = buildPinnedGoogleMapsUrl(job);

  const embedQuery = matched
    ? `${lat.toFixed(6)},${lng.toFixed(6)}`
    : `${addr.replace(/\([^)]*\)/g, '').trim()}, 香港`;
  const googleEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(embedQuery)}&z=${zoom}&hl=${lang === 'en' ? 'en' : 'zh-TW'}&output=embed`;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(true);
          }
        }}
        title={`點擊放大檢視地圖：${addr}`}
        className="group relative block overflow-hidden rounded-xl border border-line bg-[#ebe8e1] shadow-2xs transition hover:border-brand hover:shadow-md cursor-zoom-in select-none"
      >
        <div className={`relative w-full ${heightClass} overflow-hidden`}>
          <div
            style={{ transform: `translate(calc(-50% + ${preview.shiftX}px), calc(-50% + ${preview.shiftY}px))` }}
            className="pointer-events-none absolute left-1/2 top-1/2 grid h-[512px] w-[768px] grid-cols-3 grid-rows-2 transition duration-300 group-hover:scale-[1.05]"
          >
            {[0, 1].flatMap((dy) =>
              [-1, 0, 1].map((dx) => (
                <img
                  key={`${dx}_${dy}`}
                  src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${previewZ}/${preview.yt + dy - (preview.yf - preview.yt < 0.5 ? 1 : 0)}/${preview.xt + dx}`}
                  alt=""
                  className="h-[256px] w-[256px] max-w-none select-none object-cover"
                />
              ))
            )}
          </div>

          {/* Center GPS Marker Pin */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow-md">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#dc2626] text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="h-2 w-0.5 bg-[#dc2626]" />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-slate-950/85 to-transparent" />

          {/* Top-left Zoom Hint */}
          <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs transition group-hover:bg-brand group-hover:text-white">
            <Maximize2 className="h-3 w-3" />
            <span>{tx('放大 Map', 'Zoom Map')}</span>
          </div>

          {/* Top-right: ONLY this button jumps out to Google Maps with Pin */}
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="在新分頁打開 Google Maps 並插針 (Pin) 此地盤位置"
            className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-slate-900/92 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] hover:scale-[1.03] cursor-pointer"
          >
            <Navigation className="h-3 w-3 text-blue-300" />
            <span>Google Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <div className="pointer-events-none absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between gap-2 text-white">
            <span className="truncate text-xs font-bold drop-shadow-xs">📍 {addr}</span>
            <span className="shrink-0 font-mono text-[10px] text-slate-300">
              {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Map Lightbox Modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-[1px]"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <div
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#f8fafc] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-brand-wash px-2 py-0.5 font-mono text-xs font-bold text-brand-deep">
                    {job.no} · {job.companyProjNo}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-ink truncate">
                    {job.shortName || job.site}
                  </h3>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <span>📍 {addr}</span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    ({lat.toFixed(5)}°N, {lng.toFixed(5)}°E)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-line bg-paper p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setViewMode('google_embed')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer transition ${
                      viewMode === 'google_embed'
                        ? 'bg-brand text-white'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {tx('互動地圖 (Pin)', 'Interactive Map (Pin)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('street_tiles')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 cursor-pointer transition ${
                      viewMode === 'street_tiles'
                        ? 'bg-brand text-white'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <MapIcon className="h-3 w-3" />
                    {tx('街道圖', 'Street Map')}
                  </button>
                </div>

                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand transition"
                >
                  <Navigation className="h-3.5 w-3.5 text-blue-300" />
                  <span>{tx('打開 Google Maps (Pin)', 'Open Google Maps (Pin)')}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-ground hover:text-ink cursor-pointer"
                  title={tx('關閉地圖', 'Close Map')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Large Map Viewport */}
            <div className="relative h-[65vh] min-h-[380px] max-h-[620px] w-full overflow-hidden bg-[#e5e3df]">
              {viewMode === 'google_embed' ? (
                <iframe
                  key={`${embedQuery}-${zoom}`}
                  title={`地盤位置地圖 - ${job.shortName}`}
                  src={googleEmbedSrc}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="relative h-full w-full overflow-hidden">
                  <div
                    style={{
                      transform: `translate(calc(-50% + ${modalGrid.shiftX}px), calc(-50% + ${modalGrid.shiftY}px))`,
                    }}
                    className="pointer-events-none absolute left-1/2 top-1/2 grid h-[1024px] w-[1280px] grid-cols-5 grid-rows-4"
                  >
                    {[-1, 0, 1, 2].flatMap((dy) =>
                      [-2, -1, 0, 1, 2].map((dx) => (
                        <img
                          key={`${zoom}_${dx}_${dy}`}
                          src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${modalGrid.yt + dy - (modalGrid.yf - modalGrid.yt < 0.5 ? 1 : 0)}/${modalGrid.xt + dx}`}
                          alt=""
                          className="h-[256px] w-[256px] max-w-none select-none object-cover"
                        />
                      ))
                    )}
                  </div>
                  {/* Prominent Red Pin in Center */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow-xl">
                    <div className="flex flex-col items-center">
                      <div className="mb-1 whitespace-nowrap rounded-lg bg-slate-900/92 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                        📍 {job.shortName || addr}
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#dc2626] text-white shadow-lg">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="h-2.5 w-1 rounded-b bg-[#dc2626]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Zoom +/- Floating Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl border border-line bg-paper/95 shadow-lg">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(19, z + 1))}
                  className="flex items-center justify-center p-2.5 text-ink hover:bg-brand-wash hover:text-brand cursor-pointer border-b border-line"
                  title="放大 (Zoom In)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="px-2 py-1 text-center font-mono text-[10px] font-bold text-ink-soft">
                  {zoom}x
                </div>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(13, z - 1))}
                  className="flex items-center justify-center p-2.5 text-ink hover:bg-brand-wash hover:text-brand cursor-pointer border-t border-line"
                  title="縮小 (Zoom Out)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-4 py-2.5 text-xs text-ink-soft">
              <div>
                <span className="font-semibold text-ink">{tx('Project：', 'Project: ')}</span>
                <span>{job.project}</span>
                {job.remark && <span className="ml-2 text-ink-faint">（{tx('備註', 'Note')}: {job.remark}）</span>}
              </div>
              <span className="text-[11px] text-ink-faint">
                Scope: {job.scope}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
