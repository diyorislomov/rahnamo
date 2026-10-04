import { describe, expect, it } from 'vitest';
import { normalizeSlots } from '../src/lib/slots';
import { serviceInput } from '../src/lib/services';

describe('booking slots', () => {
  it('removes duplicate and expired ISO slots and sorts future times', () => {
    const now = new Date('2026-10-05T00:00:00.000Z').getTime();
    expect(normalizeSlots([
      '2026-10-06T12:00:00.000Z',
      '2026-10-04T12:00:00.000Z',
      '2026-10-06T09:00:00.000Z',
      '2026-10-06T09:00:00.000Z',
    ], now)).toEqual([
      '2026-10-06T09:00:00.000Z',
      '2026-10-06T12:00:00.000Z',
    ]);
  });
});

describe('mentor services', () => {
  it('accepts a valid paid service and normalizes numeric values', () => {
    expect(serviceInput({
      title: 'CV tahlili',
      description: 'CV va portfolio bo‘yicha tavsiyalar',
      serviceType: 'cv_review',
      durationMinutes: '45',
      price: '150000',
    })).toMatchObject({ serviceType: 'cv_review', durationMinutes: 45, price: 150000 });
  });

  it('rejects invalid duration and prices', () => {
    expect(serviceInput({ title: 'Test', description: '', serviceType: 'custom', durationMinutes: 5, price: 0 })).toBeNull();
  });
});
