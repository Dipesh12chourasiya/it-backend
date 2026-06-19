import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { start, end, getById, getActive } from "./session.controller";

const router = Router();

router.post("/start", protect, start);
router.post("/end", protect, end);
router.get("/active/:interviewId", protect, getActive);
router.get("/:id", protect, getById);

export default router;
