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
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetCategoriesQuery } from '../categories/api';
import { useAppDispatch } from '../store/hooks';
import { api } from '../store/api';
import { apiErrorDetail, apiErrorMessage, apiErrorStatus } from '../shared/apiError';
import { amountSchema, amountToNumber, today } from '../shared/format';
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  type Transaction,
} from './api';

const schema = z.object({
  amount: amountSchema,
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().regex(/^[1-9]\d*$/, 'Выберите категорию'),
  transactionDate: z.iso.date({ error: 'Выберите дату' }),
  description: z.string().trim().max(500, 'Максимум 500 символов'),
});
type Fields = z.input<typeof schema>;

export default function TransactionDialog({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: (transaction: Transaction) => void;
}) {
  const categories = useGetCategoriesQuery(true);
  const dispatch = useAppDispatch();
  const [create, creation] = useCreateTransactionMutation();
  const [update, updating] = useUpdateTransactionMutation();
  const mutation = transaction ? updating : creation;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: transaction ? String(transaction.amount).replace('.', ',') : '',
      type: transaction?.type ?? 'EXPENSE',
      categoryId: transaction ? String(transaction.categoryId) : '',
      transactionDate: transaction?.transactionDate ?? today(),
      description: transaction?.description ?? '',
    },
  });
  const type = useWatch({ control, name: 'type' });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const availableCategories =
    categories.currentData?.filter(
      (category) =>
        category.type === type && (!category.archivedAt || category.id === transaction?.categoryId),
    ) ?? [];
  const selectedExists = availableCategories.some((category) => String(category.id) === categoryId);
  const busy = isSubmitting || mutation.isLoading;

  async function submit(values: Fields) {
    if (!selectedExists) return;
    const body = {
      ...values,
      amount: amountToNumber(values.amount),
      categoryId: Number(values.categoryId),
    };
    try {
      const saved = transaction
        ? await update({ id: transaction.id, body }).unwrap()
        : await create(body).unwrap();
      onSaved(saved);
    } catch (error) {
      const status = apiErrorStatus(error);
      if (status === 404 || status === 409) dispatch(api.util.invalidateTags(['Categories']));
    }
  }

  const categoryMissing =
    !transaction || apiErrorDetail(mutation.error).startsWith('Category not found:');
  return (
    <Dialog
      open
      fullWidth
      maxWidth="xs"
      aria-labelledby="transaction-title"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Box component="form" noValidate onSubmit={handleSubmit(submit)}>
        <DialogTitle id="transaction-title">
          {transaction ? 'Редактировать операцию' : 'Добавить операцию'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {categories.isError && (
              <Alert
                severity="error"
                action={<Button onClick={() => void categories.refetch()}>Повторить</Button>}
              >
                Не удалось загрузить категории.
              </Alert>
            )}
            {categories.isSuccess && availableCategories.length === 0 && (
              <Alert severity="info">
                Нет активных категорий выбранного типа. Создайте категорию в разделе «Категории».
              </Alert>
            )}
            {mutation.isError && (
              <Alert severity="error">
                {apiErrorMessage(
                  mutation.error,
                  'Не удалось сохранить операцию. Попробуйте снова.',
                  categoryMissing
                    ? { 404: 'Категория больше недоступна. Выберите другую категорию.' }
                    : {},
                )}
              </Alert>
            )}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  {...field}
                  id="transaction-type"
                  label="Тип операции"
                  disabled={busy}
                  onChange={(event) => {
                    field.onChange(event);
                    setValue('categoryId', '');
                    clearErrors('categoryId');
                  }}
                >
                  <MenuItem value="EXPENSE">Расход</MenuItem>
                  <MenuItem value="INCOME">Доход</MenuItem>
                </TextField>
              )}
            />
            <TextField
              id="transaction-amount"
              label="Сумма, ₽"
              autoFocus
              disabled={busy}
              {...register('amount')}
              error={!!errors.amount}
              helperText={errors.amount?.message}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <Controller
              name="categoryId"
              control={control}
              render={({ field: { ref, ...field } }) => (
                <TextField
                  select
                  {...field}
                  inputRef={ref}
                  id="transaction-category"
                  label="Категория"
                  value={selectedExists ? field.value : ''}
                  disabled={busy || categories.isFetching || !availableCategories.length}
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                >
                  {availableCategories.map(({ id, name, archivedAt }) => (
                    <MenuItem
                      key={id}
                      value={String(id)}
                      sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                    >
                      {name}
                      {archivedAt ? ' (архив)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {availableCategories.some(
              (category) => category.archivedAt && String(category.id) === categoryId,
            ) && (
              <Alert severity="info">
                Можно сохранить прежнюю архивную категорию или выбрать активную.
              </Alert>
            )}
            <TextField
              id="transaction-date"
              label="Дата"
              type="date"
              disabled={busy}
              {...register('transactionDate')}
              error={!!errors.transactionDate}
              helperText={errors.transactionDate?.message}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="transaction-description"
              label="Комментарий"
              multiline
              minRows={2}
              disabled={busy}
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
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
