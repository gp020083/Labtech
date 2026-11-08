export type WorkboxCacheStrategy = 'Precache' | 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate';

export interface OfflineCacheSummary {
  isOnline: boolean;
  swReady: boolean;
  cachedSitesCount: number;
  cachedEquipmentCount: number;
  cachedStpCount: number;
  statusHeadlineZh: string;
  statusHeadlineEn: string;
}

export function classifyAssetWorkboxStrategy(urlOrPath: string): {
  strategy: WorkboxCacheStrategy;
  cacheName: string;
} {
  const clean = (urlOrPath || '').trim();
  if (/\/api\/db/i.test(clean)) {
    return { strategy: 'NetworkFirst', cacheName: 'labtech-api-db-cache' };
  }
  if (/\/server-docs\/.*/i.test(clean)) {
    return { strategy: 'CacheFirst', cacheName: 'labtech-server-docs-cache' };
  }
  if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i.test(clean)) {
    return { strategy: 'CacheFirst', cacheName: 'google-fonts-cache' };
  }
  if (/\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(clean)) {
    return { strategy: 'StaleWhileRevalidate', cacheName: 'labtech-static-images-cache' };
  }
  return { strategy: 'Precache', cacheName: 'workbox-precache-v2' };
}

export function buildOfflineCacheSummary(params: {
  isOnline: boolean;
  swReady: boolean;
  sitesCount: number;
  equipmentCount: number;
  stpCount: number;
}): OfflineCacheSummary {
  const { isOnline, swReady, sitesCount, equipmentCount, stpCount } = params;
  if (!isOnline) {
    return {
      isOnline: false,
      swReady,
      cachedSitesCount: sitesCount,
      cachedEquipmentCount: equipmentCount,
      cachedStpCount: stpCount,
      statusHeadlineZh: `離線模式 — Workbox 快取運作中（可查閱 ${sitesCount} 個工地、${equipmentCount} 件器材、${stpCount} 份 STP 及全部計算工具）`,
      statusHeadlineEn: `Offline Mode — Cached data active (${sitesCount} Sites, ${equipmentCount} Gear, ${stpCount} STPs & Calculators available)`,
    };
  }
  return {
    isOnline: true,
    swReady,
    cachedSitesCount: sitesCount,
    cachedEquipmentCount: equipmentCount,
    cachedStpCount: stpCount,
    statusHeadlineZh: swReady ? 'Workbox 離線快取已就緒' : '連線正常',
    statusHeadlineEn: swReady ? 'Workbox Offline Cache Ready' : 'Online',
  };
}
