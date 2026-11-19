import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { apiErrorMessage, apiErrorStatus } from '../shared/apiError';
import { categoryTypeLabels } from '../shared/format';
import ConfirmActionDialog from '../shared/ConfirmActionDialog';
import {
  useArchiveCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  type Category,
} from './api';
import CategoryDialog from './CategoryDialog';

type Confirmation = { category: Category; action: 'archive' | 'delete' };

export default function CategoriesPage() {
  const [params, setParams] = useSearchParams();
  const includeArchived = params.get('includeArchived') === 'true';
  const categories = useGetCategoriesQuery(includeArchived);
  const [editor, setEditor] = useState<{ category: Category | null } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [archive, archiving] = useArchiveCategoryMutation();
  const [remove, removal] = useDeleteCategoryMutation();
  const [notice, setNotice] = useState('');
  const mutation = confirmation?.action === 'archive' ? archiving : removal;

  function ask(next: Confirmation) {
    archiving.reset();
    removal.reset();
    setConfirmation(next);
  }
  async function confirmAction() {
    if (!confirmation || mutation.isLoading) return;
    try {
      if (confirmation.action === 'archive') await archive(confirmation.category.id).unwrap();
      else await remove(confirmation.category.id).unwrap();
      setNotice(
        confirmation.action === 'archive'
          ? 'Категория архивирована. История операций сохранена.'
          : 'Категория удалена.',
      );
      setConfirmation(null);
    } catch {
      // A conflict remains in the dialog and can lead to archive instead of deletion.
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
        <Button variant="contained" onClick={() => setEditor({ category: null })}>
          Создать категорию
        </Button>
      </Stack>
      {notice && (
        <Alert severity="success" closeText="Закрыть" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      <FormControlLabel
        label="Показывать архивные"
        control={
          <Switch
            checked={includeArchived}
            onChange={(_, checked) => {
              const next = new URLSearchParams(params);
              if (checked) next.set('includeArchived', 'true');
              else next.delete('includeArchived');
              setParams(next);
            }}
          />
        }
      />
      {categories.isFetching && <CircularProgress size={24} aria-label="Загрузка категорий" />}
      {categories.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void categories.refetch()}>Повторить</Button>}
        >
          {apiErrorMessage(categories.error, 'Не удалось загрузить категории.')}
        </Alert>
      )}
      {categories.currentData && (
        <Card aria-busy={categories.isFetching}>
          {categories.currentData.length ? (
            <List aria-label="Категории операций">
              {categories.currentData.map((category) => (
                <ListItem key={category.id} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <ListItemText
                    primary={category.name}
                    secondary={categoryTypeLabels[category.type]}
                    sx={{ minWidth: 120, overflowWrap: 'anywhere' }}
                  />
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    {category.standard && <Chip label="Стандартная" size="small" />}
                    {category.archivedAt && <Chip label="В архиве" size="small" />}
                    {!category.standard && (
                      <>
                        <IconButton
                          aria-label={`Изменить категорию ${category.name}`}
                          onClick={() => setEditor({ category })}
                        >
                          <EditOutlinedIcon />
                        </IconButton>
                        {!category.archivedAt && (
                          <IconButton
                            aria-label={`Архивировать категорию ${category.name}`}
                            onClick={() => ask({ category, action: 'archive' })}
                          >
                            <ArchiveOutlinedIcon />
                          </IconButton>
                        )}
                        <IconButton
                          aria-label={`Удалить категорию ${category.name}`}
                          onClick={() => ask({ category, action: 'delete' })}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </ListItem>
              ))}
            </List>
          ) : (
            <CardContent>Категорий пока нет. Создайте первую категорию.</CardContent>
          )}
        </Card>
      )}
      {editor && (
        <CategoryDialog
          category={editor.category}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setNotice(editor.category ? 'Категория сохранена.' : 'Категория создана.');
            setEditor(null);
          }}
        />
      )}
      {confirmation && (
        <ConfirmActionDialog
          title={
            confirmation.action === 'archive' ? 'Архивировать категорию?' : 'Удалить категорию?'
          }
          description={
            confirmation.action === 'archive'
              ? `«${confirmation.category.name}» больше не будет доступна для новых операций и лимитов. История и существующие лимиты сохранятся.`
              : `«${confirmation.category.name}» будет удалена. Удаление возможно, только если у категории нет операций и лимитов.`
          }
          label={confirmation.action === 'archive' ? 'Архивировать' : 'Удалить'}
          destructive={confirmation.action === 'delete'}
          busy={mutation.isLoading}
          error={
            mutation.isError
              ? apiErrorMessage(mutation.error, 'Не удалось изменить категорию. Попробуйте снова.')
              : undefined
          }
          onClose={() => setConfirmation(null)}
          onConfirm={() => void confirmAction()}
        >
          {confirmation.action === 'delete' &&
            apiErrorStatus(removal.error) === 409 &&
            !confirmation.category.archivedAt && (
              <Button
                sx={{ mt: 1 }}
                onClick={() => ask({ category: confirmation.category, action: 'archive' })}
              >
                Архивировать вместо удаления
              </Button>
            )}
        </ConfirmActionDialog>
      )}
    </Stack>
  );
}
