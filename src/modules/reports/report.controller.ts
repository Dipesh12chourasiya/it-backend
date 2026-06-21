import { Request, Response, NextFunction } from "express";
import { generateReport } from "./report.service";
import { generatePdfReport } from "./pdf.service";

/**
 * GET /api/v1/reports/interview/:interviewId
 * Generate a rule-based risk report for a candidate in a given interview.
 * Query param: candidateId (required)
 */
export const getInterviewReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const interviewId = req.params.interviewId as string;
    const candidateId = req.query.candidateId as string;

    if (!candidateId) {
      res.status(400).json({
        success: false,
        message: "candidateId query parameter is required",
      });
      return;
    }

    const report = await generateReport(interviewId, candidateId);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/interview/:interviewId/pdf
 * Generate and download a PDF report for a candidate in a given interview.
 * Query param: candidateId (required)
 */
export const getInterviewReportPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const interviewId = req.params.interviewId as string;
    const candidateId = req.query.candidateId as string;

    if (!candidateId) {
      res.status(400).json({
        success: false,
        message: "candidateId query parameter is required",
      });
      return;
    }

    const pdfBuffer = await generatePdfReport(interviewId, candidateId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="interview-report-${interviewId}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
