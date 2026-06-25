import { NextRequest, NextResponse } from 'next/server';
import { checkAdminCredentials, createAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || '');
    const password = String(body.password || '');

    if (!checkAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    await createAdminSession(username);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/admin/login error:', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi hệ thống' },
      { status: 500 }
    );
  }
}
