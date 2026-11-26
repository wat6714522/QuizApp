import { z } from "zod";

// Emails are always stored and compared in lowercase.
const email = z.string().trim().toLowerCase().email("Invalid Email Address");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email,
  password: z.string().min(10, "Password is required"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(10, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(10, "Password is required"),
  newPassword: z.string().min(10, "New Password must be at least 8 character"),
});
