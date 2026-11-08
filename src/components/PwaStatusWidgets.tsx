import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { buildOfflineCacheSummary } from '../utils/pwaConfig';
import { Download, WifiOff, CheckCircle2, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSwReady = () => setSwReady(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('labtech-sw-ready', handleSwReady);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) setSwReady(true);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('labtech-sw-ready', handleSwReady);
    };
  }, []);

  return { isOnline, swReady };
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isOnline, swReady } = useOnlineStatus();
  const { tx } = usePrefs();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={tx(
          '安裝離線版 PWA 應用程式（支援無網絡工地查閱）',
          'Install Offline PWA App (Works offline on construction sites)'
        )}
        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition cursor-pointer ${
          !isOnline
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : isInstallable
            ? 'border-brand bg-brand text-white hover:bg-brand-deep shadow-xs'
            : 'border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand'
        }`}
      >
        {!isOnline ? (
          <WifiOff className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        ) : (
          <Download className="h-3.5 w-3.5 shrink-0" />
        )}
        {!compact && (
          <span className="hidden md:inline">
            {!isOnline
              ? tx('離線快取中', 'Offline Cache')
              : isInstallable
              ? tx('安裝離線 App', 'Install App')
              : isIOS
              ? tx('安裝至 iOS', 'Install iOS')
              : tx('離線快取 / 安裝', 'Offline / PWA')}
          </span>
        )}
      </button>

      {showModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-3.5 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-2.5 py-0.5 text-[10px] font-extrabold text-brand-deep">
                    <Smartphone className="h-3 w-3" /> WORKBOX OFFLINE PWA
                  </div>
                  <h3 className="mt-1 text-base font-extrabold text-slate-900">
                    {tx('工地離線快取及安裝指南 (Workbox PWA)', 'Offline Cache & App Installation')}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close Offline PWA Guide"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1 text-emerald-950">
                <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {swReady
                      ? tx('Workbox Service Worker 已啟用並快取核心資源', 'Workbox Service Worker Active & Assets Cached')
                      : tx('本機離線資料快取已啟用', 'Local Offline Data Cache Active')}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-900">
                  {tx(
                    '系統已透過 Workbox 自動快取所有靜態程式碼、圖示、受控 STP 規範、政府部門標準及最新工地／器材資料。即使在地底隧道或偏遠工地無網絡時，仍可正常開啟並查閱所有頁面與計算機。',
                    'Workbox automatically caches critical static bundles, icons, STP specs, and local LIMS state so the application remains functional for viewing and field calculations even when offline.'
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-slate-700">
                <div className="font-extrabold text-slate-900">
                  {isIOS
                    ? tx('📱 在 iPhone / iPad 安裝至主畫面：', '📱 Install on iPhone / iPad:')
                    : tx('💻 在電腦或 Android 手機安裝為獨立 App：', '💻 Install on Desktop or Android:')}
                </div>
                {isIOS ? (
                  <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                    <li>{tx('點擊 Safari 底部工具列的「分享 (Share)」按鈕。', 'Tap the Share button in the Safari toolbar.')}</li>
                    <li>{tx('向下滑動並點選「加入主畫面 (Add to Home Screen)」。', 'Scroll down and tap "Add to Home Screen".')}</li>
                  </ol>
                ) : (
                  <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                    <li>{tx('點擊瀏覽器網址列右側的「安裝 LabTech Nexus LIMS」圖示，或於瀏覽器選單選擇「安裝應用程式 / 加到主畫面」。', 'Click the Install icon in your browser address bar or menu ("Install App" / "Add to Home Screen").')}</li>
                    <li>{tx('安裝後可於桌面或手機主畫面直接啟動，無需網絡亦可隨時瀏覽快取資料。', 'Launch directly from your home screen with full offline viewing support.')}</li>
                  </ol>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full rounded-2xl bg-slate-900 py-2.5 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
              >
                {tx('明白，返回系統', 'Got It')}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { isOnline, swReady } = useOnlineStatus();
  const { jobs, equipment, tests } = useApp();
  const { lang } = usePrefs();

  if (isOnline) return null;

  const summary = buildOfflineCacheSummary({
    isOnline,
    swReady,
    sitesCount: jobs.length,
    equipmentCount: equipment.filter((e) => e.inUse !== 'N').length,
    stpCount: tests.length,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator-banner"
      className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-xl"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{lang === 'en' ? summary.statusHeadlineEn : summary.statusHeadlineZh}</span>
    </div>
  );
};
