import mongoose from "mongoose";
import Interview from "../interviews/interview.model";
import Session from "../sessions/session.model";
import MonitoringEvent from "../monitoring/monitoring.model";
import { AppError } from "../../utils/errors";

// ─── Statistics Interface ───────────────────────────────────────────────────

export interface ReportStatistics {
  tabSwitches: number;
  copyEvents: number;
  pasteEvents: number;
  fullscreenExits: number;
  noFaceEvents: number;
  multipleFaceEvents: number;
  faceAwayEvents: number;
  interviewDurationMinutes: number;
}

// ─── Full Report Interface ──────────────────────────────────────────────────

export interface InterviewReport {
  interviewSummary: string;
  riskSummary: string;
  behaviorAnalysis: string;
  finalRecommendation: string;
  trustScore: number;
  riskLevel: string;
  statistics: ReportStatistics;
}

// ─── Risk Level Helper ──────────────────────────────────────────────────────

const getRiskLevel = (score: number): string => {
  if (score >= 80) return "LOW";
  if (score >= 50) return "MEDIUM";
  return "HIGH";
};

// ─── Aggregate Event Statistics ─────────────────────────────────────────────

const aggregateEventStats = async (
  interviewId: string,
  candidateId: string
): Promise<ReportStatistics> => {
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

  const statMap: Record<string, number> = {};
  for (const stat of eventStats) {
    statMap[stat._id] = stat.count;
  }

  return {
    tabSwitches: statMap["TAB_SWITCH"] || 0,
    copyEvents: statMap["COPY"] || 0,
    pasteEvents: statMap["PASTE"] || 0,
    fullscreenExits: statMap["FULLSCREEN_EXIT"] || 0,
    noFaceEvents: statMap["NO_FACE"] || 0,
    multipleFaceEvents: statMap["MULTIPLE_FACE"] || 0,
    faceAwayEvents: statMap["FACE_AWAY"] || 0,
    interviewDurationMinutes: 0, // Set below
  };
};

// ─── Interview Summary Generator ────────────────────────────────────────────

const generateInterviewSummary = (
  durationMinutes: number,
  totalEvents: number
): string => {
  const parts: string[] = [];

  parts.push(
    `Candidate participated in a ${durationMinutes} minute interview session.`
  );
  parts.push(
    "Monitoring remained active throughout the interview."
  );
  parts.push(
    `A total of ${totalEvents} monitoring event${totalEvents !== 1 ? "s" : ""} were recorded.`
  );

  return parts.join(" ");
};

// ─── Risk Summary Generator ─────────────────────────────────────────────────

const generateRiskSummary = (
  trustScore: number,
  riskLevel: string
): string => {
  const parts: string[] = [];

  parts.push(`Final Trust Score: ${trustScore}`);
  parts.push(`Risk Level: ${riskLevel}`);

  if (riskLevel === "LOW") {
    parts.push("Candidate maintained acceptable interview behavior.");
  } else if (riskLevel === "MEDIUM") {
    parts.push(
      "Candidate exhibited some suspicious activity that should be reviewed before proceeding."
    );
  } else {
    parts.push(
      "Multiple suspicious events significantly impacted interview integrity."
    );
  }

  return parts.join(" ");
};

// ─── Behavior Analysis Generator ────────────────────────────────────────────

