# Changelog

本檔記錄 OpenGames 對外版本。版本號遵循 `MAJOR.MINOR.PATCH`：不相容變更提升 MAJOR、向下相容功能提升 MINOR、修正與文件更新提升 PATCH。

## [1.0.1] - 2026-09-29

### Changed

- 將 React、React DOM 與 React Server Components 套件同步升級至 `19.2.8`，避免核心版本不一致。
- 將 vinext 升級至 `1.0.0-beta.8`，並同步升級其必要的 `@vitejs/plugin-rsc` 至 `0.5.34`。
- 將 Tailwind CSS 與 PostCSS 外掛同步升級至 `4.3.3`。
- 將 `@next/eslint-plugin-next` 升級至 `16.3.1`，並更新 React 型別套件。

### Fixed

- 整合並取代原先無法獨立通過 CI 的 React、RSC 與 vinext Dependabot 更新。
- 將登入、密碼更新與上傳完成後的站內導覽改用框架路由，消除新版 ESLint 警告。

## [1.0.0] - 2026-09-27

第一個穩定、可營運的公開版本，也是後續迭代基準。

### Added

- 公開雙語遊戲目錄、作品頁、創作者頁與帳號流程。
- ZIP 上傳、安全檢查、Cloudflare R2 發布與 iframe 沙箱遊玩。
- 帳號存檔、多人房間、Presence 與 OpenGames SDK v1。
- 公開雙語 `/developers` 開發者中心，整合 Web 匯出、封裝、執行環境、SDK、錯誤與發布規格。
- D1 中繼資料、評分、遊玩統計、檢舉與管理流程。

### Changed

- 正式網址統一為 `https://opengames-arcade.com`，HTTP 與 `www` 使用永久轉址。
- 舊開發文件網址永久導向 `/developers` 對應章節。

### Versioning

- 平台版本自本版起從 `1.0.0` 迭代。
- SDK 方法維持獨立的 `v1` 相容性承諾；平台 PATCH 或 MINOR 更新不會自動改變 SDK 主版本。

[1.0.1]: https://github.com/Gordon1244/opengames/tree/v1.0.1
[1.0.0]: https://github.com/Gordon1244/opengames/tree/v1.0.0
