import Interview, { IInterview } from "./interview.model";
import { AppError } from "../../utils/errors";
import mongoose from "mongoose";

/**
 * Generate a unique 6-character alphanumeric uppercase code
 */
const generateUniqueCode = async (): Promise<string> => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check if code already exists in DB
    const existing = await Interview.findOne({ interviewCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

export const createInterview = async (
  data: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
  },
  recruiterId: string
): Promise<IInterview> => {
  const interviewCode = await generateUniqueCode();

  const interview = await Interview.create({
    title: data.title,
    description: data.description,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    recruiterId: new mongoose.Types.ObjectId(recruiterId),
    interviewCode,
    status: "scheduled",
  });

  return interview;
};

export const getAllInterviews = async (
  recruiterId: string
): Promise<IInterview[]> => {
  return Interview.find({ recruiterId: new mongoose.Types.ObjectId(recruiterId) }).sort({ createdAt: -1 });
};

export const getInterviewById = async (
  id: string,
  recruiterId: string
): Promise<IInterview> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findOne({
    _id: new mongoose.Types.ObjectId(id),
    recruiterId: new mongoose.Types.ObjectId(recruiterId),
  });

  if (!interview) {
    throw new AppError("Interview not found or unauthorized", 404);
  }

  return interview;
};

export const updateInterview = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    status?: "scheduled" | "active" | "completed";
  },
  recruiterId: string
): Promise<IInterview> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const interview = await Interview.findOne({
    _id: new mongoose.Types.ObjectId(id),
    recruiterId: new mongoose.Types.ObjectId(recruiterId),
  });

  if (!interview) {
    throw new AppError("Interview not found or unauthorized", 404);
  }

  if (data.title !== undefined) interview.title = data.title;
  if (data.description !== undefined) interview.description = data.description;
  if (data.startTime !== undefined) interview.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) interview.endTime = new Date(data.endTime);
  if (data.status !== undefined) interview.status = data.status;

  await interview.save();
  return interview;
};

export const deleteInterview = async (
  id: string,
  recruiterId: string
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  const result = await Interview.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    recruiterId: new mongoose.Types.ObjectId(recruiterId),
  });

  if (result.deletedCount === 0) {
    throw new AppError("Interview not found or unauthorized", 404);
  }
};

export const joinInterviewByCode = async (
  interviewCode: string
): Promise<IInterview> => {
  const codeFormatted = interviewCode.toUpperCase().trim();
  const interview = await Interview.findOne({ interviewCode: codeFormatted });

  if (!interview) {
    throw new AppError("Invalid Interview Code. No such interview exists.", 404);
  }

  if (interview.status === "completed") {
    throw new AppError("This interview has already completed.", 400);
  }

  // If start time is in the future and status is scheduled, we can still allow them to view it but show scheduled message
  return interview;
};
