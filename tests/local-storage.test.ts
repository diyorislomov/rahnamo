import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hashPassword, verifyPassword, newToken, tokenHash } from '../src/lib/mentorPasswords';
import { saveImage, readImage } from '../src/lib/localUploads';
import { isAllowedAvatarUrl } from '../src/lib/avatarUrl';
vi.mock('server-only', () => ({}));

describe('local mentor credentials', () => {
  it('salts passwords and rejects incorrect or malformed credentials', async () => {
    const first = await hashPassword('correct long password');
    const second = await hashPassword('correct long password');
    expect(first).not.toBe(second);
    expect(await verifyPassword('correct long password', first)).toBe(true);
    expect(await verifyPassword('wrong password', first)).toBe(false);
    expect(await verifyPassword('correct long password', null)).toBe(false);
    expect(await verifyPassword('correct long password', 'invalid')).toBe(false);
    const token = newToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash(token)).not.toBe(token);
  });
});
describe('persistent uploads', () => {
  it('round-trips an image but rejects path traversal, HTML and oversized files', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'rahnamo-upload-'));
    const previous = process.env.UPLOAD_DIR;
    process.env.UPLOAD_DIR = directory;
    try {
      const image = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      );
      const url = await saveImage(new File([image], 'photo.png', { type: 'image/png' }));
      expect(isAllowedAvatarUrl(url)).toBe(true);
      expect(await readImage(url.split('/').pop()!)).toEqual(image);
      await expect(readImage('../../.env.production.local')).rejects.toThrow();
      await expect(
        saveImage(new File(['<script>alert(1)</script>'], 'bad.png', { type: 'image/png' })),
      ).rejects.toThrow();
      await expect(
        saveImage(
          new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
        ),
      ).rejects.toThrow();
      expect(isAllowedAvatarUrl('//evil.example/a.png')).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = previous;
      await rm(directory, { recursive: true });
    }
  });
});
