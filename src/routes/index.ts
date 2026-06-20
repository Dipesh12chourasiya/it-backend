import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes";
import interviewRoutes from "../modules/interviews/interview.routes";
import sessionRoutes from "../modules/sessions/session.routes";
import monitoringRoutes from "../modules/monitoring/monitoring.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/interviews", interviewRoutes);
router.use("/sessions", sessionRoutes);
router.use("/monitoring", monitoringRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;