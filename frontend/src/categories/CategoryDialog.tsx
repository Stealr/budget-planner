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
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiErrorMessage } from '../shared/apiError';
import { useCreateCategoryMutation, useUpdateCategoryMutation, type Category } from './api';

const schema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(100, 'Максимум 100 символов'),
  type: z.enum(['INCOME', 'EXPENSE']),
});
type Fields = z.input<typeof schema>;

export default function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [create, creation] = useCreateCategoryMutation();
  const [update, updating] = useUpdateCategoryMutation();
  const mutation = category ? updating : creation;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '', type: category?.type ?? 'EXPENSE' },
  });
  const busy = isSubmitting || mutation.isLoading;
  async function submit(body: Fields) {
    try {
      if (category) await update({ id: category.id, body }).unwrap();
      else await create(body).unwrap();
      onSaved();
    } catch {
      // Keep the form values so the user can correct the conflict or retry.
    }
  }
  return (
    <Dialog
      open
      fullWidth
      maxWidth="xs"
      aria-labelledby="category-title"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Box component="form" noValidate onSubmit={handleSubmit(submit)}>
        <DialogTitle id="category-title">
          {category ? 'Изменить категорию' : 'Создать категорию'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {mutation.isError && (
              <Alert severity="error">
                {apiErrorMessage(
                  mutation.error,
                  'Не удалось сохранить категорию. Попробуйте снова.',
                )}
              </Alert>
            )}
            <TextField
              id="category-name"
              label="Название"
              autoFocus
              disabled={busy}
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  {...field}
                  id="category-type"
                  label="Тип категории"
                  disabled={busy}
                >
                  <MenuItem value="EXPENSE">Расход</MenuItem>
                  <MenuItem value="INCOME">Доход</MenuItem>
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
