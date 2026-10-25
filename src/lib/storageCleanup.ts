import 'server-only';
import { deleteImage } from './localUploads';

export interface StorageCleanupResult {
  deletedLocal: string[];
  deletedSupabase: string[];
  bucketsChecked: string[];
  errors: string[];
}

/**
 * Removes all stored files associated with a deleted user.
 * Supports:
 * 1. Local filesystem uploads (/api/uploads/<uuid>.<ext>) -> unlinked, returning 404.
 * 2. Supabase Storage buckets ('avatars', 'counselor-photos', 'applications') via service-role API.
 */
export async function deleteUserStoredFiles(
  userId: string,
  candidateUrls: (string | null | undefined)[]
): Promise<StorageCleanupResult> {
  const result: StorageCleanupResult = {
    deletedLocal: [],
    deletedSupabase: [],
    bucketsChecked: ['avatars', 'counselor-photos', 'applications'],
    errors: [],
  };

  const validUrls = candidateUrls
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());

  // 1. Clean up local filesystem uploads
  for (const url of validUrls) {
    if (url.includes('/api/uploads/')) {
      try {
        const deleted = await deleteImage(url);
        if (deleted) {
          result.deletedLocal.push(url);
        }
      } catch (err) {
        result.errors.push(`Local delete failed for ${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 2. Clean up Supabase Storage if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('placeholder')) {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');

    // 2a. Delete explicit Supabase object URLs (e.g., .../storage/v1/object/public/<bucket>/<path>)
    for (const url of validUrls) {
      const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bucket, objectPath] = match;
        try {
          const res = await fetch(`${cleanUrl}/storage/v1/object/${bucket}/${objectPath}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
          });
          if (res.ok) {
            result.deletedSupabase.push(`${bucket}/${objectPath}`);
          }
        } catch (err) {
          result.errors.push(`Supabase delete failed for ${url}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 2b. Check standard buckets for user-prefixed paths (${userId}/)
    for (const bucket of result.bucketsChecked) {
      try {
        // List files in bucket with prefix userId
        const listRes = await fetch(`${cleanUrl}/storage/v1/object/list/${bucket}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            prefix: `${userId}`,
            limit: 100,
          }),
        });

        if (listRes.ok) {
          const files = (await listRes.json()) as Array<{ name: string }>;
          if (Array.isArray(files) && files.length > 0) {
            const pathsToDelete = files.map((f) => `${userId}/${f.name}`);
            const delRes = await fetch(`${cleanUrl}/storage/v1/object/${bucket}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceKey}`,
                apikey: serviceKey,
              },
              body: JSON.stringify({ prefixes: pathsToDelete }),
            });
            if (delRes.ok) {
              result.deletedSupabase.push(...pathsToDelete.map((p) => `${bucket}/${p}`));
            }
          }
        }
      } catch (err) {
        result.errors.push(`Supabase bucket check failed for ${bucket}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return result;
}
