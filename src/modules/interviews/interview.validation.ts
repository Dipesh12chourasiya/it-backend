import { z } from "zod";

export const createInterviewSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters long"),
  description: z
    .string()
    .min(1, "Description is required")
    .min(5, "Description must be at least 5 characters long"),
  startTime: z
    .string()
    .min(1, "Start time is required")
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start time format" }),
  endTime: z
    .string()
    .min(1, "End time is required")
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end time format" }),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

export const updateInterviewSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start time format" })
    .optional(),
  endTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end time format" })
    .optional(),
  status: z.enum(["scheduled", "active", "completed"]).optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

export const joinInterviewSchema = z.object({
  interviewCode: z
    .string()
    .min(1, "Interview code is required")
    .length(6, "Interview code must be exactly 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Interview code must be alphanumeric"),
});
