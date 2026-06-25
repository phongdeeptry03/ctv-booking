# Hệ thống đăng ký ca làm CTV

Web app cho CTV đăng ký ca làm việc theo Ngày → Giờ → Task, dữ liệu lưu vào Google Sheet, chống trùng slot bằng Postgres, có trang admin quản lý.

## Cấu trúc

- `/` — Trang đăng ký cho CTV (4 bước: Thông tin → Ngày → Giờ → Task)
- `/admin` — Trang quản trị (login, quản lý task, xem CTV đã đăng ký, import Excel/CSV, export CSV)

## Bước 1-3: Google Sheet + Service Account

**Đã làm xong nếu bạn theo đúng hướng dẫn trước đó.** Bạn cần có:
- 1 Google Sheet với 2 tab: `Tasks` và `Registrations` (đúng tên cột như mô tả)
- 1 file JSON Service Account, đã share quyền Editor cho Sheet

## Bước 4: Tạo Database Postgres (Neon, qua Vercel Marketplace)

> Lưu ý: "Vercel Postgres" (sản phẩm cũ) đã ngừng hoạt động. Hiện tại Vercel cung cấp Postgres thông qua **Marketplace integration với Neon** — vẫn làm ngay trong dashboard Vercel, chỉ khác tên gọi.

