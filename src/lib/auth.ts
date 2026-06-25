import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ctv_admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 giờ

function getSecretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Thiếu ADMIN_SESSION_SECRET trong Environment Variables');
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(username: string) {
  const token = await new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export function checkAdminCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;
  if (!validUser || !validPass) {
    throw new Error('Thiếu ADMIN_USERNAME hoặc ADMIN_PASSWORD trong Environment Variables');
  }
  return username === validUser && password === validPass;
}
