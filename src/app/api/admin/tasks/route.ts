import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import {
  readTasks,
  appendTaskRow,
  updateTaskRow,
  deleteTaskRow,
} from '@/lib/sheets';
import { ensureSchema, syncTaskLimit, getAllTaskCounts } from '@/lib/db';
import { normalizeDateString } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const ok = await verifyAdminSession();
  return ok;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const allTasks = await readTasks();
    const counts = await getAllTaskCounts();

    const filtered = dateParam
      ? allTasks.filter((t) => normalizeDateString(t.Ngay) === normalizeDateString(dateParam))
      : allTasks;

    const tasks = filtered.map((t) => {
      const live = counts[t.ID];
      return {
        ...t,
        daDangKyLive: live ? live.daDangKy : t.DaDangKy,
      };
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error('GET /api/admin/tasks error:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const newTask = {
      ID: id,
      Ngay: normalizeDateString(String(body.ngay || '')),
      Team: String(body.team || ''),
      Task: String(body.task || ''),
      GioBatDau: String(body.gioBatDau || ''),
      GioKetThuc: String(body.gioKetThuc || ''),
      GioNghi: String(body.gioNghi || ''),
      LoaiNhanVien: String(body.loaiNhanVien || ''),
      SoLuongCan: Number(body.soLuongCan) || 0,
      DaDangKy: 0,
    };

    if (!newTask.Ngay || !newTask.Team || !newTask.Task || !newTask.GioBatDau) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    await appendTaskRow(newTask);
    await syncTaskLimit(id, newTask.SoLuongCan);

    return NextResponse.json({ success: true, task: newTask });
  } catch (err: any) {
    console.error('POST /api/admin/tasks error:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'Thiếu ID task' }, { status: 400 });

    const allTasks = await readTasks();
    const existing = allTasks.find((t) => t.ID === id);
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    const updated = {
      ID: id,
      Ngay: normalizeDateString(String(body.ngay ?? existing.Ngay)),
      Team: String(body.team ?? existing.Team),
      Task: String(body.task ?? existing.Task),
      GioBatDau: String(body.gioBatDau ?? existing.GioBatDau),
      GioKetThuc: String(body.gioKetThuc ?? existing.GioKetThuc),
      GioNghi: String(body.gioNghi ?? existing.GioNghi),
      LoaiNhanVien: String(body.loaiNhanVien ?? existing.LoaiNhanVien),
      SoLuongCan: Number(body.soLuongCan ?? existing.SoLuongCan),
      DaDangKy: existing.DaDangKy,
    };

    await updateTaskRow(existing._rowNumber, updated);
    await syncTaskLimit(id, updated.SoLuongCan);

    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    console.error('PUT /api/admin/tasks error:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID task' }, { status: 400 });

    const allTasks = await readTasks();
    const existing = allTasks.find((t) => t.ID === id);
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    await deleteTaskRow(existing._rowNumber);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/admin/tasks error:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
