export function generateMeetLink(bookingId: string): string {
  // Generate deterministic room code based on bookingId or random slug
  const hash = bookingId.replace(/\D/g, '') || Math.floor(1000 + Math.random() * 9000).toString();
  const p1 = (parseInt(hash, 10) % 899 + 100).toString(36).padStart(3, 'a');
  const p2 = ((parseInt(hash, 10) * 7) % 8999 + 1000).toString(36).padStart(4, 'b');
  const p3 = ((parseInt(hash, 10) * 13) % 899 + 100).toString(36).padStart(3, 'c');

  return `https://meet.google.com/rnm-${p1}-${p2}`;
}
