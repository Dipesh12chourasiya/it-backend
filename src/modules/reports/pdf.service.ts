import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import Interview from "../interviews/interview.model";
import Session from "../sessions/session.model";
import User from "../auth/auth.model";
import MonitoringEvent from "../monitoring/monitoring.model";
import { AppError } from "../../utils/errors";
import { ReportStatistics } from "./report.service";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getRiskLevel = (score: number): string => {
  if (score >= 80) return "LOW";
  if (score >= 50) return "MEDIUM";
  return "HIGH";
};

const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case "LOW": return "#22c55e";
    case "MEDIUM": return "#f59e0b";
    case "HIGH": return "#ef4444";
    default: return "#6b7280";
  }
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
    interviewDurationMinutes: 0,
  };
};

// ─── Text Generators ────────────────────────────────────────────────────────

const generateInterviewSummary = (durationMinutes: number, totalEvents: number): string =>
  `Candidate participated in a ${durationMinutes} minute interview session. Monitoring remained active throughout the interview. A total of ${totalEvents} monitoring event${totalEvents !== 1 ? "s" : ""} were recorded.`;

const generateRiskSummary = (trustScore: number, riskLevel: string): string => {
  const base = `Final Trust Score: ${trustScore} | Risk Level: ${riskLevel}. `;
  if (riskLevel === "LOW") return base + "Candidate maintained acceptable interview behavior.";
  if (riskLevel === "MEDIUM") return base + "Candidate exhibited some suspicious activity that should be reviewed before proceeding.";
  return base + "Multiple suspicious events significantly impacted interview integrity.";
};

const generateBehaviorAnalysis = (stats: ReportStatistics): string => {
  const lines: string[] = [];
  if (stats.tabSwitches > 0) lines.push(`${stats.tabSwitches} tab switch${stats.tabSwitches !== 1 ? "es" : ""} detected.`);
  if (stats.copyEvents > 0) lines.push(`${stats.copyEvents} copy event${stats.copyEvents !== 1 ? "s" : ""} detected.`);
  if (stats.pasteEvents > 0) lines.push(`${stats.pasteEvents} paste event${stats.pasteEvents !== 1 ? "s" : ""} detected.`);
  if (stats.fullscreenExits > 0) lines.push(`${stats.fullscreenExits} fullscreen exit${stats.fullscreenExits !== 1 ? "s" : ""} detected.`);
  if (stats.noFaceEvents > 0) lines.push(`${stats.noFaceEvents} no-face violation${stats.noFaceEvents !== 1 ? "s" : ""} detected.`);
  if (stats.multipleFaceEvents > 0) lines.push(`${stats.multipleFaceEvents} multiple-face violation${stats.multipleFaceEvents !== 1 ? "s" : ""} detected.`);
  if (stats.faceAwayEvents > 0) lines.push(`${stats.faceAwayEvents} face-away event${stats.faceAwayEvents !== 1 ? "s" : ""} detected.`);
  if (lines.length === 0) lines.push("No suspicious events were detected during the interview.");
  return lines.join("\n");
};

const generateFinalRecommendation = (trustScore: number): { label: string; text: string } => {
  if (trustScore >= 80) return { label: "RECOMMENDED", text: "Candidate demonstrated consistent interview behavior with minimal suspicious activity." };
  if (trustScore >= 50) return { label: "REVIEW REQUIRED", text: "Candidate exhibited some suspicious activity that should be reviewed before proceeding." };
  return { label: "HIGH RISK CANDIDATE", text: "Multiple suspicious events significantly impacted interview integrity." };
};

// ─── PDF Generator ──────────────────────────────────────────────────────────

/**
 * Generate a PDF report for a candidate in a given interview.
 * Returns a Buffer containing the PDF.
 */
