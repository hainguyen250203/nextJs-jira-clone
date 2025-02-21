import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    // code:z.number(),
});

export const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email(),
    password: z.string().trim().min(8, "Password must be at least 8 characters").max(256, "Password must be less than 256 characters"),
});