const generateBehaviorAnalysis = (stats: ReportStatistics): string => {
  const lines: string[] = [];

  // Tab switches
  if (stats.tabSwitches > 0) {
    lines.push(
      `${stats.tabSwitches} tab switch${stats.tabSwitches !== 1 ? "es" : ""} detected.`
    );
  }

  // Copy events
  if (stats.copyEvents > 0) {
    lines.push(
      `${stats.copyEvents} copy event${stats.copyEvents !== 1 ? "s" : ""} detected.`
    );
  }

  // Paste events
  if (stats.pasteEvents > 0) {
    lines.push(
      `${stats.pasteEvents} paste event${stats.pasteEvents !== 1 ? "s" : ""} detected.`
    );
  }

  // Fullscreen exits
  if (stats.fullscreenExits > 0) {
    lines.push(
      `${stats.fullscreenExits} fullscreen exit${stats.fullscreenExits !== 1 ? "s" : ""} detected.`
    );
  }

  // No face events
  if (stats.noFaceEvents > 0) {
    lines.push(
      `${stats.noFaceEvents} no-face violation${stats.noFaceEvents !== 1 ? "s" : ""} detected.`
    );
  } else {
    lines.push("No no-face violations detected.");
  }

  // Multiple face events
  if (stats.multipleFaceEvents > 0) {
    lines.push(
      `${stats.multipleFaceEvents} multiple-face violation${stats.multipleFaceEvents !== 1 ? "s" : ""} detected.`
    );
  } else {
    lines.push("No multiple-face violations detected.");
  }

  // Face away events
  if (stats.faceAwayEvents > 0) {
    lines.push(
      `${stats.faceAwayEvents} face-away event${stats.faceAwayEvents !== 1 ? "s" : ""} detected.`
    );
  }

  // If zero events total
  if (lines.length === 0) {
    lines.push("No suspicious events were detected during the interview.");
  }

  return lines.join(" ");
};

// ─── Final Recommendation Generator ─────────────────────────────────────────

const generateFinalRecommendation = (
  trustScore: number
): { recommendation: string; explanation: string } => {
  if (trustScore >= 80) {
    return {
      recommendation: "RECOMMENDED",
      explanation:
        "Candidate demonstrated consistent interview behavior with minimal suspicious activity.",
    };
  }

  if (trustScore >= 50) {
    return {
      recommendation: "REVIEW REQUIRED",
      explanation:
        "Candidate exhibited some suspicious activity that should be reviewed before proceeding.",
    };
  }

  return {
    recommendation: "HIGH RISK CANDIDATE",
    explanation:
      "Multiple suspicious events significantly impacted interview integrity.",
  };
};

// ─── Main Report Generator ──────────────────────────────────────────────────

/**
 * Generate a complete rule-based interview report for a given interview and candidate.
 */
export const generateReport = async (
  interviewId: string,
  candidateId: string
): Promise<InterviewReport> => {
  // Validate interview exists
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  // Validate candidate session exists
  const session = await Session.findOne({
    interviewId,
    candidateId,
  }).sort({ createdAt: -1 });

  if (!session) {
    throw new AppError("Candidate session not found for this interview", 404);
  }

  // Aggregate event statistics
  const statistics = await aggregateEventStats(interviewId, candidateId);

  // Calculate interview duration
  const startTime = session.joinedAt?.getTime() || interview.startTime.getTime();
  const endTime = session.leftAt?.getTime() || Date.now();
  const durationMs = Math.max(0, endTime - startTime);
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  statistics.interviewDurationMinutes = durationMinutes;

  // Final trust score
  const trustScore = session.score;
  const riskLevel = getRiskLevel(trustScore);

  // Total events
  const totalEvents =
    statistics.tabSwitches +
    statistics.copyEvents +
    statistics.pasteEvents +
    statistics.fullscreenExits +
    statistics.noFaceEvents +
    statistics.multipleFaceEvents +
    statistics.faceAwayEvents;

  // Generate sections
  const interviewSummary = generateInterviewSummary(durationMinutes, totalEvents);
  const riskSummary = generateRiskSummary(trustScore, riskLevel);
  const behaviorAnalysis = generateBehaviorAnalysis(statistics);

  const { recommendation, explanation } = generateFinalRecommendation(trustScore);
  const finalRecommendation = `${recommendation} — ${explanation}`;

  return {
    interviewSummary,
    riskSummary,
    behaviorAnalysis,
    finalRecommendation,
    trustScore,
    riskLevel,
    statistics,
  };
};
