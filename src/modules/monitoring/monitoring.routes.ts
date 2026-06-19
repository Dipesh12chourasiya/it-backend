import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { create, getByInterview } from "./monitoring.controller";

const router = Router();

router.post("/event", protect, create);
router.get("/events/:interviewId", protect, getByInterview);

export default router;
