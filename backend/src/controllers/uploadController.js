// This controller handles the database part of image uploads. Multer (wired
// into the route) saves the file first; here we associate its public URL with
// an existing exercise and clean up the saved file if that cannot be done.
import fs from "node:fs/promises";
import Exercise from "../models/Exercise.js";

// Remove a file Multer has already saved when the request cannot use it.
// fs.unlink deletes it; ENOENT is harmless because it is already absent, while
// other cleanup failures are logged rather than hiding the original response.
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

// Attach the uploaded file to the exercise identified in the URL. `req.file`
// is populated by the preceding Multer middleware, and the JSON response gives
// the client the exercise ID, public image URL, and stored filename.
export async function uploadExerciseImage(req, res) {
  // Keep the disk path so it can be deleted if validation or DB work fails.
  const uploadedFilePath = req.file?.path;

  try {
    const exerciseId = Number(req.params.id);

    // Multer runs before this controller, so remove its file for invalid IDs.
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      // Multer has already saved the upload by this point, so invalid IDs must
      // also trigger cleanup to avoid leaving an unattached file behind.
      await removeUploadedFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    if (!req.file) {
      // This guard handles requests that reach the controller without a file.
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
    // Instance update() persists the new URL to this exercise's gif_url column.
    await exercise.update({ gif_url: imageUrl });

    // 200 indicates that the association succeeded; the static route in
    // server.js makes imageUrl accessible to the frontend.
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
    // If lookup or persistence fails, remove the newly saved image so the disk
    // does not accumulate files that no database row references.
    await removeUploadedFile(uploadedFilePath);
    console.error("Image upload failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Image upload failed.",
    });
  }
}
