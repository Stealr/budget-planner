export function apiErrorStatus(error: unknown) {
  return error && typeof error === 'object' && 'status' in error ? error.status : undefined;
}

export function apiErrorDetail(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data;
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  }
  return '';
}

const conflicts: Record<string, string> = {
  'Standard categories cannot be changed': 'Стандартные категории нельзя изменять.',
  'Category is used by transactions and can only be archived':
    'У категории есть операции. Вместо удаления её можно архивировать.',
  'Category is used by monthly limits and can only be archived':
    'У категории есть лимиты. Вместо удаления её можно архивировать.',
  'Cannot change type of a category with transactions':
    'Нельзя изменить тип категории с операциями. Название можно изменить отдельно.',
  'Cannot change type of a category with monthly limits':
    'Нельзя изменить тип категории с лимитами. Название можно изменить отдельно.',
  'Cannot assign an archived category': 'Категория архивирована. Выберите активную категорию.',
  'Category type does not match transaction type': 'Тип категории не совпадает с типом операции.',
};

export function apiErrorMessage(
  error: unknown,
  fallback: string,
  overrides: Partial<Record<number, string>> = {},
) {
  const status = apiErrorStatus(error);
  if (typeof status === 'number' && overrides[status]) return overrides[status]!;
  if (status === 409) {
    const message = conflicts[apiErrorDetail(error)];
    return typeof message === 'string'
      ? message
      : 'Данные изменились или связаны с другими записями. Обновите список и попробуйте снова.';
  }
  if (status === 400) return 'Сервер отклонил данные. Проверьте заполненные поля.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 404) return 'Запись больше недоступна. Возможно, она уже удалена.';
  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
    return 'Нет связи с сервером. Проверьте соединение и попробуйте снова.';
  }
  return fallback;
}
