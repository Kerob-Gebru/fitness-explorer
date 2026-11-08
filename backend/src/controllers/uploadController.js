import fs from "node:fs/promises";
import Exercise from "../models/Exercise.js";

// Remove a file Multer has already saved if the database operation cannot use
// it. Missing files are harmless; other cleanup failures are logged.
async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not remove uploaded image:", error.message);
    }
  }
}

// Attach the uploaded file to one existing exercise and return its public URL.
export async function uploadExerciseImage(req, res) {
  const uploadedFilePath = req.file?.path;

  try {
    const exerciseId = Number(req.params.id);

    // Multer runs before this controller, so remove its file for invalid IDs.
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      await removeUploadedFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload.",
      });
    }

    // findByPk looks up the row using the model's declared primary key.
    const exercise = await Exercise.findByPk(exerciseId);
    if (!exercise) {
      await removeUploadedFile(uploadedFilePath);
      return res.status(404).json({
        success: false,
        message: "Exercise not found.",
      });
    }

    // The URL remains relative so the frontend can resolve it against the API
    // host, while the actual file remains in backend/uploads.
    const imageUrl = `/uploads/${req.file.filename}`;
    await exercise.update({ gif_url: imageUrl });

    return res.status(200).json({
      success: true,
      message: "Exercise image uploaded successfully!",
      data: {
        exerciseId,
        imageUrl,
        filename: req.file.filename,
      },
    });
  } catch (error) {
    await removeUploadedFile(uploadedFilePath);
    console.error("Image upload failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Image upload failed.",
    });
  }
}
