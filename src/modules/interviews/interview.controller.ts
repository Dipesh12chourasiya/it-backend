import { Request, Response } from "express";
import * as interviewService from "./interview.service";
import {
  createInterviewSchema,
  updateInterviewSchema,
  joinInterviewSchema,
} from "./interview.validation";

export const create = async (req: Request, res: Response): Promise<void> => {
  const validated = createInterviewSchema.parse(req.body);
  const recruiterId = (req as any).user._id;

  const interview = await interviewService.createInterview(validated, recruiterId);

  res.status(201).json({
    success: true,
    message: "Interview created successfully",
    data: interview,
  });
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  const recruiterId = (req as any).user._id;
  const interviews = await interviewService.getAllInterviews(recruiterId);

  res.status(200).json({
    success: true,
    data: interviews,
  });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const recruiterId = (req as any).user._id;
  const interview = await interviewService.getInterviewById(req.params.id as string, recruiterId);

  res.status(200).json({
    success: true,
    data: interview,
  });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const validated = updateInterviewSchema.parse(req.body);
  const recruiterId = (req as any).user._id;

  const interview = await interviewService.updateInterview(req.params.id as string, validated, recruiterId);

  res.status(200).json({
    success: true,
    message: "Interview updated successfully",
    data: interview,
  });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const recruiterId = (req as any).user._id;
  await interviewService.deleteInterview(req.params.id as string, recruiterId);

  res.status(200).json({
    success: true,
    message: "Interview deleted successfully",
  });
};

export const join = async (req: Request, res: Response): Promise<void> => {
  const validated = joinInterviewSchema.parse(req.body);
  const interview = await interviewService.joinInterviewByCode(validated.interviewCode);

  res.status(200).json({
    success: true,
    message: "Joined interview successfully",
    data: interview,
  });
};
