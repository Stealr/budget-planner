import dayjs from 'dayjs';
import { z } from 'zod';

const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });

export const formatMoney = (value: number) => rubles.format(value);
export const formatDate = (value: string) => dayjs(value).format('DD.MM.YYYY');
export const today = () => dayjs().format('YYYY-MM-DD');

export const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:[,.]\d{1,2})?$/, 'Введите сумму до 999 999 999,99 ₽ с точностью до копейки')
  .refine((value) => Number(value.replace(',', '.')) > 0, 'Введите сумму больше нуля');

// The input range keeps the intermediate integer kopecks within Number.MAX_SAFE_INTEGER.
export function amountToNumber(value: string) {
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  return (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) / 100;
}

export const categoryTypeLabels = { EXPENSE: 'Расход', INCOME: 'Доход' } as const;
