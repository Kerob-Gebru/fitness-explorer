
import {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  countExercises,
} from "../models/exerciseModel.js";

// Controllers translate HTTP requests into model calls and keep the public
// response shape stable for the React client.
// Sequelize wraps unique-index violations in this named error. Keep accepting
// the driver code as well so duplicate IDs retain the existing API response.
function isDuplicateExternalIdError(error) {
  return error?.name === "SequelizeUniqueConstraintError" ||
    error?.code === "ER_DUP_ENTRY";
}

// GET /api/exercises
// Supports filtering, sorting, searching, and pagination
export async function getExercises(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "id",
      order = "DESC",
      body_part,
      target_muscle,
      equipment,
      search,
    } = req.query;

    const filters = {
      body_part,
      target_muscle,
      equipment,
      search,
    };

    const exercises = await getAllExercises({
      page,
      limit,
      sortBy,
      order,
      ...filters,
    });

    const totalExercises = await countExercises(filters);

    const currentPage = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const pageLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );

    const totalPages = Math.ceil(totalExercises / pageLimit);

    res.status(200).json({
      success: true,
      pagination: {
        currentPage,
        limit: pageLimit,
        totalExercises,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
      count: exercises.length,
      data: exercises,
    });
  } catch (error) {
    console.error("Get exercises error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve exercises.",
    });
  }
}

// GET /api/exercises/:id
// Get one exercise by ID
export async function getExercise(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    const exercise = await getExerciseById(id);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    console.error("Get exercise error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve exercise.",
    });
  }
}

// POST /api/exercises
// Create a new exercise
export async function addExercise(req, res) {
  try {
    const {
      external_id,
      name,
      body_part,
      target_muscle,
      equipment,
      instructions,
      gif_url,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Exercise name is required.",
      });
    }

    const exercise = {
      external_id,
      name: name.trim(),
      body_part,
      target_muscle,
      equipment,
      instructions,
      gif_url,
    };

    const newExerciseId = await createExercise(exercise);

    res.status(201).json({
      success: true,
      message: "Exercise created successfully.",
      data: {
        id: newExerciseId,
        ...exercise,
      },
    });
  } catch (error) {
    console.error("Create exercise error:", error.message);

    if (isDuplicateExternalIdError(error)) {
      return res.status(409).json({
        success: false,
        message: "An exercise with this external ID already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create exercise.",
    });
  }
}

// PUT /api/exercises/:id
// Update an existing exercise
export async function editExercise(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    const {
      external_id,
      name,
      body_part,
      target_muscle,
      equipment,
      instructions,
      gif_url,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Exercise name is required.",
      });
    }

    const affectedRows = await updateExercise(id, {
      external_id,
      name: name.trim(),
      body_part,
      target_muscle,
      equipment,
      instructions,
      gif_url,
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exercise updated successfully.",
    });
  } catch (error) {
    console.error("Update exercise error:", error.message);

    if (isDuplicateExternalIdError(error)) {
      return res.status(409).json({
        success: false,
        message: "An exercise with this external ID already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update exercise.",
    });
  }
}

// DELETE /api/exercises/:id
// Delete an exercise
export async function removeExercise(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    const affectedRows = await deleteExercise(id);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exercise deleted successfully.",
    });
  } catch (error) {
    console.error("Delete exercise error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete exercise.",
    });
  }
}
