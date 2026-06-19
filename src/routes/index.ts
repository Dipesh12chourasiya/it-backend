import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes";
import interviewRoutes from "../modules/interviews/interview.routes";
import sessionRoutes from "../modules/sessions/session.routes";
import monitoringRoutes from "../modules/monitoring/monitoring.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/interviews", interviewRoutes);
router.use("/sessions", sessionRoutes);
router.use("/monitoring", monitoringRoutes);

export default router;