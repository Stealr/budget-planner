import { expect, it } from 'vitest';
import { apiErrorMessage } from './apiError';

it('does not expose an unknown server detail', () => {
  const error = { status: 409, data: { message: 'Unknown internal constraint' } };
  expect(apiErrorMessage(error, 'Ошибка')).toBe(
    'Данные изменились или связаны с другими записями. Обновите список и попробуйте снова.',
  );
});
