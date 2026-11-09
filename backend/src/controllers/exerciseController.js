
// Controllers form the HTTP-facing layer: they read Express request data,
// validate it, call the data-access functions, and choose status/JSON responses.
// The imported functions keep database operations in the model layer.
import {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  countExercises,
} from "../models/exerciseModel.js";

// A duplicate external_id can be reported by Sequelize or directly by the
// MySQL driver. Treat either form alike so create/update return HTTP 409.
function isDuplicateExternalIdError(error) {
  return error?.name === "SequelizeUniqueConstraintError" ||
    error?.code === "ER_DUP_ENTRY";
}

// GET /api/exercises: pass query-string options to the model layer, then return
// the current page and matching-row count together with pagination metadata.
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

    // Fetch the page and total count independently: the first returns the rows
    // for this page, while the second determines how many pages exist overall.
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

    // 200 means the request succeeded. The response shape includes both data
    // and navigation details used by the client to render paginated results.
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
    // Keep details in server logs; clients receive a stable, non-sensitive 500.
    console.error("Get exercises error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve exercises.",
    });
  }
}

// GET /api/exercises/:id: validate the URL parameter before querying the DB.
export async function getExercise(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      // IDs must be positive whole numbers; malformed IDs are client errors.
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    const exercise = await getExerciseById(id);

    if (!exercise) {
      // A valid ID can still refer to no row, which is a 404 rather than 500.
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

// POST /api/exercises: validate the required name, build the data object, and
// pass it to the model layer. The created row ID is returned with HTTP 201.
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
      // Reject missing, non-string, and whitespace-only names before DB access.
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

    // Trim the required name before persistence; optional fields pass through.
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

    // The database enforces unique external IDs; report that conflict clearly.
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

// PUT /api/exercises/:id: validate the ID and required name, then replace the
// editable fields. The model's affected-row count tells us whether it existed.
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
      // No rows changed means there was no matching exercise to update.
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

    // Keep duplicate external IDs distinct from unexpected server failures.
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

// DELETE /api/exercises/:id: remove the row only after validating its ID, then
// use the affected-row count to return either success or not-found.
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
    // Unexpected database errors are logged and represented as a generic 500.
    console.error("Delete exercise error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete exercise.",
    });
  }
}
