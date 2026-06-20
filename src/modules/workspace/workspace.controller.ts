import { Request, Response } from "express";
import {
  getOrCreateWorkspace,
  getWorkspace,
  updateWorkspace,
} from "./workspace.service";
import { AppError } from "../../utils/errors";

/**
 * GET /api/v1/workspace/:interviewId
 * Returns workspace data for the interview
 */
export const get = async (req: Request, res: Response): Promise<void> => {
  try {
    const interviewId = req.params.interviewId as string;

    // Verify user has access to this interview
    const user = (req as any).user;
    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const workspace = await getOrCreateWorkspace(interviewId);

    res.status(200).json({
      success: true,
      data: {
        language: workspace.language,
        code: workspace.code,
        whiteboardData: workspace.whiteboardData,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * PUT /api/v1/workspace/:interviewId
 * Updates workspace content
 */
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const interviewId = req.params.interviewId as string;
    const { language, code, whiteboardData } = req.body;

    // Verify user has access to this interview
    const user = (req as any).user;
    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const workspace = await updateWorkspace(interviewId, {
      language,
      code,
      whiteboardData,
    });

    res.status(200).json({
      success: true,
      data: {
        language: workspace.language,
        code: workspace.code,
        whiteboardData: workspace.whiteboardData,
      },
    });
  } catch (error) {
    throw error;
  }
};
