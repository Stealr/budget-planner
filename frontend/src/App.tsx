import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AccountPage from './auth/AccountPage';
import RequireAuth from './auth/RequireAuth';
import SessionLifecycle from './auth/SessionLifecycle';

const CategoriesPage = lazy(() => import('./categories/CategoriesPage'));
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

export default function App() {
  return (
    <>
      <SessionLifecycle />
      <Routes>
        <Route path="/login" element={<AccountPage key="login" />} />
        <Route path="/register" element={<AccountPage key="register" registration />} />
        <Route element={<RequireAuth />}>
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
              element={
                <SectionPage title="Дашборд" description="Обзор бюджета за выбранный период." />
              }
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
            <Route path="categories" element={<CategoriesPage />} />
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
        </Route>
      </Routes>
    </>
  );
}
