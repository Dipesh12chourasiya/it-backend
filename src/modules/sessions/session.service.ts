import mongoose from "mongoose";
import Session, { ISession } from "./session.model";
import Interview from "../interviews/interview.model";
import User from "../auth/auth.model";
import { AppError } from "../../utils/errors";

export const startSession = async (
  interviewId: string,
  candidateId: string
): Promise<ISession> => {
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new AppError("Invalid interview ID format", 400);
  }

  // 1. Validate Interview exists
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new AppError("Interview session not found", 404);
  }

  // 2. Validate Candidate exists (from auth middleware)
  const candidate = await User.findById(candidateId);
  if (!candidate) {
    throw new AppError("Candidate user not found", 404);
  }

  // 3. Enforce business rule: One candidate cannot create multiple active sessions for same interview
  const existingActiveSession = await Session.findOne({
    interviewId: new mongoose.Types.ObjectId(interviewId),
    candidateId: new mongoose.Types.ObjectId(candidateId),
    status: "active",
  });

  if (existingActiveSession) {
    // If active session already exists, we return it to resume the session instead of failing.
    // This makes the frontend resume flow extremely robust in case of accidental refresh!
    return existingActiveSession;
  }

  // 4. Create new session (automatically active)
  const newSession = await Session.create({
    interviewId: new mongoose.Types.ObjectId(interviewId),
    candidateId: new mongoose.Types.ObjectId(candidateId),
    joinedAt: new Date(),
    status: "active",
  });

  return newSession;
};

export const endSession = async (
  sessionId: string,
  candidateId: string
): Promise<ISession> => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("Invalid session ID format", 400);
  }

  const session = await Session.findOne({
    _id: new mongoose.Types.ObjectId(sessionId),
    candidateId: new mongoose.Types.ObjectId(candidateId),
  });

  if (!session) {
    throw new AppError("Session not found or unauthorized", 404);
  }

  session.leftAt = new Date();
  session.status = "left";
  await session.save();

  return session;
};

export const getSessionDetails = async (
  sessionId: string,
  userId: string
): Promise<ISession> => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("Invalid session ID format", 400);
  }

  // Allow recruiter or the matching candidate to view details
  const session = await Session.findById(sessionId)
    .populate("interviewId")
    .populate("candidateId", "name email role");

  if (!session) {
    throw new AppError("Session not found", 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (
    user.role !== "recruiter" &&
    session.candidateId._id.toString() !== userId
  ) {
    throw new AppError("Not authorized to view this session", 403);
  }

  return session;
};

// Helper to look up active session for candidate and interview
export const getActiveSessionForInterview = async (
  interviewId: string,
  candidateId: string
): Promise<ISession | null> => {
  return Session.findOne({
    interviewId: new mongoose.Types.ObjectId(interviewId),
    candidateId: new mongoose.Types.ObjectId(candidateId),
    status: "active",
  }).populate("interviewId");
};
