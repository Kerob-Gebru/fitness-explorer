// Canonical schema descriptor for the `user_profiles` database table.
// Shared between the Sequelize model (`UserProfile.js`), controllers, backend
// handlers, and the local Express preview store so both environments enforce identical fields.

export const USER_PROFILE_TABLE_NAME = "user_profiles";

export const USER_PROFILE_COLUMNS = Object.freeze({
  user_id: {
    type: "BIGINT.UNSIGNED",
    primaryKey: true,
    allowNull: false,
    references: { table: "users", column: "id" },
    description: "One-to-one primary/foreign key referencing users.id.",
  },
  first_name: {
    type: "VARCHAR(40)",
    allowNull: false,
    description: "Member given name displayed on profile overview.",
  },
  last_name: {
    type: "VARCHAR(40)",
    allowNull: false,
    description: "Member family name displayed on profile overview.",
  },
  phone: {
    type: "VARCHAR(30)",
    allowNull: false,
    description: "Optional member contact phone number.",
  },
  handle: {
    type: "VARCHAR(40)",
    allowNull: false,
    description: "Athlete @handle displayed under profile summary.",
  },
  location: {
    type: "VARCHAR(80)",
    allowNull: false,
    description: "Member city, studio, or home gym location.",
  },
  bio: {
    type: "VARCHAR(240)",
    allowNull: false,
    description: "Short training focus or personal fitness bio.",
  },
  avatar_url: {
    type: "VARCHAR(255)",
    allowNull: true,
    description: "Relative URL to uploaded profile photo under /uploads/.",
  },
  weight_kg: {
    type: "DECIMAL(5,1)",
    allowNull: true,
    description: "Current body weight normalized to kilograms.",
  },
  target_weight_kg: {
    type: "DECIMAL(5,1)",
    allowNull: true,
    description: "Goal body weight normalized to kilograms.",
  },
  height_cm: {
    type: "DECIMAL(5,1)",
    allowNull: true,
    description: "Member height normalized to centimeters.",
  },
  resting_heart_rate: {
    type: "SMALLINT.UNSIGNED",
    allowNull: true,
    description: "Resting heart rate in beats per minute (30-220).",
  },
  units: {
    type: "ENUM('metric','imperial')",
    allowNull: false,
    description: "Preferred measurement display system (metric or imperial).",
  },
  latest_measurement_date: {
    type: "DATEONLY",
    allowNull: true,
    description: "Calendar date (YYYY-MM-DD) of the latest body check-in.",
  },
  created_at: {
    type: "DATE(3)",
    allowNull: false,
    description: "UTC creation timestamp.",
  },
  updated_at: {
    type: "DATE(3)",
    allowNull: false,
    description: "UTC last-modified timestamp.",
  },
});

export const USER_PROFILE_INDEXES = Object.freeze([
  { name: "user_profiles_handle_idx", fields: ["handle"] },
  { name: "user_profiles_location_idx", fields: ["location"] },
]);

export const USER_PROFILE_TABLE_METADATA = Object.freeze({
  tableName: USER_PROFILE_TABLE_NAME,
  columns: Object.entries(USER_PROFILE_COLUMNS).map(([name, spec]) => ({
    name,
    type: spec.type,
    nullable: Boolean(spec.allowNull),
    primaryKey: Boolean(spec.primaryKey),
    unique: Boolean(spec.unique),
    references: spec.references || null,
    description: spec.description,
  })),
  indexes: USER_PROFILE_INDEXES,
});

function sanitizeNullableNumber(value, min, max, integer = false) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const clamped = Math.min(max, Math.max(min, num));
  return integer ? Math.round(clamped) : Math.round(clamped * 10) / 10;
}

function sanitizeAvatarUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(trimmed)) return trimmed;
  return "";
}

function sanitizeDateString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || Number.isNaN(Date.parse(trimmed))) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return new Date(trimmed).toISOString().slice(0, 10);
}

export function sanitizeProfilePayload(rawProfile) {
  const input =
    rawProfile && typeof rawProfile === "object" && !Array.isArray(rawProfile) ? rawProfile : {};
  return {
    firstName: typeof input.firstName === "string" ? input.firstName.trim().slice(0, 40) : "",
    lastName: typeof input.lastName === "string" ? input.lastName.trim().slice(0, 40) : "",
    phone: typeof input.phone === "string" ? input.phone.trim().slice(0, 30) : "",
    handle: typeof input.handle === "string" ? input.handle.trim().slice(0, 40) : "",
    location: typeof input.location === "string" ? input.location.trim().slice(0, 80) : "",
    bio: typeof input.bio === "string" ? input.bio.trim().slice(0, 240) : "",
    avatarUrl: sanitizeAvatarUrl(input.avatarUrl),
    weightKg: sanitizeNullableNumber(input.weightKg, 20, 400),
    targetWeightKg: sanitizeNullableNumber(input.targetWeightKg, 20, 400),
    heightCm: sanitizeNullableNumber(input.heightCm, 80, 260),
    restingHeartRate: sanitizeNullableNumber(input.restingHeartRate, 30, 220, true),
    units: input.units === "imperial" ? "imperial" : "metric",
    latestMeasurementDate: sanitizeDateString(input.latestMeasurementDate),
  };
}

export function buildUserProfileRow({
  user_id,
  created_at = null,
  now = new Date(),
  ...rawProfile
}) {
  const sanitized = sanitizeProfilePayload(rawProfile);
  const isoNow = now instanceof Date ? now.toISOString() : String(now);
  const isoCreated = created_at
    ? created_at instanceof Date
      ? created_at.toISOString()
      : String(created_at)
    : isoNow;

  return {
    user_id: Number(user_id),
    first_name: sanitized.firstName,
    last_name: sanitized.lastName,
    phone: sanitized.phone,
    handle: sanitized.handle,
    location: sanitized.location,
    bio: sanitized.bio,
    avatar_url: sanitized.avatarUrl || null,
    weight_kg: sanitized.weightKg,
    target_weight_kg: sanitized.targetWeightKg,
    height_cm: sanitized.heightCm,
    resting_heart_rate: sanitized.restingHeartRate,
    units: sanitized.units,
    latest_measurement_date: sanitized.latestMeasurementDate,
    created_at: isoCreated,
    updated_at: isoNow,
  };
}

export function mapProfileRowToClient(row) {
  if (!row || typeof row !== "object") return null;
  const plain = typeof row.get === "function" ? row.get({ plain: true }) : row;
  return sanitizeProfilePayload({
    firstName: plain.first_name ?? plain.firstName,
    lastName: plain.last_name ?? plain.lastName,
    phone: plain.phone,
    handle: plain.handle,
    location: plain.location,
    bio: plain.bio,
    avatarUrl: plain.avatar_url ?? plain.avatarUrl ?? "",
    weightKg: plain.weight_kg ?? plain.weightKg,
    targetWeightKg: plain.target_weight_kg ?? plain.targetWeightKg,
    heightCm: plain.height_cm ?? plain.heightCm,
    restingHeartRate: plain.resting_heart_rate ?? plain.restingHeartRate,
    units: plain.units,
    latestMeasurementDate: plain.latest_measurement_date ?? plain.latestMeasurementDate,
  });
}
