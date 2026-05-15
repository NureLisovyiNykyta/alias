import { z } from "zod";

export const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const profileSchema = z.object({
  nickname: z.string().min(2, "Display name must be at least 2 characters").optional().or(z.literal('')),
});