import { z } from 'zod';

const password = z
  .string()
  .min(1, 'Введите пароль')
  .refine((value) => !value.includes('\0'), 'Пароль не должен содержать нулевой символ')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Пароль должен занимать не более 72 байт UTF-8',
  );

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, 'Email должен содержать не более 254 символов')
    .email('Введите корректный email'),
  password,
});

export const registrationSchema = loginSchema.extend({
  password: password.refine((value) => value.length >= 8, 'Минимум 8 символов'),
});

export type AccountFields = z.input<typeof loginSchema>;
