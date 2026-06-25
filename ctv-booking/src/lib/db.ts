import { neon } from '@neondatabase/serverless';

/**
 * Bảng task_locks dùng để đếm slot CHÍNH XÁC TUYỆT ĐỐI bằng câu lệnh
 * atomic của Postgres (Google Sheets không hỗ trợ transaction thật nên
 * không thể đảm bảo 100% nếu 2 người bấm submit cùng lúc).
 *
 * Google Sheet vẫn là nơi lưu trữ "nhìn thấy được" chính (admin xem/sửa
 * task, xem danh sách CTV ở đó) - Postgres (Neon) chạy ngầm chỉ để giữ
 * đúng số lượng slot.
 *
 * Dùng @neondatabase/serverless vì @vercel/postgres đã bị deprecated.
 * Connection string đọc từ DATABASE_URL (biến chuẩn khi connect Neon
 * integration qua Vercel Marketplace) hoặc POSTGRES_URL (biến cũ, để
 * tương thích ngược nếu bạn dùng tên biến cũ).
 */

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      'Thiếu DATABASE_URL trong Environment Variables. Hãy connect Neon Postgres qua tab Storage trên Vercel.'
    );
  }
  return neon(connectionString);
}

export async function ensureSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS task_locks (
      task_id TEXT PRIMARY KEY,
      so_luong_can INTEGER NOT NULL,
      da_dang_ky INTEGER NOT NULL DEFAULT 0
    );
  `;
}

/** Đồng bộ 1 task từ Google Sheet vào Postgres (tạo mới hoặc cập nhật giới hạn) */
export async function syncTaskLimit(taskId: string, soLuongCan: number) {
  const sql = getSql();
  await sql`
    INSERT INTO task_locks (task_id, so_luong_can, da_dang_ky)
    VALUES (${taskId}, ${soLuongCan}, 0)
    ON CONFLICT (task_id)
    DO UPDATE SET so_luong_can = ${soLuongCan};
  `;
}

/** Lấy số đã đăng ký hiện tại trong Postgres cho 1 task (dùng để hiển thị) */
export async function getTaskCount(taskId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT da_dang_ky, so_luong_can FROM task_locks WHERE task_id = ${taskId};
  `;
  if (rows.length === 0) return null;
  return {
    daDangKy: rows[0].da_dang_ky as number,
    soLuongCan: rows[0].so_luong_can as number,
  };
}

export async function getAllTaskCounts(): Promise<
  Record<string, { daDangKy: number; soLuongCan: number }>
> {
  const sql = getSql();
  const rows = await sql`SELECT task_id, da_dang_ky, so_luong_can FROM task_locks;`;
  const map: Record<string, { daDangKy: number; soLuongCan: number }> = {};
  for (const row of rows) {
    map[row.task_id as string] = {
      daDangKy: row.da_dang_ky as number,
      soLuongCan: row.so_luong_can as number,
    };
  }
  return map;
}

/**
 * Cố gắng "chiếm" 1 slot cho task_id một cách ATOMIC.
 * Trả về { success: true, newCount } nếu còn chỗ, hoặc { success: false } nếu đã đầy.
 *
 * Dùng UPDATE ... WHERE da_dang_ky < so_luong_can RETURNING để Postgres tự
 * đảm bảo tính atomic ngay trong 1 câu lệnh - không cần transaction thủ công,
 * không sợ 2 request chạy song song giành nhau quá số lượng.
 */
export async function tryReserveSlot(
  taskId: string,
  soLuongCanFallback: number
): Promise<{ success: boolean; newCount?: number; soLuongCan?: number }> {
  const sql = getSql();

  // Đảm bảo dòng tồn tại trước (idempotent, không reset số đã đăng ký nếu đã có)
  await sql`
    INSERT INTO task_locks (task_id, so_luong_can, da_dang_ky)
    VALUES (${taskId}, ${soLuongCanFallback}, 0)
    ON CONFLICT (task_id) DO NOTHING;
  `;

  const rows = await sql`
    UPDATE task_locks
    SET da_dang_ky = da_dang_ky + 1
    WHERE task_id = ${taskId} AND da_dang_ky < so_luong_can
    RETURNING da_dang_ky, so_luong_can;
  `;

  if (rows.length === 0) {
    // Không update được nghĩa là đã đầy slot
    const current = await getTaskCount(taskId);
    return { success: false, soLuongCan: current?.soLuongCan };
  }

  return {
    success: true,
    newCount: rows[0].da_dang_ky as number,
    soLuongCan: rows[0].so_luong_can as number,
  };
}

/** Dùng khi cần rollback (ví dụ ghi Google Sheet thất bại sau khi đã chiếm slot) */
export async function releaseSlot(taskId: string) {
  const sql = getSql();
  await sql`
    UPDATE task_locks
    SET da_dang_ky = GREATEST(da_dang_ky - 1, 0)
    WHERE task_id = ${taskId};
  `;
}
