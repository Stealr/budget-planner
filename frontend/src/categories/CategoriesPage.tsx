import { useState, type FormEvent } from 'react';
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
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCreateCategoryMutation, useGetCategoriesQuery, type CategoryType } from './api';

const typeLabels: Record<CategoryType, string> = { EXPENSE: 'Расход', INCOME: 'Доход' };

export default function CategoriesPage() {
  const categories = useGetCategoriesQuery();
  const [createCategory, creation] = useCreateCategoryMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');

  function openForm() {
    creation.reset();
    setName('');
    setType('EXPENSE');
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || creation.isLoading) return;
    try {
      await createCategory({ name: name.trim(), type }).unwrap();
      setOpen(false);
    } catch {
      // RTK Query
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
          Категории
        </Typography>
        <Button variant="contained" onClick={openForm}>
          Создать категорию
        </Button>
      </Stack>
      {categories.isLoading && <CircularProgress size={24} aria-label="Загрузка категорий" />}
      {categories.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void categories.refetch()}>Повторить</Button>}
        >
          Не удалось загрузить категории.
        </Alert>
      )}
      {categories.data && (
        <Card>
          {categories.data.length ? (
            <List aria-label="Категории операций">
              {categories.data.map(({ id, name, type }) => (
                <ListItem key={id}>
                  <ListItemText primary={name} secondary={typeLabels[type]} />
                </ListItem>
              ))}
            </List>
          ) : (
            <CardContent>Категорий пока нет. Создайте первую категорию.</CardContent>
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
        aria-labelledby="category-title"
      >
        <Box component="form" onSubmit={submit}>
          <DialogTitle id="category-title">Создать категорию</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {creation.isError && (
                <Alert severity="error">
                  Не удалось создать категорию. Проверьте название и попробуйте снова.
                </Alert>
              )}
              <TextField
                label="Название"
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                select
                id="category-type"
                label="Тип"
                value={type}
                onChange={(event) =>
                  setType(event.target.value === 'INCOME' ? 'INCOME' : 'EXPENSE')
                }
              >
                <MenuItem value="EXPENSE">Расход</MenuItem>
                <MenuItem value="INCOME">Доход</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={creation.isLoading}>
              Отмена
            </Button>
            <Button variant="contained" type="submit" disabled={!name.trim() || creation.isLoading}>
              {creation.isLoading ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
