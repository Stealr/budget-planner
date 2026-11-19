import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetCategoriesQuery } from '../categories/api';
import { amountSchema, amountToNumber } from '../shared/format';
import { apiErrorMessage, apiErrorStatus } from '../shared/apiError';
import { api } from '../store/api';
import { useAppDispatch } from '../store/hooks';
import { useSetMonthlyLimitMutation } from './api';
import { formatMonth } from './format';
import type { MonthlyLimit } from './types';

const schema = z.object({
  categoryId: z.string().regex(/^[1-9]\d*$/, 'Выберите категорию расходов'),
  amount: amountSchema,
});
type Fields = z.input<typeof schema>;

export default function MonthlyLimitDialog({
  month,
  limit,
  limits,
  onClose,
  onSaved,
}: {
  month: string;
  limit: MonthlyLimit | null;
  limits: MonthlyLimit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = useGetCategoriesQuery(true);
  const [save, saving] = useSetMonthlyLimitMutation();
  const dispatch = useAppDispatch();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: limit ? String(limit.categoryId) : '',
      amount: limit ? String(limit.limitAmount).replace('.', ',') : '',
    },
  });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const available =
    categories.currentData?.filter(
      (category) => category.type === 'EXPENSE' && !category.archivedAt,
    ) ?? [];
  const selectedExists = available.some((category) => String(category.id) === categoryId);
  const busy = saving.isLoading || isSubmitting;
  async function submit(values: Fields) {
    if (!selectedExists) return;
    try {
      await save({
        month,
        categoryId: Number(values.categoryId),
        amount: amountToNumber(values.amount),
      }).unwrap();
      onSaved();
    } catch (error) {
      const status = apiErrorStatus(error);
      if (status === 404 || status === 409)
        dispatch(api.util.invalidateTags(['Categories', 'Limits']));
    }
  }
  return (
    <Dialog
      open
      fullWidth
      maxWidth="xs"
      aria-labelledby="limit-title"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Box component="form" noValidate onSubmit={handleSubmit(submit)}>
        <DialogTitle id="limit-title">{limit ? 'Изменить лимит' : 'Задать лимит'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>Месяц: {formatMonth(month)}</Typography>
            {categories.isError && (
              <Alert
                severity="error"
                action={<Button onClick={() => void categories.refetch()}>Повторить</Button>}
              >
                Не удалось загрузить категории.
              </Alert>
            )}
            {categories.isSuccess && !available.length && (
              <Alert severity="info">
                Нет активных категорий расходов. Добавьте категорию в разделе «Категории».
              </Alert>
            )}
            {saving.isError && (
              <Alert severity="error">
                {apiErrorMessage(saving.error, 'Не удалось сохранить лимит. Попробуйте снова.', {
                  404: 'Категория больше недоступна. Обновите список категорий.',
                })}
              </Alert>
            )}
            {limit && categories.isSuccess && !selectedExists && (
              <Alert severity="info">
                Категория больше не доступна для настройки лимита. Существующий лимит можно
                посмотреть и удалить.
              </Alert>
            )}
            {!limit && limits.some((item) => String(item.categoryId) === categoryId) && (
              <Alert severity="info">
                Лимит для этой категории уже задан. Сохранение заменит его сумму.
              </Alert>
            )}
            <Controller
              name="categoryId"
              control={control}
              render={({ field: { ref, ...field } }) => (
                <TextField
                  select
                  {...field}
                  inputRef={ref}
                  id="limit-category"
                  label="Категория расходов"
                  value={selectedExists ? field.value : ''}
                  disabled={busy || !!limit || categories.isFetching || !available.length}
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                >
                  {available.map((category) => (
                    <MenuItem
                      key={category.id}
                      value={String(category.id)}
                      sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                    >
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              id="limit-amount"
              label="Лимит, ₽"
              autoFocus
              disabled={busy}
              {...register('amount')}
              error={!!errors.amount}
              helperText={errors.amount?.message}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !selectedExists || categories.isFetching}
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
