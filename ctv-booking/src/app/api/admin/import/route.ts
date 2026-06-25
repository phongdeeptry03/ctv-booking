import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { appendTaskRows } from '@/lib/sheets';
import { syncTaskLimit, ensureSchema } from '@/lib/db';
import { normalizeDateString } from '@/lib/types';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Map các tên cột có thể gặp trong file Excel/CSV của khách hàng
// (không phân biệt hoa thường, không phân biệt dấu) -> field chuẩn
const HEADER_ALIASES: Record<string, string> = {
  'ngay': 'Ngay',
  'ngày': 'Ngay',
  'team': 'Team',
  'task': 'Task',
  'thoigianbatdau': 'GioBatDau',
  'thờigianbắtđầu': 'GioBatDau',
  'gio bat dau': 'GioBatDau',
  'thoigianketthuc': 'GioKetThuc',
  'thờigiankếtthúc': 'GioKetThuc',
  'thoigiannghigiaolao': 'GioNghi',
  'thoigiannghigiailao': 'GioNghi',
  'thờigiannghỉgiảilao': 'GioNghi',
  'loainhanvien': 'LoaiNhanVien',
  'loạinhânviên': 'LoaiNhanVien',
  'sobookbpopt': 'SoLuongCan',
  'số book bpo pt': 'SoLuongCan',
  'soluongcan': 'SoLuongCan',
};

function normalizeHeaderKey(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/\s+/g, '');
}

function mapHeaders(rawHeaders: string[]): Record<number, string> {
  const colIndexToField: Record<number, string> = {};
  rawHeaders.forEach((h, idx) => {
    const key = normalizeHeaderKey(h);
    const field = HEADER_ALIASES[key];
    if (field) colIndexToField[idx] = field;
  });
  return colIndexToField;
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    await ensureSchema();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File không có dữ liệu' }, { status: 400 });
    }

    const headerRow = rows[0].map((h) => String(h));
    const colMap = mapHeaders(headerRow);

    const requiredFields = ['Ngay', 'Team', 'Task', 'GioBatDau', 'GioKetThuc', 'SoLuongCan'];
    const mappedFields = new Set(Object.values(colMap));
    const missing = requiredFields.filter((f) => !mappedFields.has(f));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Không tìm thấy cột: ${missing.join(', ')}. Vui lòng kiểm tra lại tên cột trong file.`,
        },
        { status: 400 }
      );
    }

    const tasksToImport: any[] = [];
    const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell).trim() !== ''));

    for (const row of dataRows) {
      const record: Record<string, string> = {};
      Object.entries(colMap).forEach(([idxStr, field]) => {
        const idx = Number(idxStr);
        record[field] = String(row[idx] ?? '').trim();
      });

      if (!record.Ngay || !record.Team || !record.Task) continue;

      const id = `T${Date.now()}${Math.floor(Math.random() * 100000)}`;
      tasksToImport.push({
        ID: id,
        Ngay: normalizeDateString(record.Ngay),
        Team: record.Team,
        Task: record.Task,
        GioBatDau: record.GioBatDau || '',
        GioKetThuc: record.GioKetThuc || '',
        GioNghi: record.GioNghi || '',
        LoaiNhanVien: record.LoaiNhanVien || '',
        SoLuongCan: Number(record.SoLuongCan) || 0,
        DaDangKy: 0,
      });
    }

    if (tasksToImport.length === 0) {
      return NextResponse.json({ error: 'Không có dòng dữ liệu hợp lệ nào' }, { status: 400 });
    }

    await appendTaskRows(tasksToImport);

    for (const t of tasksToImport) {
      await syncTaskLimit(t.ID, t.SoLuongCan);
    }

    return NextResponse.json({
      success: true,
      imported: tasksToImport.length,
      message: `Đã import ${tasksToImport.length} task thành công`,
    });
  } catch (err: any) {
    console.error('POST /api/admin/import error:', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi khi đọc file' },
      { status: 500 }
    );
  }
}
