# Hướng Dẫn Deploy Frontend HueSTD Lên Vercel

Tài liệu này hướng dẫn deploy riêng frontend `HueSTD_Frontend` lên Vercel và kết nối với backend Render.

Backend Render hiện tại:

```text
https://huestd-backend.onrender.com
```

## 1. Repo Frontend

Repo GitHub frontend riêng:

```text
https://github.com/Shrpain/HueSTD_Frontend.git
```

Cấu trúc repo frontend sau khi tách nên nằm ở root như sau:

```text
App.tsx
components/
context/
services/
constants.ts
index.html
index.tsx
package.json
package-lock.json
vite.config.ts
vercel.json
README_VERCEL.md
```

## 2. Cấu Hình API Proxy Trên Vercel

File `vercel.json` đã được cấu hình để frontend gọi API cùng domain Vercel qua `/api`, sau đó Vercel tự chuyển tiếp sang backend Render.

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://huestd-backend.onrender.com/api/$1" },
    { "source": "/hubs/(.*)", "destination": "https://huestd-backend.onrender.com/hubs/$1" },
    { "source": "/(.*)", "destination": "/" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

Nhờ cấu hình này, frontend có thể dùng:

```text
VITE_API_BASE_URL=/api
```

Không cần hardcode trực tiếp `https://huestd-backend.onrender.com/api` trong code frontend.

## 3. Deploy Qua Vercel Dashboard

Vào Vercel:

```text
https://vercel.com/new
```

Import repo:

```text
Shrpain/HueSTD_Frontend
```

Thiết lập project:

```text
Framework Preset: Vite
Root Directory: để trống
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Nếu bạn deploy từ monorepo chứa cả backend/frontend thì `Root Directory` phải là:

```text
HueSTD_Frontend
```

Nhưng với repo riêng `Shrpain/HueSTD_Frontend`, để trống `Root Directory`.

## 4. Biến Môi Trường Trên Vercel

Vào:

```text
Vercel Dashboard -> Project -> Settings -> Environment Variables
```

Thêm các biến sau.

### API Backend

```text
VITE_API_BASE_URL=/api
```

Giải thích: frontend gọi `/api`, Vercel rewrite sang backend Render.

### Supabase Public Config

```text
VITE_SUPABASE_URL=https://oubkbvypiabgfulnhsnd.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-public-key>
```

`VITE_SUPABASE_ANON_KEY` là public anon key của Supabase, không phải service role key.

Không bao giờ đặt service role key trong frontend.

### Gemini Key Nếu Cần

Nếu frontend còn dùng trực tiếp biến Gemini:

```text
GEMINI_API_KEY=<api-key>
```

Khuyến nghị: nếu AI đã đi qua backend thì không cần đặt API key nhạy cảm ở frontend.

## 5. Cấu Hình Backend Render Cho Frontend Vercel

Sau khi Vercel deploy xong, bạn sẽ có domain dạng:

```text
https://your-frontend-name.vercel.app
```

Vào Render backend:

```text
Render Dashboard -> huestd-backend -> Environment
```

Thêm hoặc cập nhật CORS origins:

```text
AllowedOrigins__0=https://your-frontend-name.vercel.app
AllowedOrigins__1=http://localhost:3000
```

Sau đó redeploy backend Render.

Nếu có custom domain thì thêm domain đó:

```text
AllowedOrigins__2=https://your-custom-domain.com
```

## 6. Kiểm Tra Sau Khi Deploy

Kiểm tra backend sống:

```text
https://huestd-backend.onrender.com/swagger
```

Kiểm tra frontend gọi API qua Vercel rewrite:

```text
https://your-frontend-name.vercel.app/api/Dashboard/stats
```

Nếu endpoint trả JSON hoặc lỗi nghiệp vụ từ backend thì rewrite hoạt động.

Kiểm tra app:

```text
https://your-frontend-name.vercel.app
```

## 7. Lỗi Thường Gặp

### Frontend gọi API bị 404

Kiểm tra `vercel.json` có rewrite `/api/(.*)` chưa.

```json
{ "source": "/api/(.*)", "destination": "https://huestd-backend.onrender.com/api/$1" }
```

Kiểm tra biến Vercel:

```text
VITE_API_BASE_URL=/api
```

### Bị lỗi CORS

Nguyên nhân: backend Render chưa cho phép domain Vercel.

Cách sửa: thêm domain frontend vào Render environment:

```text
AllowedOrigins__0=https://your-frontend-name.vercel.app
```

Redeploy backend sau khi đổi biến môi trường.

### Đăng nhập thành công nhưng refresh bị mất session

Frontend đang dùng cookie HttpOnly từ backend. Khi deploy production, nếu cookie không lưu được, kiểm tra backend cookie settings.

Nếu frontend gọi API qua rewrite `/api`, cookie thường hoạt động tốt vì browser thấy request cùng domain Vercel.

Nếu frontend gọi trực tiếp backend Render cross-domain, backend cần cookie production:

```csharp
SameSite = SameSiteMode.None
Secure = true
```

Khuyến nghị dùng rewrite `/api` như file `vercel.json` hiện tại.

### SignalR Assistant không kết nối

Kiểm tra rewrite hub:

```json
{ "source": "/hubs/(.*)", "destination": "https://huestd-backend.onrender.com/hubs/$1" }
```

Kiểm tra backend có map hub:

```text
/hubs/assistant
```

### Supabase Realtime không hoạt động

Kiểm tra biến frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Kiểm tra Supabase project còn hoạt động và Realtime đã bật cho các bảng cần dùng.

## 8. Deploy Lại

Mỗi lần push lên branch `main`, Vercel sẽ tự deploy nếu bật auto deploy.

Deploy thủ công:

```text
Vercel Dashboard -> Project -> Deployments -> Redeploy
```

## 9. Chạy Local Kết Nối Backend Render

Nếu muốn chạy frontend local nhưng dùng backend Render, tạo hoặc sửa `.env` local:

```text
VITE_API_BASE_URL=https://huestd-backend.onrender.com/api
VITE_SUPABASE_URL=https://oubkbvypiabgfulnhsnd.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-public-key>
```

Chạy:

```bash
npm install
npm run dev
```

Mở:

```text
http://localhost:3000
```

Nếu muốn local dùng proxy tới backend local, đặt lại:

```text
VITE_API_BASE_URL=/api
```

và chạy backend local ở:

```text
http://localhost:5136
```

## 10. Không Được Commit Secret

Không commit các giá trị sau:

```text
service_role key
JWT secret
AI API key nhạy cảm
.env.local
```

Frontend chỉ được dùng public Supabase anon key.
