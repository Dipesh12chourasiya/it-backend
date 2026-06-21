import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { getInterviewReport, getInterviewReportPdf } from "./report.controller";

const router = Router();

// PDF route must come before the generic :interviewId route
router.get("/interview/:interviewId/pdf", protect, getInterviewReportPdf);
router.get("/interview/:interviewId", protect, getInterviewReport);

export default router;
