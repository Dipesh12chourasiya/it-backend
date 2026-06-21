import mongoose from "mongoose";
import Session from "../sessions/session.model";
import MonitoringEvent from "../monitoring/monitoring.model";
import Interview from "../interviews/interview.model";
import User from "../auth/auth.model";
import { AppError } from "../../utils/errors";

/**
 * GET /api/v1/dashboard/recruiter/overview
 * Aggregate statistics for the recruiter's home dashboard.
 */
export const getRecruiterOverview = async (recruiterId: string) => {
  // All interviews created by this recruiter
  const interviewIds = await Interview.find({ recruiterId })
    .select("_id")
    .lean();
  const ids = interviewIds.map((i) => i._id);

  // Total candidates who have sessions in this recruiter's interviews
  const candidateIds = await Session.distinct("candidateId", {
    interviewId: { $in: ids },
  });

  // Active interviews (status === 'active')
  const activeInterviews = await Interview.countDocuments({
    recruiterId,
    status: "active",
  });

  // Active sessions (status === 'active', not yet left)
  const activeSessions = await Session.countDocuments({
    interviewId: { $in: ids },
    status: "active",
  });

  // Average trust score across all sessions
  const scoreAgg = await Session.aggregate([
    { $match: { interviewId: { $in: ids } } },
    { $group: { _id: null, avgScore: { $avg: "$score" } } },
  ]);
  const averageTrustScore =
    scoreAgg.length > 0 ? Math.round(scoreAgg[0].avgScore) : 100;

  // High risk candidates (score < 50 in any session)
  const highRiskSessions = await Session.aggregate([
    { $match: { interviewId: { $in: ids }, score: { $lt: 50 } } },
    { $group: { _id: "$candidateId" } },
  ]);
  const highRiskCandidates = highRiskSessions.length;

  // Total monitoring events across all interviews
  const totalMonitoringEvents = await MonitoringEvent.countDocuments({
    interviewId: { $in: ids },
  });

  // Recent sessions (last 5)
  const recentSessions = await Session.find({ interviewId: { $in: ids } })
    .populate("interviewId", "title interviewCode")
    .populate("candidateId", "name email")
    .sort({ joinedAt: -1 })
    .limit(5)
    .lean();

  return {
    totalCandidates: candidateIds.length,
    activeInterviews,
    averageTrustScore,
    highRiskCandidates,
    totalMonitoringEvents,
    activeSessions,
    recentSessions: recentSessions.map((s: any) => ({
      _id: s._id,
      interviewTitle: s.interviewId?.title || "Unknown",
      interviewCode: s.interviewId?.interviewCode || "",
      candidateName: s.candidateId?.name || "Unknown",
      candidateEmail: s.candidateId?.email || "",
      score: s.score,
      status: s.status,
      joinedAt: s.joinedAt,
      leftAt: s.leftAt,
    })),
  };
};

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
        totalNoFaceEvents: 0,
        totalMultipleFaceEvents: 0,
        totalFaceAwayEvents: 0,
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
          case "NO_FACE":
            statistics.totalNoFaceEvents = stat.count;
            break;
          case "MULTIPLE_FACE":
            statistics.totalMultipleFaceEvents = stat.count;
            break;
          case "FACE_AWAY":
            statistics.totalFaceAwayEvents = stat.count;
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
    totalNoFaceEvents: 0,
    totalMultipleFaceEvents: 0,
    totalFaceAwayEvents: 0,
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
      case "NO_FACE":
        statistics.totalNoFaceEvents = stat.count;
        break;
      case "MULTIPLE_FACE":
        statistics.totalMultipleFaceEvents = stat.count;
        break;
      case "FACE_AWAY":
        statistics.totalFaceAwayEvents = stat.count;
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
