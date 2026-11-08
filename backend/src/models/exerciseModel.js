import { Op } from "sequelize";
import Exercise from "./Exercise.js";

// Keep the API's filter behavior in one place so list and count queries use
// exactly the same conditions.
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

  // Op.or searches each visible exercise field. Op.like retains the previous
  // SQL LIKE behavior, including the use of % as a wildcard.
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

// Parse pagination inputs and keep the values within the API's safe range.
function getSafePagination(page, limit) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

// Get matching exercises in a predictable order and return only one page.
export async function getAllExercises(options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = "id",
    order = "DESC",
    body_part,
    target_muscle,
    equipment,
    search,
  } = options;

  const allowedSortColumns = [
    "id",
    "name",
    "body_part",
    "target_muscle",
    "equipment",
    "created_at",
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "id";
  const safeOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";
  const pagination = getSafePagination(page, limit);
  const where = buildExerciseFilters({
    body_part,
    target_muscle,
    equipment,
    search,
  });

  return Exercise.findAll({
    where,
    order: [[safeSortBy, safeOrder]],
    limit: pagination.limit,
    offset: pagination.offset,
  });
}

// Count records using the same filters as the list query for pagination data.
export async function countExercises(filters = {}) {
  return Exercise.count({ where: buildExerciseFilters(filters) });
}

// Retrieve one row by its primary key; Sequelize returns null when missing.
export async function getExerciseById(id) {
  return Exercise.findByPk(id);
}

// Insert a new exercise and return its generated auto-increment primary key.
export async function createExercise(exercise) {
  const createdExercise = await Exercise.create({
    external_id: exercise.external_id || null,
    name: exercise.name,
    body_part: exercise.body_part || null,
    target_muscle: exercise.target_muscle || null,
    equipment: exercise.equipment || null,
    instructions: exercise.instructions || null,
    gif_url: exercise.gif_url || null,
  });

  return createdExercise.id;
}

// Replace the editable fields as the previous PUT implementation did.
// Omitted or empty optional fields are stored as null rather than retained.
export async function updateExercise(id, exercise) {
  const [affectedRows] = await Exercise.update(
    {
      external_id: exercise.external_id || null,
      name: exercise.name,
      body_part: exercise.body_part || null,
      target_muscle: exercise.target_muscle || null,
      equipment: exercise.equipment || null,
      instructions: exercise.instructions || null,
      gif_url: exercise.gif_url || null,
    },
    { where: { id } }
  );

  return affectedRows;
}

// Delete by primary key and return the number of rows removed.
export async function deleteExercise(id) {
  return Exercise.destroy({ where: { id } });
}
