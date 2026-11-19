import { z } from 'zod';
import type { TransactionQuery } from './api';

const optionalDate = z.union([z.literal(''), z.iso.date({ error: 'Введите корректную дату' })]);
export const filtersSchema = z
  .object({
    type: z.enum(['', 'INCOME', 'EXPENSE'], { error: 'Выберите тип операции' }),
    categoryId: z
      .string()
      .refine(
        (value) =>
          value === '' || (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))),
        'Выберите категорию',
      ),
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    path: ['dateTo'],
    message: 'Конец периода должен быть не раньше начала',
  });

export type FilterFields = z.input<typeof filtersSchema>;
export const emptyFilters: FilterFields = { type: '', categoryId: '', dateFrom: '', dateTo: '' };

export function readFilters(params: URLSearchParams) {
  return {
    type: params.get('type') ?? '',
    categoryId: params.get('categoryId') ?? '',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
  };
}

export function readPage(params: URLSearchParams) {
  const value = params.get('page') ?? '0';
  return /^\d+$/.test(value) && Number(value) <= 2_147_483_647 ? Number(value) : 0;
}

export function filtersToQuery(fields: FilterFields, page: number): TransactionQuery {
  return {
    page,
    type: fields.type || undefined,
    categoryId: fields.categoryId ? Number(fields.categoryId) : undefined,
    dateFrom: fields.dateFrom || undefined,
    dateTo: fields.dateTo || undefined,
  };
}

export function writeFilters(params: URLSearchParams, fields: FilterFields) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(fields)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  next.delete('page');
  return next;
}
