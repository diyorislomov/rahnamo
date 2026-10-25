import 'server-only';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const uploadDirectory = () =>
  process.env.UPLOAD_DIR || path.join(process.cwd(), '.local-data', 'uploads');
export const uploadNamePattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
export async function saveImage(file: File): Promise<string> {
  if (file.size < 12 || file.size > 5 * 1024 * 1024) throw new Error('invalid_file_size');
  const buffer = Buffer.from(await file.arrayBuffer());
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const extension =
    file.type === 'image/png' && buffer.subarray(0, 8).equals(png)
      ? 'png'
      : file.type === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
        ? 'jpg'
        : file.type === 'image/webp' &&
            buffer.subarray(0, 4).toString() === 'RIFF' &&
            buffer.subarray(8, 12).toString() === 'WEBP'
          ? 'webp'
          : null;
  if (!extension) throw new Error('invalid_file_signature');
  const name = randomUUID() + '.' + extension;
  await mkdir(uploadDirectory(), { recursive: true, mode: 0o750 });
  await writeFile(path.join(/* turbopackIgnore: true */ uploadDirectory(), name), buffer, {
    flag: 'wx',
    mode: 0o640,
  });
  return '/api/uploads/' + name;
}
export async function readImage(name: string) {
  if (!uploadNamePattern.test(name)) throw new Error('invalid_filename');
  return readFile(
    /* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ uploadDirectory(), name),
  );
}
