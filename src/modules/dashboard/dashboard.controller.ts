import { Request, Response, NextFunction } from "express";
import { getInterviewDashboard, getCandidateDashboard } from "./dashboard.service";

/**
 * GET /api/v1/dashboard/interview/:interviewId
 * Full dashboard data for an interview session
 */
export const getInterviewDashboardController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const interviewId = req.params.interviewId as string;
    const data = await getInterviewDashboard(interviewId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/candidate/:candidateId
 * Detailed dashboard data for a single candidate
 */
export const getCandidateDashboardController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const candidateId = req.params.candidateId as string;
    const data = await getCandidateDashboard(candidateId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
