import { Alert, AlertTitle, Typography } from '@mui/material';
import { formatMoney } from '../shared/format';
import { formatMonth, formatPercent } from './format';
import type { LimitWarning } from './types';

export default function LimitWarningAlert({
  warning,
  onClose,
}: {
  warning: LimitWarning;
  onClose?: () => void;
}) {
  return (
    <Alert
      severity={warning.level === 'EXCEEDED' ? 'error' : 'warning'}
      onClose={onClose}
      closeText="Закрыть предупреждение"
      sx={{ overflowWrap: 'anywhere' }}
    >
      <AlertTitle>
        {warning.level === 'EXCEEDED' ? 'Лимит превышен' : 'Достигнут порог 80% лимита'}
      </AlertTitle>
      <Typography component="div">
        {warning.categoryName} · {formatMonth(warning.month)}
      </Typography>
      <Typography component="div">
        Потрачено {formatMoney(warning.spentAmount)} из {formatMoney(warning.limitAmount)} (
        {formatPercent(warning.usagePercent)}).
      </Typography>
    </Alert>
  );
}
