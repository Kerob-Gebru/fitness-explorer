import express from "express";
import {
  addExercise,
  editExercise,
  getExercise,
  getExercises,
  removeExercise,
} from "../controllers/exerciseController.js";
import {
  getUploadedImagesManifest,
  uploadExerciseImage,
} from "../controllers/uploadController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/uploads/manifest", getUploadedImagesManifest);
router.get("/", getExercises);
router.post("/", addExercise);
router.post("/:id/upload", upload.single("image"), uploadExerciseImage);
router.get("/:id", getExercise);
router.put("/:id", editExercise);
router.delete("/:id", removeExercise);

export default router;
