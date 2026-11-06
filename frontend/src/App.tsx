import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

const TransactionsPage = lazy(() => import('./transactions/TransactionsPage'));
const WorkspaceLayout = lazy(() => import('./WorkspaceLayout'));

function SectionPage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { to: string; label: string };
}) {
  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        {action && (
          <Button component={Link} to={action.to} variant="contained">
            {action.label}
          </Button>
        )}
      </Stack>
      <Card>
        <CardContent>
          <Typography color="text.secondary">{description}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

function AccountPage({ registration = false }: { registration?: boolean }) {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="overline" color="primary.main">
              СтудБюджет
            </Typography>
            <Typography component="h1" variant="h1">
              {registration ? 'Создать аккаунт' : 'Вход'}
            </Typography>
            <Typography color="text.secondary">Экран будет подключён к API аккаунта.</Typography>
            <Button component={Link} to={registration ? '/login' : '/register'} variant="outlined">
              {registration ? 'Перейти ко входу' : 'Зарегистрироваться'}
            </Button>
            <Button component={Link} to="/">
              К дашборду
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AccountPage />} />
      <Route path="/register" element={<AccountPage registration />} />
      <Route
        element={
          <Suspense
            fallback={
              <Box role="status" sx={{ p: 2 }}>
                Загрузка…
              </Box>
            }
          >
            <WorkspaceLayout />
          </Suspense>
        }
      >
        <Route
          index
          element={<SectionPage title="Дашборд" description="Обзор бюджета за выбранный период." />}
        />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route
          path="transactions/import"
          element={
            <SectionPage
              title="Импорт выписки"
              description="Загрузка файла, проверка операций и подтверждение импорта."
              action={{ to: '/transactions', label: 'К операциям' }}
            />
          }
        />
        <Route
          path="categories"
          element={
            <SectionPage
              title="Категории"
              description="Стандартные и собственные категории операций."
            />
          }
        />
        <Route
          path="limits"
          element={
            <SectionPage title="Лимиты" description="Расходы по категориям за текущий месяц." />
          }
        />
        <Route
          path="settings"
          element={
            <SectionPage
              title="Настройки аккаунта"
              description="Управление аккаунтом и его данными."
            />
          }
        />
        <Route
          path="*"
          element={
            <SectionPage
              title="Страница не найдена"
              description="Проверьте адрес или вернитесь к обзору бюджета."
              action={{ to: '/', label: 'К дашборду' }}
            />
          }
        />
      </Route>
    </Routes>
  );
}
