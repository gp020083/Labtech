# LabTech Nexus LIMS — Google AI Studio (App Building) ↔ Antigravity 專案與對話全紀錄

本檔案為 **Google AI Studio Build Mode (`aistudio.google.com/apps`)** 與本地 **Antigravity (連接公司 Server / VM)** 之間的雙向共享記憶庫。在 AI Studio Build 修改程式碼時，請務必閱讀並保留以下核心架構。

## 1. 線上環境與 Google Drive 30TB 資料庫配置（請勿刪除）
- **正式環境網址 (Vercel Production)**：`https://labtech-nexus-lims.vercel.app/`（登入密碼：`labtech123`）
- **GitHub 儲存庫**：`https://github.com/gp020083/labtech-nexus-lims`（`main` 分支 Push 後自動觸發 Vercel 部署）
- **Google 帳號**：`bentktk2024@gmail.com`
- **Google Drive 總目錄 (`LabTech_Platform_Database`)**：`1IWkytx4cqWHlPZJuhI3Rj8RF9okF2w3g`
- **Google Drive 私有資料庫 (`00_Database`)**：`1N9LPfqraNMpOiT-G7bCKx3ixi19aGY91`
  - 即時狀態 JSON (`labtech_db_state.json`)：`1J1UwUlA0-0ezoY_Q-jyf6wOQxo1TpW-Z`
  - Google Sheet 資料庫總表 (`LabTech_LIMS_Database`)：`1m_-woyQFFGBuvz7rLFONnnTnWTXkrNIImukiGAJayMY`（自動同步 `Jobs`、`Equipment`、`Loans_History`、`Calendar_Events` 四個分頁）
  - Google Apps Script 寫入橋接器 (`@5`)：`https://script.google.com/macros/s/AKfycbzeBLVjvzuCjTbdGObsYoB9ka5EHYFSkRe7-vVlsmIveG9z0IT5s-6Pkl0x3Nsxt_A/exec`
- **Google Drive 公開唯讀附件庫 (`05_User_Uploads`)**：`1rFJigHJ3hDf6xC4K1A07zeRRUbkVGCvI`（74 份 STP 與 Cal Cert 已映射於 `src/data/driveFileMap.ts`）

## 2. 已完成之重要功能與架構（對話歷史摘要）
1. **PC 網頁版與手機原生版雙介面 (`src/App.tsx` + `src/mobile/MobileAppShell.tsx`)**：
   - 自動偵測螢幕闊度（`< 768px` 自動進入手機專用 App 介面），頂部亦設有一鍵切換「📱 手機版 / 💻 PC 版」按鈕。
2. **跨裝置即時同步引擎 (`api/db.ts` + `src/cloudDb.ts` + `src/cloudMerge.ts` + `src/store.tsx`)**：
   - 手機或 PC 借出／交還器材、新增工地、修改排程或上傳 PDF 時，80ms 防抖自動寫入 `/api/db`（Vercel Blob 快取 + Google Drive `labtech_db_state.json` + Google Sheet 四大工作表）。
   - `src/cloudMerge.ts` 自動合併手機 `localStorage` 未同步之借還紀錄，防止覆蓋；每 8 秒背景輪詢及視窗喚醒自動拉取最新狀態。
3. **可點擊之借還紀錄完整詳情彈窗 (`src/components/LoanDetailModal.tsx`)**：
   - 在 PC 或手機點擊任何一筆 `借出／交還紀錄 History`，即彈出完整不截斷之詳情視窗（支援直接辦理交還或檢視器材檔案）。
4. **五大工地試驗工作區 + 培訓及工地排程月曆 + 51 件真實儀器庫存**：
   - 涵蓋 Koden (`KD`)、Sonic Logging (`SO`)、Flow Cone (`FC`)、Bleeding (`BL`)、Point Load (`PO`)、Plate Load (`PLT`)、Inclinometer (`VC`) 計算機與 STP 預覽。
5. **五大核心工作流與合規強化（已全部實裝）**：
   - **計算機綁定工地檔案 (`FieldCalcRecord`) 及 HOKLAS CSV 匯出**：PC 及手機版六大計算機支援一鍵儲存計算紀錄至指定 `LTxxxx` 工地（於工地抽屜集中查閱、複製及下載 HOKLAS 標準 CSV 工作表）。
   - **增量雙向雲端合併 (`src/cloudMerge.ts`)**：為 `jobs`、`loans`、`equipment`、`tests`、`events`、`calcRecords` 加入記錄級 `updatedAt` 時間戳比對與附件聯集（Union Merge），每次背景輪詢均無損合併離線修改。
   - **器材借出 HOKLAS 合規防呆與逾期追蹤 (`src/utils/limsRules.ts`)**：借出過期或停用器材時強制要求勾選「特批原因（僅作內部比對／外校）」；新增「🚨 逾期未還」篩選器及逾期日數紅章。
   - **香港時區動態今日日期 (`getHkTodayIso()`)**：全面取代硬編碼日期，自動以 `Asia/Hong_Kong` 真實日期計算校準到期、逾期借還與月曆預設月份。
   - **排程月曆 FQS49 授權資格、撞期與在庫儀器檢查 (`CalendarEventModal.tsx`)**：排程時即時標示同事之 `🏅AS / ✓Op / 🎓Tr` 資格、檢測同日雙重預約撞期，並顯示各測試項目在庫有效校準器材數量。

## 3. AI Studio App Building ↔ 公司 Server / VM (Antigravity) 協作規範
- **在 AI Studio App Building 開發時**：
  - 所有 UI、計算機邏輯、組件與狀態修改可直接於 AI Studio Build 進行並預覽，完成後點擊右上角 **GitHub Sync (Push to GitHub)** 即可自動部署至 Vercel。
- **當需要連接公司內網 Server (`\\ckw\CKWData\...`) 或 VM 執行本地任務時**：
  - 請將需要 Antigravity 在公司 Server / VM 執行的待辦事項寫入本檔案下方的 `## 4. 待公司 Server / VM 執行事項` 區塊並 Push 到 GitHub。
  - 回到 Antigravity 只需輸入 **「拉取 AI Studio 進度」**，Antigravity 即會自動 `git pull` 最新代碼並執行待辦任務。

## 4. 待公司 Server / VM 執行事項 (Handoff Queue)
- *(目前無待辦事項 — 可在 AI Studio 隨時新增)*
