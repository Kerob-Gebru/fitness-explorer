# Fitness Explorer Backend API

Base URL: `/api` (standalone backend default port `5000`; full-stack dev server port `3000`).

## Health
- `GET /api/health` — Returns `{ success: true, message, timestamp }`.

## Authentication & Sessions (`/api/auth`)
- `POST /api/auth/register` — Create account (`{ displayName, email, password }`). Sets `fe_refresh_token` HttpOnly cookie and returns `user`, `session`, `accessToken`, `schema` (`auth_sessions`), and `profileSchema` (`user_profiles`).
- `POST /api/auth/login` — Sign in (`{ email, password }`). Rotates/creates session and sets `fe_refresh_token` cookie.
- `POST /api/auth/refresh` — Rotate refresh token (`fe_refresh_token` cookie or body `refreshToken`) with reuse-detection revocation.
- `POST /api/auth/restore` — Restore authenticated session silently on reload from the `fe_refresh_token` cookie.
- `POST /api/auth/logout` — Revoke active session and clear refresh cookie.
- `PATCH /api/auth/profile` *(Bearer Auth)* — Update `displayName` and/or `email`.
- `POST /api/auth/change-password` *(Bearer Auth)* — Verify `currentPassword` and update to `newPassword`.
- `POST /api/auth/avatar` *(Bearer Auth, multipart `image`)* — Validate magic bytes and save avatar under `/uploads/`.
- `DELETE /api/auth/avatar` *(Bearer Auth)* — Clear member avatar and remove uploaded file.
- `GET /api/auth/sessions` *(Bearer Auth)* — List recent sessions + `auth_sessions` and `user_profiles` table metadata.
- `DELETE /api/auth/sessions/:id` *(Bearer Auth)* — Revoke one session by UUID.
- `POST /api/auth/logout-all` *(Bearer Auth)* — Revoke all active sessions for the signed-in user.

## User State & Profile Sync (`/api/user-state`)
- `GET /api/user-state` *(Bearer Auth)* — Fetch saved favorites, recent exercises, profile metrics (`user_profiles`), workout plans/history/goals, and `profileSchema`.
- `PUT /api/user-state` *(Bearer Auth)* — Persist sanitized user state and upsert `user_profiles` row.

## Exercises & Media (`/api/exercises`, `/uploads`)
- `GET /api/exercises` — Paginated, filterable (`body_part`, `target_muscle`, `equipment`, `search`) exercise list.
- `GET /api/exercises/:id` — Single exercise detail.
- `POST /api/exercises` — Create a custom database exercise.
- `PUT /api/exercises/:id` — Update a database exercise.
- `DELETE /api/exercises/:id` — Delete a database exercise.
- `GET /api/exercises/uploads/manifest` — Uploaded exercise image manifest.
- `POST /api/exercises/:id/upload` *(multipart `image`)* — Upload exercise image (JPG/PNG/GIF/WEBP, max 5 MB).
- `GET /uploads/:filename` — Static uploaded media files.
