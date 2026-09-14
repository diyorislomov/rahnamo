// Jitsi rooms are created on first visit -- no registration, no API key.
// Anyone who knows the room name can join, so the name itself has to be
// hard to guess, not just unique.
function randomSuffix(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i++) values[i] = Math.floor(Math.random() * 4294967296);
  }
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

export function generateMeetLink(bookingId: string): string {
  const safeId = bookingId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `https://meet.jit.si/rahnamo-${safeId}-${randomSuffix()}`;
}
