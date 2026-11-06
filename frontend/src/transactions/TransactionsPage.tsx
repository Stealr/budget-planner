import { useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { useCreateTransactionMutation, useGetTransactionsQuery } from './api';
import { useGetCategoriesQuery } from '../categories/api';

const expenseSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,9}(?:[,.]\d{1,2})?$/, 'Введите сумму в рублях с точностью до копейки')
    .refine((value) => Number(value.replace(',', '.')) > 0, 'Введите сумму больше нуля'),
  categoryId: z.string().regex(/^[1-9]\d*$/, 'Выберите категорию'),
  transactionDate: z.iso.date({ error: 'Выберите дату' }),
  description: z.string().trim().max(500, 'Максимум 500 символов'),
});

type ExpenseFields = z.input<typeof expenseSchema>;

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });

function saveError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    if (error.status === 404) return 'Категория больше недоступна. Выберите другую категорию.';
    if (error.status === 409) return 'Расход не соответствует выбранной категории.';
    if (error.status === 400) return 'Сервер отклонил данные. Проверьте сумму, дату и категорию.';
  }
  return 'Не удалось сохранить расход. Проверьте соединение и попробуйте снова.';
}

export default function TransactionsPage() {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const categories = useGetCategoriesQuery();
  const transactions = useGetTransactionsQuery(page);
  const [createTransaction, creation] = useCreateTransactionMutation();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ExpenseFields>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: '', categoryId: '', transactionDate: '', description: '' },
  });

  const expenseCategories = categories.data?.filter((item) => item.type === 'EXPENSE') ?? [];
  const categoryNames = new Map(categories.data?.map(({ id, name }) => [id, name]));
  const categoryId = useWatch({ control, name: 'categoryId' });
  const selectedCategoryExists = expenseCategories.some(({ id }) => String(id) === categoryId);

  function openForm() {
    creation.reset();
    reset({
      amount: '',
      categoryId: '',
      transactionDate: dayjs().format('YYYY-MM-DD'),
      description: '',
    });
    setOpen(true);
  }

  async function submit(values: ExpenseFields) {
    try {
      await createTransaction({
        amount: Number(values.amount.replace(',', '.')),
        categoryId: Number(values.categoryId),
        transactionDate: values.transactionDate,
        description: values.description,
        type: 'EXPENSE',
      }).unwrap();
      setPage(0);
      setOpen(false);
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        void categories.refetch();
      }
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between' }}
      >
        <Typography component="h1" variant="h1">
          Операции
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button component={Link} to="/transactions/import" variant="outlined">
            Импортировать выписку
          </Button>
          <Button variant="contained" onClick={openForm}>
            Добавить расход
          </Button>
        </Stack>
      </Stack>
      {transactions.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void transactions.refetch()}>Повторить</Button>}
        >
          Не удалось загрузить операции.
        </Alert>
      )}
      {transactions.isFetching && !transactions.currentData && (
        <CircularProgress aria-label="Загрузка операций" size={24} />
      )}
      {transactions.currentData && (
        <Card>
          {transactions.currentData.content.length === 0 ? (
            <CardContent>Операций пока нет. Добавьте первый расход.</CardContent>
          ) : (
            <>
              <TableContainer component={Box}>
                <Table
                  aria-label="История операций"
                  sx={{
                    '& .MuiTableCell-root': { px: { xs: 1, sm: 2 }, overflowWrap: 'anywhere' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        Комментарий
                      </TableCell>
                      <TableCell align="right">Сумма</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.currentData.content.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{dayjs(item.transactionDate).format('DD.MM.YYYY')}</TableCell>
                        <TableCell>
                          {categoryNames.get(item.categoryId) ?? 'Категория #' + item.categoryId}
                          {item.description && (
                            <Typography
                              variant="caption"
                              sx={{ display: { xs: 'block', sm: 'none' } }}
                            >
                              {item.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {item.description || '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {money.format(item.type === 'EXPENSE' ? -item.amount : item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={transactions.currentData.totalElements}
                page={page}
                rowsPerPage={20}
                rowsPerPageOptions={[]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
                getItemAriaLabel={(type) =>
                  type === 'previous' ? 'Предыдущая страница' : 'Следующая страница'
                }
                onPageChange={(_, nextPage) => setPage(nextPage)}
              />
            </>
          )}
        </Card>
      )}
      <Dialog
        open={open}
        onClose={() => {
          if (!creation.isLoading) setOpen(false);
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="expense-title"
      >
        <Box component="form" noValidate onSubmit={handleSubmit(submit)}>
          <DialogTitle id="expense-title">Добавить расход</DialogTitle>
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
              {categories.isSuccess && expenseCategories.length === 0 && (
                <Alert severity="info">Сначала добавьте категорию расхода.</Alert>
              )}
              {creation.isError && <Alert severity="error">{saveError(creation.error)}</Alert>}
              <TextField
                label="Сумма, ₽"
                autoFocus
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
                    {...field}
                    inputRef={ref}
                    select
                    id="expense-category"
                    label="Категория"
                    value={selectedCategoryExists ? field.value : ''}
                    disabled={categories.isFetching || expenseCategories.length === 0}
                    error={!!errors.categoryId}
                    helperText={errors.categoryId?.message}
                  >
                    {expenseCategories.map(({ id, name }) => (
                      <MenuItem key={id} value={String(id)}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Дата"
                type="date"
                {...register('transactionDate')}
                error={!!errors.transactionDate}
                helperText={errors.transactionDate?.message}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Комментарий"
                {...register('description')}
                multiline
                minRows={2}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={creation.isLoading}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creation.isLoading || !selectedCategoryExists}
            >
              {creation.isLoading ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
