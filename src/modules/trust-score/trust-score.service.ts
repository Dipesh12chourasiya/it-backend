import Session from "../sessions/session.model";
import { AppError } from "../../utils/errors";

const SCORE_DEDUCTIONS: Record<string, number> = {
  TAB_SWITCH: 5,
  WINDOW_BLUR: 3,
  COPY: 10,
  PASTE: 15,
  FULLSCREEN_EXIT: 10,
  DEVTOOLS_OPEN: 20,
};

/**
 * Calculate the new trust score for a candidate's session based on the logged event type
 * and persist the updated score in MongoDB.
 */
export const updateTrustScore = async (
  interviewId: string,
  candidateId: string,
  eventType: string
): Promise<number> => {
  const session = await Session.findOne({
    interviewId,
    candidateId,
    status: "active",
  });

  if (!session) {
    // Fallback to update the most recent session if not explicitly marked active
    const lastSession = await Session.findOne({
      interviewId,
      candidateId,
    }).sort({ createdAt: -1 });

    if (!lastSession) {
      throw new AppError("Active candidate session not found, sir.", 404);
    }

    const deduction = SCORE_DEDUCTIONS[eventType] || 0;
    const newScore = Math.max(0, lastSession.score - deduction);
    lastSession.score = newScore;
    await lastSession.save();
    return newScore;
  }

  const deduction = SCORE_DEDUCTIONS[eventType] || 0;
  const newScore = Math.max(0, session.score - deduction);
  session.score = newScore;
  await session.save();

  return newScore;
};
