'use client';
export type MentorSession = { user: { id: string }; counselorId: string };
export async function getMentorSession(): Promise<MentorSession | null> {
  try {
    const response = await fetch('/api/mentor/session', { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()).session;
  } catch {
    return null;
  }
}
export function watchMentorSession(callback: (session: MentorSession | null) => void) {
  const refresh = () => {
    void getMentorSession().then(callback);
  };
  refresh();
  window.addEventListener('rahnamo-mentor-session', refresh);
  window.addEventListener('focus', refresh);
  return () => {
    window.removeEventListener('rahnamo-mentor-session', refresh);
    window.removeEventListener('focus', refresh);
  };
}
export async function mentorLogin(email: string, password: string) {
  const response = await fetch('/api/mentor/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return false;
  window.dispatchEvent(new Event('rahnamo-mentor-session'));
  return true;
}
export async function mentorLogout() {
  const response = await fetch('/api/mentor/session', { method: 'DELETE' });
  if (response.ok) window.dispatchEvent(new Event('rahnamo-mentor-session'));
}
