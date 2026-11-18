import { z } from 'zod';

export const VIETNAMESE_PHONE_REGEX = /^0(?:3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

const nullablePhone = z
    .string()
    .trim()
    .nullable()
    .refine(
        (value) => value === null || value === '' || VIETNAMESE_PHONE_REGEX.test(value),
        'Số điện thoại Việt Nam không đúng định dạng (ví dụ: 0353999798)',
    );

export const userProfileSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
        .max(50, 'Tên đăng nhập không được quá 50 ký tự')
        .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới và gạch ngang'),
    email: z.string().trim().email('Email không đúng định dạng').max(100),
    firstName: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').max(50, 'Tên không được quá 50 ký tự'),
    lastName: z.string().trim().min(2, 'Họ phải có ít nhất 2 ký tự').max(50, 'Họ không được quá 50 ký tự'),
    phone: nullablePhone,
});

export type UserProfileForm = z.infer<typeof userProfileSchema>;
