const RUNNING_BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev';

/**
 * True when this tab's own JS (frozen at whatever commit was live when it
 * last actually loaded) no longer matches what's currently deployed.
 *
 * Fails open on purpose: a network hiccup while checking must never block a
 * real, up-to-date student from booking -- this is a targeted fix for one
 * specific gap (stale code silently skipping a whole code branch), not a
 * replacement for the error handling that already covers real write
 * failures independently.
 */
export async function isRunningStaleBuild(): Promise<boolean> {
  if (RUNNING_BUILD_VERSION === 'dev') return false;

  try {
    const res = await fetch('/api/build-version', { cache: 'no-store' });
    if (!res.ok) return false;
    const { version } = await res.json();
    return typeof version === 'string' && version !== 'dev' && version !== RUNNING_BUILD_VERSION;
  } catch {
    return false;
  }
}

export function announceStaleBuild() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('rahnamo:stale-build'));
  }
}
