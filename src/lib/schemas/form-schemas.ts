import { z } from 'zod'
import { QUOTE_MAX_LENGTH } from '../../types/database'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginValues = z.infer<typeof LoginSchema>

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(1),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>

export const PlayerFormSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
})

export type PlayerFormValues = z.infer<typeof PlayerFormSchema>

export const QuoteSchema = z.object({
  text: z.string().min(1).max(QUOTE_MAX_LENGTH),
})

export type QuoteValues = z.infer<typeof QuoteSchema>

export const RacketFormSchema = z.object({
  brandChoice: z.string(),
  customBrand: z.string().optional(),
  real_name: z.string().min(1).max(60),
  nickname: z.string().optional(),
  mascot_id: z.string().nullable(),
})

export type RacketFormValues = z.infer<typeof RacketFormSchema>
