import { useId, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export default function ConfirmActionDialog({
  title,
  description,
  label,
  busy,
  error,
  destructive = false,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  label: string;
  busy: boolean;
  error?: string;
  destructive?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Dialog
      open
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId} sx={{ overflowWrap: 'anywhere' }}>
          {description}
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {children}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button onClick={onClose} disabled={busy}>
          Отмена
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy}
          color={destructive ? 'error' : 'primary'}
          variant="contained"
        >
          {busy ? 'Сохранение…' : label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
