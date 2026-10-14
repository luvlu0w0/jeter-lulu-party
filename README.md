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
- **Google Apps Script／報名接收端尚未接通。** `config.json` 的 `apiUrl` 目前留空，送出時會明確顯示「報名功能正在準備中」，不會假裝已送出或已儲存。
- 原有 Sites 網站及其報名資料庫維持原狀。此公開儲存庫不含報名紀錄、管理密碼、Webhook 密鑰或 Google 憑證。

## 報名串接

`public/config.json` 的 `apiUrl` 應填入可接收 POST JSON 的 HTTPS 後端網址，需允許來自 `https://luvlu0w0.github.io` 的 CORS 請求。成功回傳 `{ "ok": true }`；失敗應使用非 2xx 狀態與 `{ "error": "錯誤訊息" }`。

送出格式：
```json
{"id":"UUID","name":"姓名","attendance":"yes","guests":[{"name":"姓名","drink":"飲品名稱","dessert":"甜點名稱"}],"note":""}
```

拒絕出席的 `attendance` 為 `no`，`guests` 為空陣列。Google Apps Script 的共享密鑰應保留於後端，**不要填入此公開設定檔或前端程式**。`server-reference/` 保留原有後端端點及資料表結構，僅供後續移植參考，GitHub Pages 不會執行它們。

## 本機修改

需要 Node.js 22.13+。執行 `npm install`，再執行 `npm run dev`。
修改後執行 `npm run build`，將 `src/`、`public/` 及重建後的 `docs/` 一併提交。Pages 會使用 `docs/` 的內容發布。
