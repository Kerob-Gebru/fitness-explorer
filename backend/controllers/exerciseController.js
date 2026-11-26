// Controllers form the HTTP-facing layer: they read Express request data,
// validate it, call Sequelize model methods, and return JSON responses.
import { Op } from "sequelize";
import Exercise from "../models/Exercise.js";

function buildExerciseFilters(filters = {}) {
  const conditions = [];

  if (filters.body_part) {
    conditions.push({ body_part: filters.body_part });
  }

  if (filters.target_muscle) {
    conditions.push({ target_muscle: filters.target_muscle });
  }

  if (filters.equipment) {
    conditions.push({ equipment: filters.equipment });
  }

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

function getSafePagination(page, limit) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

const allowedSortColumns = [
  "id",
  "name",
  "body_part",
  "target_muscle",
  "equipment",
  "created_at",
];

function isDuplicateExternalIdError(error) {
  return error?.name === "SequelizeUniqueConstraintError" || error?.code === "ER_DUP_ENTRY";
}

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

    const where = buildExerciseFilters({
      body_part,
      target_muscle,
      equipment,
      search,
    });
    const pagination = getSafePagination(page, limit);
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "id";
    const safeOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const exercises = await Exercise.findAll({
      where,
      order: [[safeSortBy, safeOrder]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const totalExercises = await Exercise.count({ where });
    const totalPages = Math.ceil(totalExercises / pagination.limit);

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
    console.error("Get exercises error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve exercises.",
    });
  }
}

export async function getExercise(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exercise ID.",
      });
    }

    const exercise = await Exercise.findByPk(id);

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
    console.error("Delete exercise error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete exercise.",
    });
  }
}
