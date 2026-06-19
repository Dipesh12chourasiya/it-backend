import { Request, Response, NextFunction } from "express";
import { startSessionSchema, endSessionSchema } from "./session.validation";
import {
  startSession,
  endSession,
  getSessionDetails,
  getActiveSessionForInterview,
} from "./session.service";
import { AppError } from "../../utils/errors";

export const start = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = startSessionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(validation.error.issues[0].message, 400);
    }

    const { interviewId } = validation.data;
    const candidateId = req.user._id.toString();

    const session = await startSession(interviewId, candidateId);

    res.status(201).json({
      success: true,
      message: "Session created and started successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const end = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = endSessionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(validation.error.issues[0].message, 400);
    }

    const { sessionId } = validation.data;
    const candidateId = req.user._id.toString();

    const session = await endSession(sessionId, candidateId);

    res.status(200).json({
      success: true,
      message: "Session ended successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const session = await getSessionDetails(id, userId);

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const getActive = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { interviewId } = req.params;
    const candidateId = req.user._id.toString();

    const session = await getActiveSessionForInterview(interviewId, candidateId);

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};
