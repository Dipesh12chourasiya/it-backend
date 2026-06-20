import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { get, update } from "./workspace.controller";

const router = Router();

router.get("/:interviewId", protect, get);
router.put("/:interviewId", protect, update);

export default router;
