import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { authErrorMessage, login, registerAccount } from './api';
import { sessionStarted } from './authSlice';
import { safeReturnTo } from './returnTo';
import { loginSchema, registrationSchema, type AccountFields } from './validation';

export default function AccountPage({ registration = false }: { registration?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { session, reason } = useAppSelector((state) => state.auth);
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState('');
  const state = location.state as { from?: unknown; email?: unknown; registered?: boolean } | null;
  const from = safeReturnTo(state?.from);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFields>({
    resolver: zodResolver(registration ? registrationSchema : loginSchema),
    defaultValues: { email: typeof state?.email === 'string' ? state.email : '', password: '' },
  });

  useEffect(() => () => request.current?.abort(), []);

  async function submit(values: AccountFields) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    const credentials = { email: values.email.toLowerCase(), password: values.password };
    try {
      if (registration) {
        const account = await registerAccount(credentials, controller.signal);
        if (!controller.signal.aborted) {
          navigate('/login', {
            replace: true,
            state: { email: account.email, registered: true, from },
          });
        }
      } else {
        const result = await login(credentials, controller.signal);
        if (!controller.signal.aborted) {
          dispatch(sessionStarted(result));
          navigate(from, { replace: true });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(authErrorMessage(error, registration));
    }
  }

  if (session) return <Navigate to={from} replace />;

  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack
            component="form"
            noValidate
            onSubmit={(event) => void handleSubmit(submit)(event)}
            spacing={2}
          >
            <Typography variant="overline" color="primary.main">
              СтудБюджет
            </Typography>
            <Typography component="h1" variant="h1">
              {registration ? 'Создать аккаунт' : 'Вход'}
            </Typography>
            {!registration && state?.registered && (
              <Alert severity="success">Аккаунт создан. Войдите с вашим паролем.</Alert>
            )}
            {!registration && reason === 'expired' && (
              <Alert severity="info">Сессия истекла. Войдите снова.</Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              id="account-email"
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              disabled={isSubmitting}
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              id="account-password"
              label="Пароль"
              type="password"
              autoComplete={registration ? 'new-password' : 'current-password'}
              required
              disabled={isSubmitting}
              {...register('password')}
              error={!!errors.password}
              helperText={
                errors.password?.message ??
                (registration ? 'От 8 символов, до 72 байт UTF-8' : undefined)
              }
            />
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Отправка…' : registration ? 'Создать аккаунт' : 'Войти'}
            </Button>
            <Button
              component={Link}
              to={registration ? '/login' : '/register'}
              state={{ from }}
              disabled={isSubmitting}
            >
              {registration ? 'Перейти ко входу' : 'Зарегистрироваться'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
