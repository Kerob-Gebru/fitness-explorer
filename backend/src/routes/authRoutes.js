import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
  changePassword,
  listSessions,
  login,
  logout,
  refresh,
  register,
  removeAvatar,
  requireAuth,
  restore,
  revokeAllSessions,
  revokeSession,
  updateProfile,
  uploadAvatar,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/restore", restore);
router.post("/logout", logout);

router.patch("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, changePassword);
router.post("/avatar", requireAuth, upload.single("image"), uploadAvatar);
router.delete("/avatar", requireAuth, removeAvatar);

router.get("/sessions", requireAuth, listSessions);
router.delete("/sessions/:id", requireAuth, revokeSession);
router.post("/logout-all", requireAuth, revokeAllSessions);

export default router;