export const generatePdfReport = async (
  interviewId: string,
  candidateId: string
): Promise<Buffer> => {
  // Validate interview
  const interview = await Interview.findById(interviewId);
  if (!interview) throw new AppError("Interview not found", 404);

  // Validate session
  const session = await Session.findOne({ interviewId, candidateId }).sort({ createdAt: -1 });
  if (!session) throw new AppError("Candidate session not found for this interview", 404);

  // Get candidate info
  const candidateUser = await User.findById(candidateId).select("name email");
  if (!candidateUser) throw new AppError("Candidate not found", 404);

  // Aggregate stats
  const statistics = await aggregateEventStats(interviewId, candidateId);

  // Duration
  const startTime = session.joinedAt?.getTime() || interview.startTime.getTime();
  const endTime = session.leftAt?.getTime() || Date.now();
  const durationMs = Math.max(0, endTime - startTime);
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  statistics.interviewDurationMinutes = durationMinutes;

  const trustScore = session.score;
  const riskLevel = getRiskLevel(trustScore);
  const riskColor = getRiskColor(riskLevel);

  const totalEvents =
    statistics.tabSwitches +
    statistics.copyEvents +
    statistics.pasteEvents +
    statistics.fullscreenExits +
    statistics.noFaceEvents +
    statistics.multipleFaceEvents +
    statistics.faceAwayEvents;

  const interviewSummary = generateInterviewSummary(durationMinutes, totalEvents);
  const riskSummary = generateRiskSummary(trustScore, riskLevel);
  const behaviorAnalysis = generateBehaviorAnalysis(statistics);
  const recommendation = generateFinalRecommendation(trustScore);

  // ─── Build PDF ─────────────────────────────────────────────────────────

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // ── Header ──
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("Interview Risk Report", { align: "center" })
      .moveDown(0.3)
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#888888")
      .text("Generated by Interview Guard AI", { align: "center" })
      .moveDown(0.5);

    // Divider line
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .stroke()
      .moveDown(0.8);

    // ── Candidate Information ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Candidate Information")
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Name: ${candidateUser.name}`)
      .text(`Email: ${candidateUser.email}`)
      .moveDown(0.5);

    // ── Interview Information ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Interview Information")
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Title: ${interview.title}`)
      .text(`Code: ${interview.interviewCode}`)
      .text(`Date: ${interview.startTime.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`)
      .text(`Duration: ${durationMinutes} minutes`)
      .moveDown(0.5);

    // ── Trust Score & Risk Level ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Trust Assessment")
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Trust Score: ${trustScore}`)
      .text(`Risk Level: ${riskLevel}`)
      .moveDown(0.5);

    // ── Monitoring Statistics ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Monitoring Statistics")
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Tab Switches: ${statistics.tabSwitches}`)
      .text(`Copy Events: ${statistics.copyEvents}`)
      .text(`Paste Events: ${statistics.pasteEvents}`)
      .text(`Fullscreen Exits: ${statistics.fullscreenExits}`)
      .text(`No Face Events: ${statistics.noFaceEvents}`)
      .text(`Multiple Face Events: ${statistics.multipleFaceEvents}`)
      .text(`Face Away Events: ${statistics.faceAwayEvents}`)
      .text(`Total Events: ${totalEvents}`)
      .moveDown(0.5);

    // ── Interview Summary ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Interview Summary")
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333333")
      .text(interviewSummary, { lineGap: 4 })
      .moveDown(0.5);

    // ── Behavior Analysis ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Behavior Analysis")
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333333")
      .text(behaviorAnalysis, { lineGap: 4 })
      .moveDown(0.5);

    // ── Final Recommendation ──
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Final Recommendation")
      .moveDown(0.3);

    // Recommendation badge
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(riskColor)
      .text(recommendation.label)
      .moveDown(0.2);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333333")
      .text(recommendation.text)
      .moveDown(1);

    // ── Footer ──
    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#aaaaaa")
      .text(
        `Interview Guard AI — Confidential Report | Generated: ${new Date().toLocaleString("en-US")}`,
        50,
        pageHeight - 40,
        { align: "center", width: 495 }
      );

    doc.end();
  });

  return pdfBuffer;
};
