# Jeter & Lulu｜性別派對

日期：2026-11-21，16:30。地點：芙塔咖啡館 FRUTTA Café。

## GitHub Pages

本儲存庫包含 React 原始碼和已建置的 `docs/` 網站。前往 Settings → Pages，選擇 **Deploy from a branch → main → /docs → Save**。
預期網址：https://luvlu0w0.github.io/jeter-lulu-party/ （須先啟用 Pages 並等待部署成功）

## 功能與目前狀態

- 手機與桌面入口 GIF、五秒後提示、背景音樂、載入進度條。
- 桌面三段滿版背景，內容最大寬度 1080px；手機維持大字版問卷。
- 膠卷動畫：左張 4 秒；右張延遲 0.3 秒、播放 4 秒。
- 飲品與甜點份數選擇、問卷驗證、活動資訊圖片儲存。
- `config.json` 已設定 Google Apps Script 接收網址，接收程式與試算表寫入已通過 API 測試。網站只在接收端回傳儲存成功後顯示感謝函；回應異常會自動重試，連線失敗時保留填寫內容。瀏覽器實際送出仍需使用者確認。
- 原有 Sites 網站及其報名資料庫維持原狀。此公開儲存庫不含報名紀錄、管理密碼、Webhook 密鑰或 Google 憑證。

## 報名串接

1. 開啟 [Google-Apps-Script.gs](integration/Google-Apps-Script.gs)，複製完整內容，取代 Apps Script 原本的 `Code.gs`（不要保留重複的 `doPost`）。
2. 在「專案設定 → 指令碼屬性」保留 `SPREADSHEET_ID`，值為試算表網址 `/d/` 後至 `/edit` 前的 ID。請勿把 ID 或密鑰提交到 GitHub。
3. 點「部署 → 管理部署作業 → 編輯 → 版本：新增版本 → 部署」，執行身分為「我」、存取權為「所有人」。更新原有部署可保留目前 `/exec` 網址。
4. 直接開啟 `/exec`，應顯示 `{"ok":true,"service":"Jeter & Lulu RSVP","version":"github-rsvp-v1"}`。這只確認版本，尚未確認試算表寫入權限。
5. 在網站送出一筆名字明確標註「測試」的回覆，確認「派對報名」工作表新增姓名、出席選項、人數、飲品及甜點數量。

這是公開、僅能新增報名的接收端，允許訪客不登入就填表，因此不使用舊版 `WEBHOOK_SECRET`；該屬性可留在 Google，網站不會讀取或傳送它。這不是防機器人驗證：知道網址的人也能送出符合格式的報名。接收端會驗證姓名、人數及餐點白名單，並以回覆 UUID 防止同一次送出重試時重複計算；不提供查詢或刪除他人回覆的 API。

前端送出 JSON 內容，但使用 `text/plain;charset=utf-8`，避免觸發 Apps Script 不支援的 OPTIONS 預檢。保留正常 CORS 回應讀取，**不使用 `no-cors` 假裝送出成功**。成功需回傳 `{ "ok": true }`；失敗回傳 `{ "ok": false, "error": "錯誤訊息" }`。

若 Google 轉址暫時回傳 HTML 或無法讀取，網站先重讀可信任的 Google 暫存回應網址，再以完全相同的回覆 ID 重試送出（最多三次、總時間上限 60 秒）。只有接收程式版本相符且回傳儲存成功才顯示感謝函；健康檢查的 `ok:true` 不視為成功報名。失敗時請保留頁面再次送出，以沿用同一 ID 避免重複登記。Google 端無需為此重試修正重新部署。

送出格式：
```json
{"id":"UUID","name":"姓名","attendance":"yes","guests":[{"name":"姓名","drink":"飲品名稱","dessert":"甜點名稱"}],"note":""}
```

拒絕出席的 `attendance` 為 `no`，`guests` 為空陣列。`server-reference/` 保留原有 Sites 後端端點及資料表結構，僅供參考，GitHub Pages 不會執行它們。新版 Google 接收程式位於 `integration/`。

## 本機修改

需要 Node.js 22.13+。執行 `npm install`，再執行 `npm run dev`。
修改後執行 `npm run build`，將 `src/`、`public/` 及重建後的 `docs/` 一併提交。Pages 會使用 `docs/` 的內容發布。
