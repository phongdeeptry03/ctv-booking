import { NextRequest, NextResponse } from 'next/server';
import { readTasks, appendRegistrationRow, updateTaskDaDangKy } from '@/lib/sheets';
import { tryReserveSlot, releaseSlot, ensureSchema, syncTaskLimit } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(0|\+84)\d{9,10}$/.test(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const body = await req.json();
    const ten = String(body.ten || '').trim();
    const sdt = String(body.sdt || '').trim();
    const taskId = String(body.taskId || '').trim();

    if (!ten || ten.length < 2) {
      return NextResponse.json({ error: 'Vui lòng nhập tên hợp lệ' }, { status: 400 });
    }
    if (!isValidPhone(sdt)) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }
    if (!taskId) {
      return NextResponse.json({ error: 'Vui lòng chọn task' }, { status: 400 });
    }

    // Lấy thông tin task hiện tại từ Sheet (nguồn dữ liệu mô tả task)
    const allTasks = await readTasks();
    const task = allTasks.find((t) => t.ID === taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task không tồn tại hoặc đã bị xoá' }, { status: 404 });
    }

    // Đảm bảo Postgres có dòng cho task này, đồng bộ giới hạn mới nhất
    await syncTaskLimit(taskId, task.SoLuongCan);

    // Chiếm slot một cách ATOMIC - đây là bước chống trùng tuyệt đối
    const reserveResult = await tryReserveSlot(taskId, task.SoLuongCan);

    if (!reserveResult.success) {
      return NextResponse.json(
        { error: 'Rất tiếc, task này vừa hết slot. Vui lòng chọn task khác.' },
        { status: 409 }
      );
    }

    // Đã chiếm được slot trong Postgres, giờ ghi vào Google Sheet.
    // Nếu ghi Sheet lỗi, phải rollback lại slot trong Postgres.
    try {
      await appendRegistrationRow({
        Timestamp: new Date().toISOString(),
        Ten: ten,
        SDT: sdt,
        TaskID: taskId,
        Ngay: task.Ngay,
        Team: task.Team,
        Task: task.Task,
        GioBatDau: task.GioBatDau,
      });

      await updateTaskDaDangKy(task._rowNumber, reserveResult.newCount as number);
    } catch (sheetErr) {
      console.error('Lỗi ghi Google Sheet, rollback slot:', sheetErr);
      await releaseSlot(taskId);
      return NextResponse.json(
        { error: 'Có lỗi khi lưu dữ liệu, vui lòng thử lại.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đăng ký thành công cho task "${task.Task}" (${task.GioBatDau} - ${task.GioKetThuc})`,
    });
  } catch (err: any) {
    console.error('POST /api/register error:', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi hệ thống, vui lòng thử lại sau' },
      { status: 500 }
    );
  }
}
