import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { SessionUser, UserRole } from './types';

const DEMO_COOKIE = 'adbyte_demo_session';
const SECRET_RAW = process.env.DEMO_JWT_SECRET ?? 'adbyte-demo-secret-key-minimum-32-chars!!';
const SECRET = new TextEncoder().encode(SECRET_RAW.padEnd(32, '!'));

const DEMO_USERS: Record<string, SessionUser> = {
  buyer: {
    sub: 'demo|buyer-alex',
    email: 'alex@globaladbuyers.com',
    name: 'Alex Park',
    picture: 'https://api.dicebear.com/9.x/initials/svg?seed=AP',
    company: 'Global Ad Buyers LLC',
  },
  publisher: {
    sub: 'demo|publisher-sam',
    email: 'sam@streammedia.io',
    name: 'Sam Rivera',
    picture: 'https://api.dicebear.com/9.x/initials/svg?seed=SR',
    company: 'StreamMedia Inc.',
  },
};

export async function createDemoSession(persona: 'buyer' | 'publisher'): Promise<string> {
  const user = DEMO_USERS[persona];
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setSubject(user.sub)
    .sign(SECRET);
  return token;
}

export async function getDemoSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(DEMO_COOKIE)?.value;
    if (!raw) return null;
    const { payload } = await jwtVerify(raw, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function setDemoRole(role: UserRole): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(DEMO_COOKIE)?.value;
  if (!raw) throw new Error('No demo session');
  const { payload } = await jwtVerify(raw, SECRET);
  const updated = { ...(payload as unknown as SessionUser), role };
  const token = await new SignJWT({ ...updated })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setSubject(updated.sub)
    .sign(SECRET);
  return token;
}

export { DEMO_COOKIE };
