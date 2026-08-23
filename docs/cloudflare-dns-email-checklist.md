# OpenGames DNS 與安全郵件檢查表

最後更新：2026-08-24（Asia/Taipei）

本文件刻意不記錄 API Token、SMTP 密碼、管理員 Email 或其他秘密值。

## 1. 正式網域與 DNS

- 正式網域：`opengames-arcade.com`
- Cloudflare Zone ID：`be3ca2d2d66482f45d493e1462da1f6a`
- Cloudflare 方案：Free Website
- 權威 Nameserver：`donovan.ns.cloudflare.com`、`emma.ns.cloudflare.com`
- OpenAI Sites 專案：`appgprj_6a82cb617fe08191b7f0c67134c29bc4`
- Sites 自訂網域 ID：`appgdom_6a8b1e81b5d481919770a4e2ac5f61e2`
- 2026-08-24 驗證結果：Sites `active`、provider `active`、SSL `active`

Cloudflare Dashboard 檢查位置：網站 `opengames-arcade.com` → DNS → Records。

| 類型 | 名稱 | 內容 | Proxy | 用途 |
| --- | --- | --- | --- | --- |
| A | `opengames-arcade.com` | `162.159.143.30` | DNS only | OpenAI Sites apex target |
| A | `opengames-arcade.com` | `172.66.3.26` | DNS only | OpenAI Sites apex target |
| TXT | `_openai-site-verification.opengames-arcade.com` | `openai-site-verification=...` | 不適用 | Sites 所有權驗證 |
| TXT | `_cf-custom-hostname.opengames-arcade.com` | Sites 提供的驗證值 | 不適用 | Cloudflare Custom Hostname 驗證 |

這兩個 A 記錄都是 Cloudflare／OpenAI Sites 公開服務位址，不是站長個人 IP。TXT 驗證值不是密碼，但仍不應任意修改。

## 2. 網站網址

- Sites production env：`NEXT_PUBLIC_SITE_URL=https://opengames-arcade.com`
- 程式預設網址：`lib/site.ts`
- 註冊與重設密碼由瀏覽器的 `location.origin` 組成 callback，因此使用正式網域開站時會回到正式網域。

Supabase Dashboard 還必須檢查：Authentication → URL Configuration。

- Site URL：`https://opengames-arcade.com`
- Redirect URLs 至少保留：
  - `https://opengames-arcade.com/auth/callback`
  - `https://opengames-arcade.momognchou.chatgpt.site/auth/callback`（過渡期備援）

## 3. 驗證信

- HTML 樣板：`emails/confirm-sign-up.html`
- 主旨：`emails/confirm-sign-up-subject.txt`
- 驗證按鈕使用 Supabase 的 `{{ .ConfirmationURL }}`，實際回站位置由註冊時的 `emailRedirectTo` 與 Supabase URL allowlist 決定。
- Supabase Dashboard 套用位置：Authentication → Email Templates → Confirm signup。

若要由 Cloudflare 寄出 Supabase 驗證信，需在 Supabase Dashboard 的 Authentication → SMTP Settings 設定 Cloudflare SMTP：

- Host：`smtp.mx.cloudflare.net`
- Port：`465`
- TLS：Implicit TLS
- Username：`api_token`
- Password：另外建立、只給 Email Sending Edit 權限的 Cloudflare API Token
- Sender：例如 `OpenGames <security@mail.opengames-arcade.com>`

## 4. 登入通知信

- 入口：`app/api/auth/login-notification/route.ts`
- 寄信與版型：`lib/login-notifications.ts`
- 呼叫時機：密碼、密碼金鑰、OAuth callback，以及完成 TOTP 二步驟驗證後。
- 去重資料表：`login_notifications`，以 Supabase session ID 避免同一登入重複寄送。
- 不記錄或顯示完整 IP；只從 User-Agent 產生粗略裝置／瀏覽器名稱。
- Cloudflare REST endpoint：`/accounts/{account_id}/email/sending/send`

Sites 需要的伺服器端環境變數：

- `CLOUDFLARE_ACCOUNT_ID`：一般環境變數
- `CLOUDFLARE_EMAIL_API_TOKEN`：必須標成 secret
- `LOGIN_ALERT_FROM_EMAIL=security@mail.opengames-arcade.com`

如果上述任一值缺少，API 回傳 `not_configured`，登入本身仍成功，不會因寄信供應商故障鎖住使用者。

## 5. 費用與尚未授權的事項

- Cloudflare DNS 與目前網站路由使用 Free Website 方案。
- Cloudflare Email Sending 免費方案不能寄給公開網站的任意註冊者；這個用途需要 Workers Paid。
- 目前沒有替帳號升級、沒有建立 Email Sending API Token，也沒有把任何秘密寫入 Git。
- 在站長明確同意付費並建立權限受限的 Token 前，Cloudflare 驗證信 SMTP 與登入通知信都不能宣稱已實際寄送成功。

## 6. 上線後驗收

1. 確認 Sites 自訂網域狀態為 `active`、SSL 為 `active`。
2. 開啟 `https://opengames-arcade.com`，確認首頁、登入頁與靜態資源皆為 HTTPS。
3. 使用新的測試信箱註冊，確認寄件者、主旨、版型和驗證回站網址。
4. 驗證後分別測試密碼與密碼金鑰登入；每個新 session 應只收到一封登入通知。
5. 測試「不是我登入」按鈕必須前往 `https://opengames-arcade.com/account/security`。
6. 在 Cloudflare Email Sending activity 與 Supabase Auth logs 核對成功／退信；不要只看前端成功訊息。
