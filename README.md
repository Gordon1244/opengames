# OpenGames

好遊戲，不該被埋沒。OpenGames 是一個開源遊戲平台，讓創作者上傳以 HTML、CSS、JavaScript 製作的遊戲，玩家不必安裝即可在瀏覽器直接遊玩。

## 功能

- 公開遊戲目錄、搜尋、分類與作品詳情頁
- Supabase 電子郵件、Google、GitHub 登入
- ZIP 上傳、安全檢查、Cloudflare R2 儲存與沙箱遊玩
- 創作者儀表板、版本與下載授權
- 檢舉流程、管理員審核與下架
- Cloudflare D1 中繼資料與基礎遊玩統計

## 本機開發

需求：Node.js 22.13 以上。

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

瀏覽 `http://localhost:3000`。環境變數格式請見 `.env.example`。

## 驗證

```bash
npm run lint
npm test
```

`npm test` 會先執行 production build，再以產出的 Worker 驗證主要頁面與中繼資料。

## 上傳格式與安全邊界

遊戲 ZIP 的根目錄必須包含 `index.html`。目前限制為壓縮檔 50 MiB、解壓後 250 MiB、最多 2,000 個檔案；禁止可執行檔、巢狀壓縮檔與路徑穿越。遊戲在獨立 iframe 沙箱執行，預設禁止網路連線、表單、彈出視窗與頂層導覽。

自動檢查只能降低風險，無法證明第三方程式碼絕對安全。公開營運仍需要人工檢舉審核、事件回應與定期依賴更新。

## 貢獻與授權

請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md) 與 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。平台程式碼採 [MIT License](LICENSE)；創作者上傳的遊戲依各作品頁標示的授權為準。
