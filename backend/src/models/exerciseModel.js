// This module is the data-access layer between controllers and the Exercise
// model. It contains database queries and keeps SQL/Sequelize details out of
// the HTTP request-handling code.
import { Op } from "sequelize";
import Exercise from "./Exercise.js";

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

// Fetch one page of matching rows. The controller passes query parameters here;
// this function validates sort settings, builds filters, then asks Sequelize
// for the ordered subset rather than loading the whole table into memory.
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
  // Accept only known column names and the two supported sort directions.
  // This prevents arbitrary sort values from being passed into the query.
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "id";
  const safeOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";
  const pagination = getSafePagination(page, limit);
  const where = buildExerciseFilters({
    body_part,
    target_muscle,
    equipment,
    search,
  });

  // findAll returns every row matching `where`, limited to this page. `order`
  // controls stable presentation, and limit/offset implement pagination.
  return Exercise.findAll({
    where,
    order: [[safeSortBy, safeOrder]],
    limit: pagination.limit,
    offset: pagination.offset,
  });
}

// Count the matching rows separately so the controller can calculate total
// pages. Reusing the same filter builder keeps counts consistent with results.
export async function countExercises(filters = {}) {
  return Exercise.count({ where: buildExerciseFilters(filters) });
}

// Find a row by its primary key. Sequelize returns null if the ID does not exist.
export async function getExerciseById(id) {
  return Exercise.findByPk(id);
}

// Insert a row with create(), translating absent optional values to null to
// match the API's established behavior. Return the database-generated ID.
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

// Replace the editable fields as a PUT operation. Sequelize's update() returns
// an array whose first item is the number of rows affected; omitted or empty
// optional values become null rather than keeping the previous values.
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

// Delete matching row(s) and return the affected-row count so the controller
// can distinguish a successful deletion from an ID that was not found.
export async function deleteExercise(id) {
  return Exercise.destroy({ where: { id } });
}
