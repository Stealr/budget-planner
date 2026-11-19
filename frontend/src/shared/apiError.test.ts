import { expect, it } from 'vitest';
import { apiErrorMessage } from './apiError';

it.each(['Unknown internal constraint', '__proto__', 'constructor'])(
  'does not expose an unknown server detail: %s',
  (message) => {
    expect(apiErrorMessage({ status: 409, data: { message } }, 'Ошибка')).toBe(
      'Данные изменились или связаны с другими записями. Обновите список и попробуйте снова.',
    );
  },
);
