import mongoose from "mongoose";
import Session from "../sessions/session.model";
import MonitoringEvent from "../monitoring/monitoring.model";
import Interview from "../interviews/interview.model";
import User from "../auth/auth.model";
import { AppError } from "../../utils/errors";

/**
 * Calculate risk level from trust score
 */
const getRiskLevel = (score: number): "LOW" | "MEDIUM" | "HIGH" => {
  if (score >= 80) return "LOW";
  if (score >= 50) return "MEDIUM";
  return "HIGH";
};

/**
 * Determine candidate connection status from session state
 */
const getConnectionStatus = (
  session: any
): "ONLINE" | "OFFLINE" | "RECONNECTING" => {
  if (!session) return "OFFLINE";
  if (session.status === "active" && !session.leftAt) return "ONLINE";
  if (session.status === "active" && session.leftAt) return "OFFLINE";
  if (session.status === "left") return "OFFLINE";
  if (session.status === "completed") return "OFFLINE";
  return "OFFLINE";
};

/**
 * GET /api/v1/dashboard/interview/:interviewId
 * Returns all candidate sessions, trust scores, event statistics, and recent events
 * for a given interview.
 */
export const getInterviewDashboard = async (interviewId: string) => {
  // Validate the interview exists
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  // Get all sessions for this interview
  const sessions = await Session.find({ interviewId })
    .populate("candidateId", "name email role")
    .sort({ joinedAt: -1 });

  // Build dashboard data for each candidate session
  const candidates = await Promise.all(
    sessions.map(async (session) => {
      const candidateUser = session.candidateId as any;
      const candidateId = candidateUser._id
        ? candidateUser._id.toString()
        : session.candidateId.toString();

      // Get event statistics for this candidate in this interview
      const eventStats = await MonitoringEvent.aggregate([
        {
          $match: {
            interviewId: new mongoose.Types.ObjectId(interviewId),
            candidateId: new mongoose.Types.ObjectId(candidateId),
          },
        },
        {
          $group: {
            _id: "$eventType",
            count: { $sum: 1 },
          },
        },
      ]);

      // Flatten stats into a readable object
      const statistics = {
        totalTabSwitches: 0,
        totalPasteEvents: 0,
        totalCopyEvents: 0,
        totalFullscreenExits: 0,
        totalMonitoringEvents: 0,
      };

      let totalEvents = 0;
      for (const stat of eventStats) {
        totalEvents += stat.count;
        switch (stat._id) {
          case "TAB_SWITCH":
            statistics.totalTabSwitches = stat.count;
            break;
          case "WINDOW_BLUR":
            break;
          case "PASTE":
            statistics.totalPasteEvents = stat.count;
            break;
          case "COPY":
            statistics.totalCopyEvents = stat.count;
            break;
          case "FULLSCREEN_EXIT":
            statistics.totalFullscreenExits = stat.count;
            break;
        }
      }
      statistics.totalMonitoringEvents = totalEvents;

      // Get the most recent events for the live feed
      const recentEvents = await MonitoringEvent.find({
        interviewId: new mongoose.Types.ObjectId(interviewId),
        candidateId: new mongoose.Types.ObjectId(candidateId),
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      return {
        candidateId,
        candidateName: candidateUser.name || "Unknown",
        candidateEmail: candidateUser.email || "",
        trustScore: session.score,
        riskLevel: getRiskLevel(session.score),
        status: session.status,
        connectionStatus: getConnectionStatus(session),
        joinedAt: session.joinedAt,
        lastActivity:
          recentEvents.length > 0
            ? recentEvents[0].timestamp
            : session.joinedAt,
        statistics,
        recentEvents: recentEvents.map((ev: any) => ({
          _id: ev._id,
          eventType: ev.eventType,
          timestamp: ev.timestamp,
        })),
      };
    })
  );

  return {
    interview: {
      _id: interview._id,
      title: interview.title,
      description: interview.description,
      interviewCode: interview.interviewCode,
      startTime: interview.startTime,
      endTime: interview.endTime,
      status: interview.status,
    },
    candidates,
  };
};

/**
 * GET /api/v1/dashboard/candidate/:candidateId
 * Returns detailed dashboard data for a single candidate across all their sessions.
 */
export const getCandidateDashboard = async (candidateId: string) => {
  // Validate the candidate exists
  const candidate = await User.findById(candidateId).select("name email role");
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }

  // Get all sessions for this candidate
  const sessions = await Session.find({ candidateId })
    .populate("interviewId", "title interviewCode status startTime endTime")
    .sort({ joinedAt: -1 });

  // Get event statistics across all sessions
  const eventStats = await MonitoringEvent.aggregate([
    {
      $match: {
        candidateId: new mongoose.Types.ObjectId(candidateId),
      },
    },
    {
      $group: {
        _id: "$eventType",
        count: { $sum: 1 },
      },
    },
  ]);

  const statistics = {
    totalTabSwitches: 0,
    totalPasteEvents: 0,
    totalCopyEvents: 0,
    totalFullscreenExits: 0,
    totalMonitoringEvents: 0,
  };

  let totalEvents = 0;
  for (const stat of eventStats) {
    totalEvents += stat.count;
    switch (stat._id) {
      case "TAB_SWITCH":
        statistics.totalTabSwitches = stat.count;
        break;
      case "PASTE":
        statistics.totalPasteEvents = stat.count;
        break;
      case "COPY":
        statistics.totalCopyEvents = stat.count;
        break;
      case "FULLSCREEN_EXIT":
        statistics.totalFullscreenExits = stat.count;
        break;
    }
  }
  statistics.totalMonitoringEvents = totalEvents;

  // Get recent events across all interviews for this candidate
  const recentEvents = await MonitoringEvent.find({ candidateId })
    .populate("interviewId", "title interviewCode")
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

  // Determine current/last trust score from the most recent session
  const trustScore = sessions.length > 0 ? sessions[0].score : 100;
  const riskLevel = getRiskLevel(trustScore);

  return {
    candidate: {
      _id: candidate._id,
      name: candidate.name,
      email: candidate.email,
      role: candidate.role,
    },
    trustScore,
    riskLevel,
    statistics,
    sessions: sessions.map((s) => {
      const interviewData = s.interviewId as any;
      return {
        _id: s._id,
        interviewId: interviewData?._id || s.interviewId,
        interviewTitle: interviewData?.title || "Unknown",
        interviewCode: interviewData?.interviewCode || "",
        status: s.status,
        score: s.score,
        joinedAt: s.joinedAt,
        leftAt: s.leftAt,
      };
    }),
    recentEvents: recentEvents.map((ev: any) => ({
      _id: ev._id,
      eventType: ev.eventType,
      timestamp: ev.timestamp,
      interviewId: ev.interviewId?._id || ev.interviewId,
      interviewTitle: ev.interviewId?.title || "Unknown",
    })),
  };
};
