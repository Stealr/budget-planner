import {
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { categoryTypeLabels, formatDate, formatMoney } from '../shared/format';
import type { Transaction } from './api';

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const actions = (transaction: Transaction) => (
    <Stack direction="row">
      <IconButton
        aria-label={`Редактировать операцию ${transaction.id}`}
        onClick={() => onEdit(transaction)}
      >
        <EditOutlinedIcon />
      </IconButton>
      <IconButton
        aria-label={`Удалить операцию ${transaction.id}`}
        onClick={() => onDelete(transaction)}
      >
        <DeleteOutlineIcon />
      </IconButton>
    </Stack>
  );
  const amount = (transaction: Transaction) =>
    formatMoney(transaction.type === 'EXPENSE' ? -transaction.amount : transaction.amount);
  const categoryName = (transaction: Transaction) =>
    transaction.categoryName || `Категория #${transaction.categoryId}`;
  if (mobile)
    return (
      <Stack
        component="ul"
        aria-label="История операций"
        spacing={1}
        sx={{ listStyle: 'none', m: 0, p: 0 }}
      >
        {transactions.map((transaction) => (
          <Card key={transaction.id} component="li">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'space-between', alignItems: 'start' }}
              >
                <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <Typography sx={{ fontWeight: 750 }}>{categoryName(transaction)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(transaction.transactionDate)} ·{' '}
                    {categoryTypeLabels[transaction.type]}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 750, flexShrink: 0 }}>
                  {amount(transaction)}
                </Typography>
              </Stack>
              {transaction.description && (
                <Typography sx={{ mt: 1, overflowWrap: 'anywhere' }}>
                  {transaction.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'end' }}>{actions(transaction)}</Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  return (
    <TableContainer>
      <Table aria-label="История операций">
        <TableHead>
          <TableRow>
            <TableCell>Дата</TableCell>
            <TableCell>Категория</TableCell>
            <TableCell>Комментарий</TableCell>
            <TableCell align="right">Сумма</TableCell>
            <TableCell>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatDate(transaction.transactionDate)}
              </TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>
                {categoryName(transaction)}
                <Typography variant="caption" component="div" color="text.secondary">
                  {categoryTypeLabels[transaction.type]}
                </Typography>
              </TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>
                {transaction.description || '—'}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {amount(transaction)}
              </TableCell>
              <TableCell>{actions(transaction)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
