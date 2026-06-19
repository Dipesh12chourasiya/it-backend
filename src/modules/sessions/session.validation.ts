import { z } from "zod";

export const startSessionSchema = z.object({
  interviewId: z
    .string()
    .min(1, "Interview ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Interview ID format"),
});

export const endSessionSchema = z.object({
  sessionId: z
    .string()
    .min(1, "Session ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Session ID format"),
});
