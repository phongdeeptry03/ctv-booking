import { NextRequest, NextResponse } from 'next/server';
import { readTasks } from '@/lib/sheets';
import { getAllTaskCounts, ensureSchema, syncTaskLimit } from '@/lib/db';
import { normalizeDateString, type TaskDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    await ensureSchema();

    const allTasks = await readTasks();
    const counts = await getAllTaskCounts();

    // Đồng bộ những task chưa có trong Postgres (ví dụ admin vừa thêm task mới
    // trực tiếp trên Sheet hoặc qua trang admin)
    for (const t of allTasks) {
      if (!counts[t.ID]) {
        await syncTaskLimit(t.ID, t.SoLuongCan);
        counts[t.ID] = { daDangKy: 0, soLuongCan: t.SoLuongCan };
      }
    }

    const filtered = dateParam
      ? allTasks.filter((t) => normalizeDateString(t.Ngay) === normalizeDateString(dateParam))
      : allTasks;

    const result: TaskDTO[] = filtered.map((t) => {
      const live = counts[t.ID] ?? { daDangKy: t.DaDangKy, soLuongCan: t.SoLuongCan };
      const conLai = Math.max(live.soLuongCan - live.daDangKy, 0);
      return {
        id: t.ID,
        ngay: t.Ngay,
        team: t.Team,
        task: t.Task,
        gioBatDau: t.GioBatDau,
        gioKetThuc: t.GioKetThuc,
        gioNghi: t.GioNghi,
        loaiNhanVien: t.LoaiNhanVien,
        soLuongCan: live.soLuongCan,
        daDangKy: live.daDangKy,
        conLai,
      };
    });

    // Chỉ trả về task còn slot (task đầy sẽ tự ẩn ở phía client lẫn server)
    const available = result.filter((t) => t.conLai > 0);

    return NextResponse.json({ tasks: available });
  } catch (err: any) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi khi tải danh sách task' },
      { status: 500 }
    );
  }
}
