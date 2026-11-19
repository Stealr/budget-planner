import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useGetCategoriesQuery } from '../categories/api';
import { formatMoney, today } from '../shared/format';
import { apiErrorMessage } from '../shared/apiError';
import ConfirmActionDialog from '../shared/ConfirmActionDialog';
import { useDeleteMonthlyLimitMutation, useGetMonthlyLimitsQuery } from './api';
import { formatMonth, formatPercent, limitProgress, monthSchema } from './format';
import MonthlyLimitDialog from './MonthlyLimitDialog';
import type { MonthlyLimit } from './types';

type Editor = { month: string; limit: MonthlyLimit | null; limits: MonthlyLimit[] };

export default function LimitsPage() {
  const [params, setParams] = useSearchParams();
  const month = params.get('month') ?? today().slice(0, 7);
  const validMonth = monthSchema.safeParse(month).success;
  const limits = useGetMonthlyLimitsQuery(month, { skip: !validMonth });
  const categories = useGetCategoriesQuery(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<MonthlyLimit | null>(null);
  const [remove, removal] = useDeleteMonthlyLimitMutation();
  const [notice, setNotice] = useState('');
  function openEditor(limit: MonthlyLimit | null) {
    setEditor({ month, limit, limits: limits.currentData ?? [] });
  }
  async function confirmDelete() {
    if (!deleting || removal.isLoading) return;
    try {
      await remove({ categoryId: deleting.categoryId, month: deleting.month }).unwrap();
      setNotice(
        `Лимит удалён: ${deleting.categoryName}, ${formatMonth(deleting.month)}. Операции сохранены.`,
      );
      setDeleting(null);
    } catch {
      // Keep the confirmation and show the API error.
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
          Лимиты
        </Typography>
        <Button
          variant="contained"
          disabled={!validMonth || limits.isFetching || limits.isError}
          onClick={() => openEditor(null)}
        >
          Задать лимит
        </Button>
      </Stack>
      <TextField
        id="limits-month"
        label="Месяц"
        type="month"
        value={validMonth ? month : ''}
        error={!validMonth}
        helperText={!validMonth ? 'Укажите корректный месяц, год от 0001 до 9999' : undefined}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: '0001-01', max: '9999-12' } }}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          next.set('month', event.target.value);
          setParams(next);
        }}
        sx={{ maxWidth: { sm: 280 } }}
      />
      {notice && (
        <Alert
          severity="success"
          closeText="Закрыть"
          sx={{ overflowWrap: 'anywhere' }}
          onClose={() => setNotice('')}
        >
          {notice}
        </Alert>
      )}
      {!validMonth && (
        <Alert severity="error">
          В адресе указан некорректный месяц. Выберите месяц для просмотра лимитов.
        </Alert>
      )}
      {validMonth && limits.isFetching && (
        <CircularProgress size={24} aria-label="Загрузка лимитов" />
      )}
      {validMonth && limits.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void limits.refetch()}>Повторить</Button>}
        >
          {apiErrorMessage(limits.error, 'Не удалось загрузить лимиты.')}
        </Alert>
      )}
      {categories.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void categories.refetch()}>Повторить категории</Button>}
        >
          Не удалось загрузить категории. Лимиты доступны для просмотра и удаления.
        </Alert>
      )}
      {validMonth && limits.currentData && (
        <Stack spacing={2} aria-busy={limits.isFetching}>
          {!limits.currentData.length && (
            <Card>
              <CardContent>На выбранный месяц лимиты пока не заданы.</CardContent>
            </Card>
          )}
          {limits.currentData.map((limit) => {
            const category = categories.currentData?.find((item) => item.id === limit.categoryId);
            const progress = limitProgress(limit);
            const color =
              progress.level === 'EXCEEDED'
                ? 'error'
                : progress.level === 'NEAR_LIMIT'
                  ? 'warning'
                  : 'primary';
            const editable = category?.type === 'EXPENSE' && !category.archivedAt;
            return (
              <Card
                key={limit.categoryId}
                component="article"
                aria-label={`Лимит ${limit.categoryName}`}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Typography component="h2" variant="h2" sx={{ overflowWrap: 'anywhere' }}>
                        {limit.categoryName}
                      </Typography>
                      {category?.archivedAt && <Chip size="small" label="Категория в архиве" />}
                    </Stack>
                    <Typography>
                      Потрачено {formatMoney(limit.spentAmount)} из {formatMoney(limit.limitAmount)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, progress.percent))}
                      color={color}
                      aria-label={`Расходы по категории ${limit.categoryName}`}
                      aria-valuetext={`${formatPercent(progress.percent)} лимита`}
                    />
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{ justifyContent: 'space-between' }}
                    >
                      <Typography>
                        {formatPercent(progress.percent)} ·{' '}
                        {progress.remaining < 0
                          ? `Превышение: ${formatMoney(-progress.remaining)}`
                          : `Осталось: ${formatMoney(progress.remaining)}`}
                      </Typography>
                      <Typography color={color === 'primary' ? 'text.secondary' : `${color}.main`}>
                        {progress.level === 'EXCEEDED'
                          ? 'Лимит превышен'
                          : progress.level === 'NEAR_LIMIT'
                            ? 'Достигнут порог 80%'
                            : 'В пределах лимита'}
                      </Typography>
                    </Stack>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {editable && (
                        <Button
                          variant="outlined"
                          disabled={
                            limits.isFetching || categories.isFetching || categories.isError
                          }
                          onClick={() => openEditor(limit)}
                          aria-label={`Изменить лимит ${limit.categoryName}`}
                        >
                          Изменить
                        </Button>
                      )}
                      <Button
                        color="error"
                        disabled={limits.isFetching}
                        aria-label={`Удалить лимит ${limit.categoryName}`}
                        onClick={() => {
                          removal.reset();
                          setDeleting(limit);
                        }}
                      >
                        Удалить
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
      {editor && (
        <MonthlyLimitDialog
          {...editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setNotice(`Лимит сохранён за ${formatMonth(editor.month)}.`);
            setEditor(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmActionDialog
          title="Удалить лимит?"
          label="Удалить"
          destructive
          busy={removal.isLoading}
          description={`«${deleting.categoryName}», ${formatMonth(deleting.month)}, ${formatMoney(deleting.limitAmount)}. Операции и история расходов сохранятся.`}
          error={
            removal.isError
              ? apiErrorMessage(removal.error, 'Не удалось удалить лимит. Попробуйте снова.')
              : undefined
          }
          onClose={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </Stack>
  );
}
