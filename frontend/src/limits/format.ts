import { z } from 'zod';
import type { MonthlyLimit, LimitWarning } from './types';

export const monthSchema = z
  .string()
  .regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/, 'Укажите месяц в формате ГГГГ-ММ, год от 0001 до 9999');
const months = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const percentages = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const formatMonth = (month: string) =>
  months.format(new Date(`${month}-01T00:00:00Z`)).replace(/\s*г\.$/, '');
export const formatPercent = (percent: number) => `${percentages.format(percent)}%`;

export function limitProgress(limit: MonthlyLimit) {
  const limitKopecks = Math.round(limit.limitAmount * 100);
  const spentKopecks = Math.round(limit.spentAmount * 100);
  const level: LimitWarning['level'] | null =
    spentKopecks > limitKopecks
      ? 'EXCEEDED'
      : spentKopecks * 5 >= limitKopecks * 4
        ? 'NEAR_LIMIT'
        : null;
  return {
    percent: (spentKopecks / limitKopecks) * 100,
    remaining: (limitKopecks - spentKopecks) / 100,
    level,
  };
}
