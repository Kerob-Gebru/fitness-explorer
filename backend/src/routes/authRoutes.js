import express from "express";
import {
  listSessions,
  login,
  logout,
  refresh,
  register,
  requireAuth,
  revokeAllSessions,
  revokeSession,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/sessions", requireAuth, listSessions);
router.delete("/sessions/:id", requireAuth, revokeSession);
router.post("/logout-all", requireAuth, revokeAllSessions);

export default router;
