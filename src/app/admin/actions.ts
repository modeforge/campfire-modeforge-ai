'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'campfire_admin_session';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

function getSecret() {
  const password = process.env.CAMPFIRE_ADMIN_PASSWORD;
  if (!password) throw new Error('CAMPFIRE_ADMIN_PASSWORD not set');
  return new TextEncoder().encode(password);
}

export type AdminAuthState = {
  authenticated: boolean;
  error?: string;
};

export async function loginAdmin(
  prevState: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  const password = formData.get('password') as string;
  const expected = process.env.CAMPFIRE_ADMIN_PASSWORD;

  if (!expected) {
    return { authenticated: false, error: 'Admin not configured.' };
  }

  if (password !== expected) {
    return { authenticated: false, error: 'Incorrect password.' };
  }

  const token = await new SignJWT({ role: 'campfire_admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/admin',
  });

  return { authenticated: true };
}

export async function checkAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
