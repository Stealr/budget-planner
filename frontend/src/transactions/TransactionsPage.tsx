import { useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TablePagination,
  Typography,
} from '@mui/material';
import { useGetCategoriesQuery } from '../categories/api';
import { apiErrorMessage } from '../shared/apiError';
import { formatDate, formatMoney } from '../shared/format';
import ConfirmActionDialog from '../shared/ConfirmActionDialog';
import {
  transactionPageSize,
  useDeleteTransactionMutation,
  useGetTransactionsQuery,
  type Transaction,
} from './api';
import { filtersSchema, filtersToQuery, readFilters, readPage, writeFilters } from './filters';
import TransactionDialog from './TransactionDialog';
import TransactionFilters from './TransactionFilters';
import TransactionList from './TransactionList';
import LimitWarningAlert from '../limits/LimitWarningAlert';
import type { LimitWarning } from '../limits/types';

export default function TransactionsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const page = readPage(params);
  const rawFilters = readFilters(params);
  const filters = filtersSchema.safeParse(rawFilters);
  const categories = useGetCategoriesQuery(true);
  const transactions = useGetTransactionsQuery(
    filters.success ? filtersToQuery(filters.data, page) : { page },
    { skip: !filters.success },
  );
  const [editor, setEditor] = useState<{ transaction: Transaction | null } | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [remove, removal] = useDeleteTransactionMutation();
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState<LimitWarning | null>(null);
  const lastPage = Math.max(
    0,
    Math.ceil((transactions.currentData?.totalElements ?? 0) / transactionPageSize) - 1,
  );
  const correctingPage = filters.success && !!transactions.currentData && page > lastPage;
  const correctedParams = new URLSearchParams(params);
  if (lastPage) correctedParams.set('page', String(lastPage));
  else correctedParams.delete('page');
  const filtered = Object.values(rawFilters).some(Boolean);
  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage) next.set('page', String(nextPage));
    else next.delete('page');
    setParams(next);
  }
  async function confirmDelete() {
    if (!deleting || removal.isLoading) return;
    try {
      await remove(deleting.id).unwrap();
      setDeleting(null);
      setWarning(null);
      setNotice('Операция удалена.');
    } catch {
      // The dialog retains the selected transaction and displays the API error.
    }
  }
  return (
    <Stack spacing={3} sx={{ maxWidth: 1060, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between' }}
      >
        <Typography component="h1" variant="h1">
          Операции
        </Typography>
        <Button variant="contained" onClick={() => setEditor({ transaction: null })}>
          Добавить операцию
        </Button>
      </Stack>
      {notice && (
        <Alert severity="success" closeText="Закрыть" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {warning && <LimitWarningAlert warning={warning} onClose={() => setWarning(null)} />}
      <TransactionFilters
        values={rawFilters}
        categories={categories.currentData ?? []}
        onApply={(fields) => setParams(writeFilters(params, fields))}
      />
      {!filters.success && (
        <Alert severity="error">
          Некорректные фильтры в адресе. Исправьте их или сбросьте фильтры.
        </Alert>
      )}
      {categories.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void categories.refetch()}>Повторить</Button>}
        >
          Не удалось загрузить категории фильтра. История доступна по выбранным условиям.
        </Alert>
      )}
      {transactions.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void transactions.refetch()}>Повторить</Button>}
        >
          {apiErrorMessage(transactions.error, 'Не удалось загрузить операции.')}
        </Alert>
      )}
      {filters.success && transactions.isFetching && (
        <CircularProgress aria-label="Загрузка операций" size={24} />
      )}
      {correctingPage && (
        <Navigate
          replace
          to={{ pathname: location.pathname, search: `?${correctedParams}`, hash: location.hash }}
        />
      )}
      {filters.success && transactions.currentData && !correctingPage && (
        <Card aria-busy={transactions.isFetching}>
          {transactions.currentData.content.length ? (
            <TransactionList
              transactions={transactions.currentData.content}
              onEdit={(transaction) => setEditor({ transaction })}
              onDelete={(transaction) => {
                removal.reset();
                setDeleting(transaction);
              }}
            />
          ) : (
            <CardContent>
              {filtered
                ? 'По выбранным фильтрам операций не найдено.'
                : 'Операций пока нет. Добавьте первый доход или расход.'}
            </CardContent>
          )}
          {transactions.currentData.totalElements > 0 && (
            <TablePagination
              component="div"
              count={transactions.currentData.totalElements}
              page={page}
              rowsPerPage={transactionPageSize}
              rowsPerPageOptions={[]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
              getItemAriaLabel={(type) =>
                type === 'previous' ? 'Предыдущая страница' : 'Следующая страница'
              }
              onPageChange={(_, next) => changePage(next)}
            />
          )}
        </Card>
      )}
      {editor && (
        <TransactionDialog
          transaction={editor.transaction}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setWarning(
              !editor.transaction && saved.type === 'EXPENSE' ? (saved.limitWarning ?? null) : null,
            );
            if (!editor.transaction) changePage(0);
            setNotice(
              editor.transaction
                ? 'Операция сохранена.'
                : 'Операция добавлена. В списке действуют выбранные фильтры.',
            );
            setEditor(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmActionDialog
          title="Удалить операцию?"
          label="Удалить"
          destructive
          busy={removal.isLoading}
          description={`${formatDate(deleting.transactionDate)}, ${deleting.categoryName || `категория #${deleting.categoryId}`}, ${formatMoney(deleting.amount)}. Операция исчезнет из истории и отчётов.`}
          error={
            removal.isError
              ? apiErrorMessage(removal.error, 'Не удалось удалить операцию. Попробуйте снова.')
              : undefined
          }
          onClose={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </Stack>
  );
}
