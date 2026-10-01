// Jitsi rooms are created on first visit -- no registration, no API key.
// Anyone who knows the room name can join, so the name itself has to be
// hard to guess, not just unique.
function randomSuffix(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.randomBytes(length), (value) => chars[value % chars.length]).join('');
}

export function generateMeetLink(bookingId: string): string {
  const safeId = bookingId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `https://meet.jit.si/rahnamo-${safeId}-${randomSuffix()}`;
}
import 'server-only';
import crypto from 'crypto';
