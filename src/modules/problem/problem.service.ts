import Interview from "../interviews/interview.model";
import { AppError } from "../../utils/errors";
import mongoose from "mongoose";

// ── Get current problem ────────────────────────────────────────────────
export const getCurrentProblem = async (
  interviewId: string
): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findById(interviewId).select(
    "currentProblem recruiterId"
  );

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  return interview.currentProblem || null;
};

// ── Create problem ─────────────────────────────────────────────────────
export const createProblem = async (
  interviewId: string,
  data: {
    title: string;
    description: string;
    examples?: string;
    constraints?: string;
  }
): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findById(interviewId);

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  if (interview.currentProblem) {
    throw new AppError(
      "A problem already exists. Update or delete it first.",
      400
    );
  }

  const now = new Date();
  interview.currentProblem = {
    title: data.title,
    description: data.description,
    examples: data.examples,
    constraints: data.constraints,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await interview.save();
  return interview.currentProblem;
};

// ── Update problem ─────────────────────────────────────────────────────
export const updateProblem = async (
  interviewId: string,
  data: {
    title?: string;
    description?: string;
    examples?: string;
    constraints?: string;
  }
): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findById(interviewId);

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  if (!interview.currentProblem) {
    throw new AppError("No active problem to update", 404);
  }

  const problem = interview.currentProblem;

  if (data.title !== undefined) problem.title = data.title;
  if (data.description !== undefined) problem.description = data.description;
  if (data.examples !== undefined) problem.examples = data.examples;
  if (data.constraints !== undefined) problem.constraints = data.constraints;

  problem.version += 1;
  problem.updatedAt = new Date();

  interview.markModified("currentProblem");
  await interview.save();

  return interview.currentProblem;
};

// ── Delete problem ─────────────────────────────────────────────────────
export const deleteProblem = async (
  interviewId: string
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findById(interviewId);

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  if (!interview.currentProblem) {
    throw new AppError("No active problem to delete", 404);
  }

  interview.currentProblem = undefined;
  interview.markModified("currentProblem");
  await interview.save();
};

// ── Validate recruiter owns interview ──────────────────────────────────
export const validateRecruiterOwnership = async (
  interviewId: string,
  recruiterId: string
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findById(interviewId).select(
    "recruiterId"
  );

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  if (interview.recruiterId.toString() !== recruiterId) {
    throw new AppError("Unauthorized: You do not own this interview", 403);
  }
};
