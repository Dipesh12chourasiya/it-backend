import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  getInterviewDashboardController,
  getCandidateDashboardController,
} from "./dashboard.controller";

const router = Router();

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
