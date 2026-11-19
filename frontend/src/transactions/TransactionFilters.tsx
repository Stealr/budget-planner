import { Button, Card, CardContent, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category } from '../categories/api';
import { categoryTypeLabels } from '../shared/format';
import { emptyFilters, filtersSchema, type FilterFields, type readFilters } from './filters';

export default function TransactionFilters({
  values,
  categories,
  onApply,
}: {
  values: ReturnType<typeof readFilters>;
  categories: Category[];
  onApply: (fields: FilterFields) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FilterFields>({
    resolver: zodResolver(filtersSchema),
    values: {
      ...values,
      type: values.type === 'INCOME' || values.type === 'EXPENSE' ? values.type : '',
    },
  });
  return (
    <Card>
      <CardContent>
        <Stack
          component="form"
          aria-label="Фильтры операций"
          noValidate
          spacing={2}
          onSubmit={handleSubmit(onApply)}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              id="filter-from"
              label="Дата с"
              type="date"
              {...register('dateFrom')}
              error={!!errors.dateFrom}
              helperText={errors.dateFrom?.message}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="filter-to"
              label="Дата по"
              type="date"
              {...register('dateTo')}
              error={!!errors.dateTo}
              helperText={errors.dateTo?.message}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  {...field}
                  id="filter-type"
                  label="Тип"
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  onChange={(event) => {
                    field.onChange(event);
                    const category = categories.find(
                      (item) => String(item.id) === getValues('categoryId'),
                    );
                    if (event.target.value && category && category.type !== event.target.value)
                      setValue('categoryId', '');
                  }}
                >
                  <MenuItem value="">Все типы</MenuItem>
                  <MenuItem value="EXPENSE">Расход</MenuItem>
                  <MenuItem value="INCOME">Доход</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="categoryId"
              control={control}
              render={({ field: { ref, ...field } }) => (
                <TextField
                  select
                  {...field}
                  inputRef={ref}
                  id="filter-category"
                  label="Категория фильтра"
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                >
                  <MenuItem value="">Все категории</MenuItem>
                  {field.value && !categories.some(({ id }) => String(id) === field.value) && (
                    <MenuItem
                      value={field.value}
                      sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                    >
                      Категория #{field.value} (недоступна)
                    </MenuItem>
                  )}
                  {categories.map(({ id, name, type, archivedAt }) => (
                    <MenuItem
                      key={id}
                      value={String(id)}
                      sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                    >
                      {name} · {categoryTypeLabels[type]}
                      {archivedAt ? ' (архив)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button type="submit" variant="outlined">
              Применить фильтры
            </Button>
            <Button
              onClick={() => {
                reset(emptyFilters);
                onApply(emptyFilters);
              }}
            >
              Сбросить фильтры
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
