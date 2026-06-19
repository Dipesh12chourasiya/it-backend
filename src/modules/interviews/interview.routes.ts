import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  create,
  getAll,
  getById,
  update,
  remove,
  join,
} from "./interview.controller";

const router = Router();

// Recruiter-only routes
router.post("/", protect, authorize("recruiter"), create);
router.get("/", protect, authorize("recruiter"), getAll);
router.get("/:id", protect, authorize("recruiter"), getById);
router.put("/:id", protect, authorize("recruiter"), update);
router.delete("/:id", protect, authorize("recruiter"), remove);

// Shared / candidate route
router.post("/join", protect, join);

export default router;
