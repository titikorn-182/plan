import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("กรุณากรอกอีเมลให้ถูกต้อง").trim().toLowerCase(),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  next: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.email("กรุณากรอกอีเมลให้ถูกต้อง").trim().toLowerCase(),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export function safeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  // Browsers normalize backslashes and strip control characters from URLs.
  if (value.includes("\\") || [...value].some((character) => character.charCodeAt(0) < 32)) {
    return fallback;
  }
  return value;
}
