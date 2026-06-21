import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  getRecruiterOverviewController,
  getInterviewDashboardController,
  getCandidateDashboardController,
} from "./dashboard.controller";

const router = Router();

router.get(
  "/recruiter/overview",
  protect,
  authorize("recruiter"),
  getRecruiterOverviewController
);

router.get(
  "/interview/:interviewId",
  protect,
  authorize("recruiter"),
  getInterviewDashboardController
);

router.get(
  "/candidate/:candidateId",
  protect,
  authorize("recruiter"),
  getCandidateDashboardController
);

export default router;
