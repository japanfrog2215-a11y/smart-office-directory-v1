# Smart Office Directory V1.0

簡約日系森林插畫風格的公開部門內線電話簿。支援搜尋、部門篩選、我的最愛、CSV 匯出及管理員資料管理。

## 重要：資料及權限
- 公眾訪客可以瀏覽電話簿。
- 管理員透過 Supabase Auth 登入後才可新增、修改及刪除員工。
- 本專案不包含任何真實員工資料，初始資料為空。
- 不要把 Supabase `service_role` key 放進前端或 GitHub。
- 請只公開適合讓所有網站訪客查看的聯絡資料。

## 本機啟動
1. 安裝 Node.js LTS。
2. 解壓縮專案並在資料夾開啟終端機。
3. 執行 `npm install`。
4. 複製 `.env.example` 為 `.env.local`，填入 Supabase URL 及 anon key。
5. 在 Supabase SQL Editor 執行 `supabase/schema.sql`。
6. 在 Supabase Authentication 建立管理員帳戶，並關閉公開註冊。
7. 執行 `npm run dev`，按終端機提供的網址預覽。
8. 執行 `npm run build` 檢查正式版。

## GitHub Pages 部署
本專案已附 GitHub Actions workflow。推送至 `main` 後會自動安裝依賴、建置及部署至 GitHub Pages。

## 權限安全提醒
目前 SQL policy 以「任何已登入 Supabase 帳戶」作為管理員條件。因為此專案關閉公開註冊並只手動建立可信管理員帳戶，才能維持管理入口限制。若日後要加入更多角色，應改用獨立 admin role / custom claims，並收緊 RLS policy。
