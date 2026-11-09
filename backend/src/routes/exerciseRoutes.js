// This router groups HTTP endpoints for exercises. It is mounted at
// /api/exercises in server.js, so "/" here means /api/exercises at runtime.
import express from "express";

// Each controller handles the HTTP request/response for its operation.
import {
  getExercises,
  getExercise,
  addExercise,
  editExercise,
  removeExercise,
} from "../controllers/exerciseController.js";

import { uploadExerciseImage } from "../controllers/uploadController.js";
// Multer's upload middleware parses multipart form data and saves the image
// before the upload controller runs.
import upload from "../middleware/uploadMiddleware.js";

// A router keeps related endpoint definitions together and reusable by app.
const router = express.Router();

// GET /api/exercises lists and filters exercises.
router.get("/", getExercises);

// POST /api/exercises creates a row from a JSON body.
router.post("/", addExercise);

// POST /api/exercises/:id/upload processes one form field named "image".
// Middleware order matters: Multer must populate req.file before the controller.
router.post("/:id/upload", upload.single("image"), uploadExerciseImage);

// GET /api/exercises/:id retrieves one exercise.
router.get("/:id", getExercise);

// PUT /api/exercises/:id replaces the editable exercise fields.
router.put("/:id", editExercise);

// DELETE /api/exercises/:id removes an exercise.
router.delete("/:id", removeExercise);

// server.js imports this router and mounts it under the API prefix.
export default router;