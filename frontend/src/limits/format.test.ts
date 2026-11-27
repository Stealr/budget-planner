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
  it('rejects a month outside the calendar', () => {
    expect(monthSchema.safeParse('2026-13').success).toBe(false);
  });
  it('accepts a calendar month in YYYY-MM format', () => {
    expect(monthSchema.safeParse('2026-11').success).toBe(true);
  });
});

describe('monthly progress from server amounts', () => {
  it('classifies a fully used limit as reached', () => {
    const progress = limitProgress({ ...limitFixture, limitAmount: 100, spentAmount: 100 });
    expect(progress.level).toBe('NEAR_LIMIT');
    expect(progress.percent).toBe(100);
    expect(progress.remaining).toBe(0);
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
