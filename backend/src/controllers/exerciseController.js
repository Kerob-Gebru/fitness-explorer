
// Controllers form the HTTP-facing layer: they read Express request data,
// validate it, call Sequelize model methods directly, and choose status/JSON
// responses.
import { Op } from "sequelize";
import Exercise from "../models/Exercise.js";

// Build one reusable Sequelize `where` object from optional API filters.
// Op.and makes every supplied category/search condition apply together, while
// Op.or lets a search term match any of the displayed text columns.
function buildExerciseFilters(filters = {}) {
  const conditions = [];

  if (filters.body_part) {
    // Exact match for this category when the client supplies it.
    conditions.push({ body_part: filters.body_part });
  }

  if (filters.target_muscle) {
    conditions.push({ target_muscle: filters.target_muscle });
  }

  if (filters.equipment) {
    conditions.push({ equipment: filters.equipment });
  }

  // Op.like performs a substring-style SQL LIKE search; the surrounding %
  // wildcards allow matching text before and after the entered phrase.
  if (filters.search) {
    const searchValue = `%${filters.search}%`;
    conditions.push({
      [Op.or]: [
        { name: { [Op.like]: searchValue } },
        { body_part: { [Op.like]: searchValue } },
        { target_muscle: { [Op.like]: searchValue } },
        { equipment: { [Op.like]: searchValue } },
      ],
    });
  }

  return conditions.length ? { [Op.and]: conditions } : {};
}

// Convert query-string pagination values to numbers and constrain them:
// pages start at 1, and clients can request at most 100 records per page.
function getSafePagination(page, limit) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

// Accept only known column names and the two supported sort directions.
// This prevents arbitrary sort values from being passed into the query.
const allowedSortColumns = [
  "id",
  "name",
  "body_part",
  "target_muscle",
  "equipment",
  "created_at",
];

// A duplicate external_id can be reported by Sequelize or directly by the
// MySQL driver. Treat either form alike so create/update return HTTP 409.
function isDuplicateExternalIdError(error) {
  return error?.name === "SequelizeUniqueConstraintError" ||
    error?.code === "ER_DUP_ENTRY";
}

// GET /api/exercises: build the filters and pagination options, then return
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

    const where = buildExerciseFilters(filters);
    const pagination = getSafePagination(page, limit);
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "id";
    const safeOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    // findAll returns the rows for this page; count returns the matching total
    // used to calculate how many pages exist overall.
    const exercises = await Exercise.findAll({
      where,
      order: [[safeSortBy, safeOrder]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const totalExercises = await Exercise.count({ where });

    const totalPages = Math.ceil(totalExercises / pagination.limit);

    // 200 means the request succeeded. The response shape includes both data
    // and navigation details used by the client to render paginated results.
    res.status(200).json({
      success: true,
      pagination: {
        currentPage: pagination.page,
        limit: pagination.limit,
        totalExercises,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
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

    const exercise = await Exercise.findByPk(id);

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
// create the row. The created row ID is returned with HTTP 201.
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

    // Trim the required name before persistence; absent optional values become
    // null to match the API's established behavior.
    const createdExercise = await Exercise.create({
      external_id: external_id || null,
      name: exercise.name,
      body_part: body_part || null,
      target_muscle: target_muscle || null,
      equipment: equipment || null,
      instructions: instructions || null,
      gif_url: gif_url || null,
    });

    res.status(201).json({
      success: true,
      message: "Exercise created successfully.",
      data: {
        id: createdExercise.id,
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
// editable fields. The affected-row count tells us whether it existed.
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

    // Omitted or empty optional values become null rather than keeping the
    // previous values, preserving the established PUT semantics.
    const [affectedRows] = await Exercise.update(
      {
        external_id: external_id || null,
        name: name.trim(),
        body_part: body_part || null,
        target_muscle: target_muscle || null,
        equipment: equipment || null,
        instructions: instructions || null,
        gif_url: gif_url || null,
      },
      { where: { id } }
    );

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

    const affectedRows = await Exercise.destroy({ where: { id } });

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
