import { describe, expect, it } from 'vitest';
import { amountSchema, amountToNumber } from './format';

describe('ruble amounts', () => {
  it.each(['0', '1.001'])('rejects invalid input %s', (value) => {
    expect(amountSchema.safeParse(value).success).toBe(false);
  });
  it('accepts one kopeck with a comma separator', () => {
    expect(amountToNumber(amountSchema.parse('0,01'))).toBe(0.01);
  });
});
