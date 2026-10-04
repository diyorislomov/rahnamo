export function isIsoSlot(value: string): boolean {
  if (!value.includes('T')) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function isFutureSlot(value: string, now = Date.now()): boolean {
  if (!isIsoSlot(value)) return true;
  return new Date(value).getTime() > now;
}

export function normalizeSlots(values: string[], now = Date.now()): string[] {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return unique
    .filter((value) => isFutureSlot(value, now))
    .sort((left, right) => {
      const leftTime = isIsoSlot(left) ? new Date(left).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = isIsoSlot(right) ? new Date(right).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime || left.localeCompare(right);
    });
}

export function formatSlot(value: string, locale: string): string {
  if (!isIsoSlot(value)) return value;
  const resolvedLocale = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(resolvedLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}
