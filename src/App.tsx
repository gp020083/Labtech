import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store';
import { PrefsProvider, usePrefs } from './prefs';
import { FieldNavShell, FieldTabId, EquipmentSubSectionId, DocVaultSubSectionId } from './components/FieldNavShell';
import { MobileAppShell } from './mobile/MobileAppShell';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { LoginScreen } from './components/LoginModal';
import { StpPreviewModal } from './components/StpPreviewModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { DriveSyncModal } from './components/DriveSyncModal';
import { EquipmentCertStatusPage } from './components/EquipmentCertStatusPage';
import { ToastHost } from './components/ToastHost';
import { OfflineIndicator } from './components/PwaStatusWidgets';
import { GlobalModalDragController } from './components/GlobalModalDragController';
import { GlobalTableSortController } from './components/GlobalTableSortController';
import {
  parseEquipmentCodeFromUrl,
  EQUIPMENT_ROUTE_EVENT,
  navigateToEquipmentCertPage,
  clearEquipmentCertRoute,
} from './utils/equipmentQr';
import { JobsPage } from './pages/JobsPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { StpPage } from './pages/StpPage';
import { ToolsPage, CalcToolId } from './pages/ToolsPage';
import { CalendarPage } from './pages/CalendarPage';

const FieldShellContent: React.FC = () => {
  const { user, previewDoc, closePreviewDoc } = useApp();
  const { isMobileApp } = usePrefs();
  const [activeTab, setActiveTab] = useState<FieldTabId>(() => {
    if (typeof window !== 'undefined' && parseEquipmentCodeFromUrl(window.location.href)) {
      return 'equipment';
    }
    return 'stp';
  });
  const [routedEquipmentCode, setRoutedEquipmentCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return parseEquipmentCodeFromUrl(window.location.href);
    }
    return null;
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [equipmentSubTab, setEquipmentSubTab] = useState<EquipmentSubSectionId>('loans');
  const [docVaultSubTab, setDocVaultSubTab] = useState<DocVaultSubSectionId>('stp');
  const [toolJump, setToolJump] = useState<{ mode?: 'calc' | 'specs'; tool?: CalcToolId } | null>(null);

  useEffect(() => {
    const syncFromLocation = () => {
      const code = parseEquipmentCodeFromUrl(window.location.href);
      setRoutedEquipmentCode(code);
      if (code) setActiveTab('equipment');
    };
    const handleCustomRoute = (ev: Event) => {
      const customEv = ev as CustomEvent<{ code?: string | null }>;
      const code = customEv.detail?.code || null;
      setRoutedEquipmentCode(code);
      if (code) setActiveTab('equipment');
    };
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener(EQUIPMENT_ROUTE_EVENT, handleCustomRoute);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener(EQUIPMENT_ROUTE_EVENT, handleCustomRoute);
    };
  }, []);

  if (!user) {
    return (
      <>
        <LoginScreen />
        {routedEquipmentCode && (
          <EquipmentCertStatusPage
            equipmentCode={routedEquipmentCode}
            onSelectEquipment={(nextCode) => navigateToEquipmentCertPage(nextCode)}
            onClose={() => clearEquipmentCertRoute()}
          />
        )}
        <StpPreviewModal />
        <DocumentPreviewModal doc={previewDoc} onClose={closePreviewDoc} />
        <DriveSyncModal open={driveModalOpen} onClose={() => setDriveModalOpen(false)} />
        <ToastHost />
      </>
    );
  }

  return (
    <>
      {isMobileApp ? (
        <MobileAppShell
          activeTab={activeTab}
          onSelect={setActiveTab}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenDriveSync={() => setDriveModalOpen(true)}
          toolJump={toolJump}
          onConsumeJump={() => setToolJump(null)}
          onStartCalc={(tool) => { setToolJump({ mode: 'calc', tool }); setActiveTab('tools'); }}
        />
      ) : (
        <div className="min-h-screen flex flex-col">
          <FieldNavShell
            activeTab={activeTab}
            onSelect={setActiveTab}
            equipmentSubTab={equipmentSubTab}
            onSelectEquipmentSubTab={setEquipmentSubTab}
            docVaultSubTab={docVaultSubTab}
            onSelectDocVaultSubTab={setDocVaultSubTab}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenGovSpecs={() => { setToolJump({ mode: 'specs' }); setActiveTab('tools'); }}
            onOpenDriveSync={() => setDriveModalOpen(true)}
          />
          <div className="lg:pl-56 flex-1 flex flex-col">
            <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-8">
              {activeTab === 'jobs' && <JobsPage onNavigateEquipment={() => { setEquipmentSubTab('loans'); setActiveTab('equipment'); }} />}
              {activeTab === 'equipment' && (
                <EquipmentPage
                  subSection={equipmentSubTab}
                  onChangeSubSection={setEquipmentSubTab}
                  onOpenDriveBatch={() => setDriveModalOpen(true)}
                />
              )}
              {activeTab === 'stp' && (
                <StpPage
                  subSection={docVaultSubTab}
                  onChangeSubSection={setDocVaultSubTab}
                  onOpenDriveBatch={() => setDriveModalOpen(true)}
                  onStartCalc={(tool) => { setToolJump({ mode: 'calc', tool }); setActiveTab('tools'); }}
                />
              )}
              {activeTab === 'tools' && (
                <ToolsPage
                  forcedMode={toolJump?.mode || null}
                  forcedTool={toolJump?.tool || null}
                  onConsumeJump={() => setToolJump(null)}
                />
              )}
              {activeTab === 'calendar' && <CalendarPage />}
            </main>
          </div>
        </div>
      )}

      {routedEquipmentCode && (
        <EquipmentCertStatusPage
          equipmentCode={routedEquipmentCode}
          onSelectEquipment={(nextCode) => navigateToEquipmentCertPage(nextCode)}
          onClose={() => clearEquipmentCertRoute()}
        />
      )}

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab, opts) => {
          if (opts?.toolMode || opts?.calcId) setToolJump({ mode: opts.toolMode, tool: opts.calcId });
          setActiveTab(tab);
        }}
      />
      {/* MobileAppShell mounts MobileStpSheet (z-[75] portal) when isMobileApp is true */}
      {!isMobileApp && <StpPreviewModal />}
      <DocumentPreviewModal doc={previewDoc} onClose={closePreviewDoc} />
      <DriveSyncModal open={driveModalOpen} onClose={() => setDriveModalOpen(false)} />
      <OfflineIndicator />
      <ToastHost />
    </>
  );
};

export const App: React.FC = () => (
  <PrefsProvider>
    <AppProvider>
      <GlobalModalDragController />
      <GlobalTableSortController />
      <FieldShellContent />
    </AppProvider>
  </PrefsProvider>
);

export default App;

