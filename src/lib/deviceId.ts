export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device-id';
  }
  const key = 'rahnamo_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `dev-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(key, id);
  }
  return id;
}