import { z } from "zod";

export const logEventSchema = z.object({
  interviewId: z
    .string()
    .min(1, "Interview ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Interview ID format"),
  candidateId: z
    .string()
    .min(1, "Candidate ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Candidate ID format"),
  eventType: z.enum([
    "TAB_SWITCH",
    "WINDOW_BLUR",
    "COPY",
    "PASTE",
    "FULLSCREEN_EXIT",
    "DEVTOOLS_OPEN",
    "NO_FACE",
    "MULTIPLE_FACE",
    "FACE_AWAY",
  ]),
});
