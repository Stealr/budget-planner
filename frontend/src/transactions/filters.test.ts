import { describe, expect, it } from 'vitest';
import { emptyFilters, filtersSchema, readPage } from './filters';

describe('history filter validation', () => {
  it.each([{ dateFrom: '2026-11-30', dateTo: '2026-11-01' }, { dateFrom: '2026-02-30' }])(
    'rejects invalid conditions %#',
    (values) => {
      expect(filtersSchema.safeParse({ ...emptyFilters, ...values }).success).toBe(false);
    },
  );
  it('accepts a single day and an open-ended period', () => {
    expect(
      filtersSchema.safeParse({ ...emptyFilters, dateFrom: '2026-11-19', dateTo: '2026-11-19' })
        .success,
    ).toBe(true);
    expect(filtersSchema.safeParse({ ...emptyFilters, dateFrom: '2026-11-19' }).success).toBe(true);
  });
  it('falls back to the first page when the index exceeds the API range', () => {
    expect(readPage(new URLSearchParams({ page: '2147483648' }))).toBe(0);
  });
});
