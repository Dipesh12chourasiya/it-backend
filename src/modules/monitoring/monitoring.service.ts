import mongoose from "mongoose";
import MonitoringEvent, { IMonitoringEvent } from "./monitoring.model";
import Interview from "../interviews/interview.model";
import User from "../auth/auth.model";
import { AppError } from "../../utils/errors";
import { updateTrustScore } from "../trust-score/trust-score.service";
import { emitTrustScoreUpdate } from "../../socket/socket.server";

/**
 * Log a monitoring event for a candidate during an interview
 */
export const createEvent = async (
  interviewId: string,
  candidateId: string,
  eventType: IMonitoringEvent["eventType"]
): Promise<IMonitoringEvent> => {
  // Validate interview exists
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  // Validate candidate exists
  const candidate = await User.findById(candidateId);
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }

  const event = await MonitoringEvent.create({
    interviewId: new mongoose.Types.ObjectId(interviewId),
    candidateId: new mongoose.Types.ObjectId(candidateId),
    eventType,
    timestamp: new Date(),
  });

  try {
    // Automatically update the trust score in CandidateSession and persist it
    const newScore = await updateTrustScore(interviewId, candidateId, eventType);

    // Emit live trust score update to recruiters in the room
    emitTrustScoreUpdate(interviewId, {
      candidateId,
      score: newScore,
      eventType,
    });
  } catch (err) {
    console.error("[Monitoring Service] Failed to update trust score:", err);
  }

  return event;
};

/**
 * Get all monitoring events for a given interview
 */
export const getEventsForInterview = async (
  interviewId: string
): Promise<IMonitoringEvent[]> => {
  const events = await MonitoringEvent.find({ interviewId })
    .populate("candidateId", "name email role")
    .sort({ timestamp: -1 });

  return events;
};
