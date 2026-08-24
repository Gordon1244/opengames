# OpenGames 驗證安全設定檢查表

最後更新：2026-08-24（Asia/Taipei）

## 密碼

- Supabase Secure password change：已由站長開啟。
- Supabase Dashboard 與網站的最短密碼長度都設定為 8 個字元。
- 密碼要求：至少包含一個小寫英文字母、一個大寫英文字母與一個數字。
- 註冊頁與改密碼頁使用同一份 `lib/password-policy.ts`，只在建立新密碼時限制；登入既有帳號時不以瀏覽器規則攔截舊密碼。
- 登入工作階段超過 24 小時時，改密碼頁會呼叫 Supabase `reauthenticate()`，請使用者輸入寄到帳號 Email 的六位數 nonce，再以 `updateUser({ password, nonce })` 更新。
- 若寄信服務無法送出 nonce，較舊工作階段將無法完成改密碼；上線驗收必須實際測信。

## Passkey／WebAuthn

- Relying Party Display Name：`Opengames website`
- Relying Party ID：`opengames-arcade.com`
- Relying Party Origins：`https://opengames-arcade.com`
- Supabase Dashboard：Authentication → Passkeys。
- RP ID 變更後，原本在 `opengames-arcade.momognchou.chatgpt.site` 建立的 Passkey 無法搬移，使用者須從正式網域重新建立。
- 不把舊 `chatgpt.site` origin 加到新 RP ID；WebAuthn 規格要求 origin hostname 必須等於 RP ID 或為其子網域。

## OAuth 名稱容易混淆

- Authentication → OAuth Server：讓 OpenGames 成為其他第三方 App 或 MCP 的 OAuth 2.1 身分提供者；目前網站沒有這項需求，所以保持關閉。
- Authentication → Sign In / Providers → Google／GitHub：讓使用者用 Google 或 GitHub 登入 OpenGames。這才是一般網站所說的 OAuth 社群登入。
- Google／GitHub 目前都停用。啟用前需要在各供應商建立 OAuth App，取得 Client ID／Secret，設定 Supabase callback URL，並將 Secret 只填在 Supabase，不可提交 GitHub。

## 驗收

1. 在無 Passkey 的測試帳號建立符合規則的新密碼。
2. 分別確認缺少大小寫或數字時，網頁立即提示且 Supabase 也拒絕。
3. 使用超過 24 小時的 session 改密碼，確認收到六位數 nonce、錯誤碼會被拒絕、正確碼成功。
4. 從 `https://opengames-arcade.com/account/security` 重新建立 Passkey，登出後再以 Passkey 登入。
5. 確認舊網域 Passkey 不被當成新網域的有效憑證。
