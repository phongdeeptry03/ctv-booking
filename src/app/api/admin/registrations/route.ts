import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { readRegistrations } from '@/lib/sheets';
import { normalizeDateString } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const teamParam = searchParams.get('team');

    let regs = await readRegistrations();

    if (dateParam) {
      regs = regs.filter((r) => normalizeDateString(r.Ngay) === normalizeDateString(dateParam));
    }
    if (teamParam) {
      regs = regs.filter((r) => r.Team === teamParam);
    }

    // Mới nhất lên trước
    regs.sort((a, b) => (a.Timestamp < b.Timestamp ? 1 : -1));

    return NextResponse.json({ registrations: regs });
  } catch (err: any) {
    console.error('GET /api/admin/registrations error:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
