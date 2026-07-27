import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'a-very-secure-secret-key-that-should-be-in-env-file'
);
const ALG = 'HS256';

export async function signToken(payload: { userId: number; email: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('30d') // Valid for 30 days
    .sign(JWT_SECRET);
  return token;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; email: string };
  } catch (error) {
    return null; // Invalid or expired token
  }
}
