import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  const parts = stored?.split(':');
  const valid =
    parts?.length === 3 &&
    parts[0] === 'scrypt' &&
    /^[0-9a-f]{32}$/.test(parts[1]) &&
    /^[0-9a-f]{128}$/.test(parts[2]);
  const actual = await derive(password, valid ? parts![1] : '0'.repeat(32));
  const expected = Buffer.from(valid ? parts![2] : '0'.repeat(128), 'hex');
  return timingSafeEqual(actual, expected) && Boolean(valid);
}