1. Vào [vercel.com](https://vercel.com) → đăng nhập → vào project của bạn (nếu chưa deploy lần nào, có thể tạo project tạm ở Bước 5 trước rồi quay lại đây).
2. Vào tab **Storage** → bấm **Create Database** (hoặc **Connect Database** → **Create New**).
3. Chọn **Neon** (Postgres) → đặt tên ví dụ `ctv-booking-db` → chọn Region gần bạn (ví dụ Singapore) → **Continue/Create**.
4. Sau khi tạo xong, bấm **Connect Project** → chọn project Next.js của bạn → chọn cả 3 môi trường (Development, Preview, Production) → **Connect**.
5. Vercel sẽ tự động thêm biến **`DATABASE_URL`** (và vài biến khác) vào Environment Variables của project — bạn không cần copy tay.

> Nếu bạn dùng CLI: `vercel install neon` cũng làm tương tự bước trên.

## Bước 5: Deploy code lên Vercel

### Cách A — Deploy qua Vercel CLI (nhanh nhất, không cần Git)

1. Cài Vercel CLI trên máy bạn (cần Node.js):
   ```bash
   npm install -g vercel
   ```
2. Giải nén project này vào 1 thư mục, mở terminal tại thư mục đó.
3. Chạy:
   ```bash
   npm install
   vercel
   ```
4. Làm theo hướng dẫn trên terminal (đăng nhập Vercel, chọn tên project, v.v.)
5. Sau khi deploy lần đầu (sẽ ra 1 link dạng `https://ten-project.vercel.app`), tiếp tục Bước 6 để cấu hình Environment Variables, rồi chạy `vercel --prod` lần nữa để deploy bản chính thức.

### Cách B — Deploy qua GitHub (khuyên dùng nếu sẽ sửa code lâu dài)

1. Tạo 1 repo GitHub mới, push code này lên.
2. Vào [vercel.com/new](https://vercel.com/new) → chọn **Import Git Repository** → chọn repo vừa tạo.
3. Vercel tự nhận diện đây là project Next.js, bấm **Deploy**.

## Bước 6: Cấu hình Environment Variables trên Vercel

1. Vào project trên Vercel → tab **Settings** → **Environment Variables**.
2. Thêm từng biến sau (copy từ file `.env.example` và điền giá trị thật):

| Tên biến | Giá trị |
|---|---|
| `GOOGLE_SHEET_ID` | ID lấy từ URL Google Sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` trong file JSON Service Account |
| `GOOGLE_PRIVATE_KEY` | `private_key` trong file JSON (giữ nguyên `\n`, để cả trong dấu ngoặc kép) |
| `ADMIN_USERNAME` | Tên đăng nhập admin bạn muốn |
| `ADMIN_PASSWORD` | Mật khẩu admin bạn muốn (nên đặt mạnh) |
| `ADMIN_SESSION_SECRET` | 1 chuỗi ngẫu nhiên dài (có thể tạo tại https://generate-secret.vercel.app/32) |

> **Lưu ý quan trọng về `GOOGLE_PRIVATE_KEY`:** khi copy từ file JSON, giá trị gốc có dạng:
> `"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"`
> Bạn dán **nguyên văn cả chuỗi này** (bao gồm các `\n`) vào ô giá trị trên Vercel, không cần chuyển thành xuống dòng thật — code đã tự xử lý việc này.

3. Nếu bạn chưa làm Bước 4, làm ngay bây giờ: vào tab **Storage** → **Create Database** → chọn **Neon** → tạo và **Connect Project** vào đúng project này. Vercel sẽ tự thêm `DATABASE_URL` vào Environment Variables.

4. Sau khi thêm xong tất cả biến, vào tab **Deployments** → bấm vào deployment mới nhất → **Redeploy** (để áp dụng các biến môi trường vừa thêm).

## Bước 7: Kiểm tra

1. Mở `https://ten-project.vercel.app` → thử điền tên, sđt, chọn ngày → nếu chưa có task nào, sẽ thấy "Ngày này hiện không còn ca làm việc nào trống".
2. Mở `https://ten-project.vercel.app/admin` → đăng nhập bằng `ADMIN_USERNAME`/`ADMIN_PASSWORD` đã cấu hình.
3. Trong trang admin, thử **Import Excel/CSV** với file có các cột: `Ngày, Team, Task, Thời gian bắt đầu, Thời gian Kết thúc, Thời gian nghỉ giải lao, Loại nhân viên, Số Book BPO PT` (đúng layout bạn đã cung cấp).
4. Quay lại trang `/`, chọn đúng ngày vừa import → kiểm tra các giờ/task hiện đúng.
5. Thử đăng ký 1 task → vào lại `/admin` tab "CTV đã đăng ký" để xác nhận đã ghi nhận, đồng thời mở Google Sheet để xác nhận dữ liệu đã ghi vào đúng 2 tab.

## Format file Excel/CSV để import

Tên cột chấp nhận được (không phân biệt hoa/thường, có dấu hoặc không dấu):

| Cột bắt buộc | Ví dụ |
|---|---|
| Ngày | 6/26/2026 |
| Team | Outbound |
| Task | Pick |
| Thời gian bắt đầu | 6:00 |
| Thời gian Kết thúc | 17:30 |
| Số Book BPO PT | 2 |

Cột không bắt buộc: `Thời gian nghỉ giải lao`, `Loại nhân viên`.

## Cách hoạt động chống trùng slot

- Mỗi task có 1 dòng tương ứng trong bảng Postgres `task_locks` (tự tạo khi cần).
- Khi CTV submit đăng ký, server chạy lệnh `UPDATE ... WHERE da_dang_ky < so_luong_can` — đây là 1 câu lệnh SQL atomic, Postgres tự đảm bảo dù 2 request đến cùng lúc, chỉ 1 request "thắng" được slot cuối.
- Sau khi chiếm được slot trong Postgres, server mới ghi tiếp vào Google Sheet. Nếu ghi Sheet lỗi, server tự rollback lại slot trong Postgres.
- Google Sheet luôn là nơi bạn xem dữ liệu "thật", Postgres chạy ngầm chỉ để đảm bảo đúng số lượng.
- **Lưu ý nhỏ:** trong trường hợp cực hiếm (mạng lỗi giữa lúc ghi xong dòng CTV nhưng chưa cập nhật được cột "Đã đăng ký"), cột "Đã đăng ký" trên Sheet/trang admin có thể tạm lệch 1 đơn vị so với số dòng thực tế trong Registrations. Đây chỉ là vấn đề hiển thị — Postgres (nguồn chống trùng thật) luôn chính xác, và trang admin tab "Tasks" hiển thị số liệu lấy trực tiếp từ Postgres (`daDangKyLive`) nên luôn đúng theo thời gian thực, không bị ảnh hưởng bởi lệch này.

## Phát triển local (tuỳ chọn, nếu bạn muốn sửa code và test trước khi deploy)

```bash
npm install
cp .env.example .env.local   # rồi điền giá trị thật vào .env.local
npm run dev
```

Mở `http://localhost:3000`.
