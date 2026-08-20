import { z } from 'zod';

export const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
        newPassword: z
            .string()
            .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
            .regex(/[A-Z]/, 'Mật khẩu mới phải có ít nhất một chữ hoa')
            .regex(/[0-9]/, 'Mật khẩu mới phải có ít nhất một chữ số')
            .regex(/[@#$%^&+=!]/, 'Mật khẩu mới phải có ít nhất một ký tự đặc biệt (@#$%^&+=!)'),
        confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
        message: 'Mật khẩu xác nhận không trùng khớp',
        path: ['confirmPassword'],
    });
