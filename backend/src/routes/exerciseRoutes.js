import express from "express";

import {
  getExercises,
  getExercise,
  addExercise,
  editExercise,
  removeExercise,
} from "../controllers/exerciseController.js";

import { uploadExerciseImage } from "../controllers/uploadController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Get all exercises
router.get("/", getExercises);

// Create an exercise
router.post("/", addExercise);

// Upload an image for an exercise
router.post("/:id/upload", upload.single("image"), uploadExerciseImage);

// Get one exercise
router.get("/:id", getExercise);

// Update an exercise
router.put("/:id", editExercise);

// Delete an exercise
router.delete("/:id", removeExercise);

export default router;