import { describe, expect, it } from 'vitest';
import { amountSchema, amountToNumber, formatMoney } from './format';

describe('ruble amounts', () => {
  it.each(['0', '-1', '1.001', '1e3', '1000000000', '', '1,', 'NaN', 'Infinity'])(
    'rejects invalid input %s',
    (value) => {
      expect(amountSchema.safeParse(value).success).toBe(false);
    },
  );
  it.each([
    ['0,01', 0.01],
    ['450.50', 450.5],
    ['999999999,99', 999999999.99],
    [' 5,1 ', 5.1],
  ])('accepts %s and converts to rubles', (input, expected) => {
    expect(amountToNumber(amountSchema.parse(input))).toBe(expected);
  });
  it('formats negative balances with kopecks and a ruble sign', () => {
    expect(formatMoney(-1234.5).replace(/\s/g, ' ')).toBe('-1 234,50 ₽');
  });
});
