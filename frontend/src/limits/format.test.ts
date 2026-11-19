import { describe, expect, it } from 'vitest';
import { limitProgress, monthSchema } from './format';
const limitFixture = {
  categoryId: 1,
  categoryName: 'Еда',
  month: '2026-11',
  limitAmount: 1000,
  spentAmount: 0,
};

describe('calendar month validation', () => {
  it.each(['2026-1', '2026-13', '2026-00', '0000-01', '10000-01', '2026-11-01', ''])(
    'rejects %s',
    (month) => {
      expect(monthSchema.safeParse(month).success).toBe(false);
    },
  );
  it.each(['0001-01', '2026-11', '9999-12'])('accepts %s', (month) => {
    expect(monthSchema.safeParse(month).success).toBe(true);
  });
});

describe('monthly progress from server amounts', () => {
  it.each([
    [79, null],
    [80, 'NEAR_LIMIT'],
    [100, 'NEAR_LIMIT'],
    [101, 'EXCEEDED'],
  ] as const)('classifies %s%%', (percent, level) => {
    const progress = limitProgress({ ...limitFixture, limitAmount: 100, spentAmount: percent });
    expect(progress.level).toBe(level);
    expect(progress.percent).toBe(percent);
    expect(progress.remaining).toBe(100 - percent);
  });
  it('keeps a one-kopeck excess even when displayed percent rounds to 100', () => {
    const progress = limitProgress({ ...limitFixture, limitAmount: 20000, spentAmount: 20000.01 });
    expect(progress.level).toBe('EXCEEDED');
    expect(progress.remaining).toBe(-0.01);
  });
  it('compares the exact 80% boundary without a binary floating-point threshold error', () => {
    expect(limitProgress({ ...limitFixture, limitAmount: 0.25, spentAmount: 0.2 }).level).toBe(
      'NEAR_LIMIT',
    );
    expect(
      limitProgress({ ...limitFixture, limitAmount: 1000, spentAmount: 799.99 }).level,
    ).toBeNull();
  });
});
