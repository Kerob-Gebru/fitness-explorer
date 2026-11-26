import express from "express";
import { requireAuth } from "../controllers/authController.js";
import { getState, saveState } from "../controllers/userStateController.js";

const router = express.Router();

router.get("/", requireAuth, getState);
router.put("/", requireAuth, saveState);

export default router;
