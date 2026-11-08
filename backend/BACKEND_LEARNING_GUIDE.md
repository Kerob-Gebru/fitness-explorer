# Fitness Explorer Backend Learning Guide

This guide describes the backend as implemented in this project. The API uses
Express, Sequelize v6, and the existing MySQL-compatible MariaDB database. It
maps to the existing `fitness_explorer.exercises` table and does not create or
alter tables automatically.

## 1. Backend architecture

The request path for an exercise API call is:

```text
React page or component
  -> src/services/backendExerciseApi.js
  -> Express middleware in backend/src/server.js
  -> backend/src/routes/exerciseRoutes.js
  -> backend/src/controllers/exerciseController.js
  -> backend/src/models/exerciseModel.js
  -> backend/src/models/Exercise.js
  -> Sequelize instance in backend/src/config/db.js
  -> MariaDB
  -> controller JSON response
  -> frontend normalization and rendering
```

Image bytes take a slightly different path. Multer stores the bytes in
`backend/uploads/`; the upload controller uses the `Exercise` model to save a
relative URL in `exercises.gif_url`. Express later serves that file through the
`/uploads` static URL.

## 2. Folders and file responsibilities

| Path | Responsibility |
|---|---|
| `backend/package.json` | Backend scripts and dependencies. |
| `backend/package-lock.json` | Exact dependency tree used by npm. |
| `backend/.env` | Local server and database settings; keep credentials private. |
| `backend/src/server.js` | Express setup, middleware order, routes, static uploads, errors, and startup. |
| `backend/src/config/db.js` | Shared Sequelize instance and database authentication check. |
| `backend/src/models/Exercise.js` | Sequelize definition for the existing `exercises` table. |
| `backend/src/models/exerciseModel.js` | Reusable list, count, read, create, update, and delete operations. |
| `backend/src/controllers/exerciseController.js` | HTTP validation and response formatting for exercise endpoints. |
| `backend/src/controllers/uploadController.js` | Connects a stored image file to an exercise record. |
| `backend/src/middleware/uploadMiddleware.js` | Multer disk storage, file type checks, and upload limits. |
| `backend/src/routes/exerciseRoutes.js` | Maps URLs and methods to controller functions. |
| `backend/uploads/` | Disk storage for uploaded exercise images. |

The model file and Sequelize configuration describe existing schema; there is
no migration or schema-sync command in the startup path.

## 3. What Sequelize does here

Sequelize is an object-relational mapper (ORM). Instead of writing a SQL string
for every database operation, backend code calls model methods such as
`Exercise.findAll()` and `Exercise.create()`. Sequelize converts those calls
into parameterized SQL for the configured dialect.

This project uses Sequelize's MySQL dialect with the existing `mysql2` driver.
MariaDB supports the MySQL protocol used here. The code continues to use the
existing database rather than asking Sequelize to create or alter a schema.

## 4. Database connection

`backend/src/config/db.js` loads environment variables and creates one shared
Sequelize instance with:

- Database name from `DB_NAME`, defaulting to `fitness_explorer`.
- User from `DB_USER`, defaulting to `root`.
- Password from `DB_PASSWORD`, defaulting to an empty string.
- Host from `DB_HOST`, defaulting to `localhost`.
- Port from `DB_PORT`, defaulting to `3306`.
- A connection pool with at most ten connections.

`testDatabaseConnection()` calls `sequelize.authenticate()`. This checks whether
the database can be reached with the configured settings. It does not create or
modify tables.

The server calls that check before `app.listen()`. If authentication fails,
startup logs a failure and exits. Never put actual passwords in source code or
frontend variables.

## 5. Exercise model and existing schema

`backend/src/models/Exercise.js` maps the JavaScript model `Exercise` to the
physical table `exercises`. The model uses the existing snake_case column names:

| Model attribute | Database column |
|---|---|
| `id` | `id` |
| `external_id` | `external_id` |
| `name` | `name` |
| `body_part` | `body_part` |
| `target_muscle` | `target_muscle` |
| `equipment` | `equipment` |
| `instructions` | `instructions` |
| `gif_url` | `gif_url` |
| Sequelize `created_at` timestamp | `created_at` |
| Sequelize `updated_at` timestamp | `updated_at` |

The table name and both timestamp column names are explicit. This prevents
Sequelize's default pluralization or camelCase timestamp names from being used.
The model declares `id` as an auto-increment primary key, `external_id` as
nullable and unique, `name` as required, and the remaining content fields as
nullable. It also describes indexes for `body_part`, `target_muscle`, and
`equipment`.

The confirmed database already has six records. No sync, alter, force, or
migration operation is called by the application, so starting the server does
not rewrite the table.

## 6. CRUD operations

The route file maps HTTP requests to `exerciseController.js`. That controller
validates inputs and builds response envelopes. The controller calls
`exerciseModel.js`, which delegates to `Exercise` model methods.

| Operation | Model method | Result |
|---|---|---|
| List exercises | `Exercise.findAll()` | Matching rows for the requested page. |
| Count matching rows | `Exercise.count()` | Total used for pagination metadata. |
| Read one | `Exercise.findByPk(id)` | An instance or `null`. |
| Create | `Exercise.create(values)` | A new instance; the wrapper returns its ID. |
| Update | `Exercise.update(values, { where: { id } })` | Number of affected rows. |
| Delete | `Exercise.destroy({ where: { id } })` | Number of deleted rows. |

The list controller returns `success`, `pagination`, `count`, and `data`.
Create returns HTTP 201 and `success`, `message`, and `data`. A single read
returns `success` and `data`. Update and delete return `success` and `message`.

## 7. Search, filters, sorting, and pagination

`buildExerciseFilters()` builds Sequelize `where` conditions:

- `body_part`, `target_muscle`, and `equipment` are exact matches.
- `search` uses `Op.or` to search `name`, `body_part`, `target_muscle`, and
  `equipment` with `Op.like` and `%search%`.
- Multiple filter types are combined with `Op.and`.

`getAllExercises()` accepts `page`, `limit`, `sortBy`, and `order`. It clamps
page to at least 1, clamps limit between 1 and 100, computes
`offset = (page - 1) * limit`, checks the sort column against an explicit
allowlist, and accepts only `ASC` or `DESC`. Invalid sort columns fall back to
`id`, and unrecognized order values become `DESC`.

The controller calls `countExercises()` with the same filters and calculates
`totalPages`, `hasNextPage`, and `hasPreviousPage`. This lets the client show a
page of rows while also knowing how many rows match overall.

Example:

```text
GET /api/exercises?search=press&body_part=chest&page=1&limit=10&sortBy=name&order=ASC
```

## 8. Image uploads

The router uses `upload.single("image")`; therefore the multipart file field
must be named `image`. Multer checks the filename extension and MIME type,
limits requests to one image, and caps each file at 5 MiB. It writes the bytes
to `backend/uploads/` under a UUID-based filename.

The upload controller then:

1. Validates the exercise ID.
2. Uses `Exercise.findByPk()` to check for the exercise.
3. Creates a relative URL such as `/uploads/<uuid>.jpg`.
4. Calls `exercise.update({ gif_url: imageUrl })`.
5. Returns `data.exerciseId`, `data.imageUrl`, and `data.filename`.

The server's `express.static` middleware exposes the disk folder at `/uploads`.
The frontend resolves the relative image URL against its configured backend
API base URL. If the exercise is missing or the database update fails, the
controller attempts to remove the newly stored file.

## 9. Routes and controllers

`backend/src/routes/exerciseRoutes.js` is the route table. A route selects an
HTTP method and path, then calls a controller. The controller is responsible
for translating that request into model calls and an HTTP response. The model
does not know about Express request or response objects.

For uploads, the route adds Multer between the URL and the controller. Multer
places the uploaded file details on `req.file`; the controller then associates
that file with a row.

## 10. Frontend communication

`src/services/config.js` selects `mock`, `live`, or `backend` through
`VITE_DATA_SOURCE`. In backend mode, `src/services/exerciseApi.js` delegates
calls to `src/services/backendExerciseApi.js`.

The backend service reads `VITE_BACKEND_API_URL`, defaulting to
`http://localhost:5000/api`, and calls the routes with `fetch()`. It converts
database names into frontend names, including `body_part` to `bodyPart`,
`target_muscle` to `target`, and `gif_url` to `gifUrl`. It resolves relative
image URLs against the backend origin and wraps string instructions in an
array.

The upload component, `src/components/exercises/ExerciseImageUpload.jsx`,
submits a `FormData` body with the field name `image`. It does not manually
set the multipart `Content-Type`, allowing the browser to provide its boundary.
The API client expects the upload response at `data.imageUrl`.

## 11. Errors and status codes

The exercise controller returns:

- `400` for invalid IDs or a missing/invalid required name.
- `404` when an exercise is not found.
- `409` when the unique `external_id` constraint is violated.
- `500` for unexpected database or server errors.

The global upload handler returns `413` for the file-size limit, `400` for
other Multer or file-type errors, and `500` for other uncaught errors. The
upload controller returns `400` for an invalid ID or missing file and `404`
when the exercise does not exist.

Controllers log more specific error details on the server while generally
returning a short message to the client. Do not send database credentials or
raw stack traces in an API response.

## 12. Important implementation decisions

- The existing table and column names are retained.
- Sequelize v6 is used with the existing `mysql2` driver.
- The model describes indexes but no automatic synchronization is run.
- Model operations replace raw SQL operations in application code.
- The public API response envelopes remain compatible with the frontend.
- Sort columns are allowlisted instead of interpolating arbitrary query input.
- Upload URLs remain relative in the database, preserving the existing storage
  and frontend URL construction behavior.
- Disk writes and database updates are separate systems; cleanup is attempted
  if a database operation fails.

## 13. Common debugging problems

1. **Server exits during startup:** verify the backend is launched with the
   expected environment and can reach the MariaDB host and port.
2. **Access denied:** check `DB_USER` and `DB_PASSWORD` without printing them
   into logs or source control.
3. **Unknown database:** verify `DB_NAME` is `fitness_explorer`.
4. **Connection refused:** verify MariaDB is running and `DB_HOST`/`DB_PORT`
   match the service.
5. **Unknown column:** compare model attributes to the existing table names.
   Do not solve this with `sync({ alter: true })` against user data.
6. **Timestamp errors:** check that `created_at` and `updated_at` are mapped
   explicitly and exist in the table.
7. **Frontend CORS error:** verify `CLIENT_ORIGIN` matches the browser's
   frontend origin exactly.
8. **Image upload gets 400:** check the multipart field name is `image`, the
   extension/MIME pair is allowed, and the file is within the size limit.
9. **Image appears broken:** check that the returned `/uploads/...` path is
   served by the same backend host used by the frontend.
10. **Duplicate external ID gets 500:** confirm the controller recognizes
    Sequelize's unique-constraint error and the database unique index exists.
11. **List filters do not match:** exact filters are case/collation dependent;
    search uses SQL `LIKE` behavior.
12. **No tests appear to run:** backend `npm test` is a placeholder until a
    backend test suite is added.

## 14. Supervisor questions and answers

1. **What is Sequelize?**  
   It is an ORM that lets JavaScript code work with database rows as model
   instances instead of writing each SQL statement by hand.

2. **Why use an ORM in this project?**  
   The project requirement is Sequelize, and model operations centralize how
   application records map to the existing table.

3. **What database is configured?**  
   The confirmed database name is `fitness_explorer`; the connection uses
   Sequelize's MySQL dialect with the existing MariaDB-compatible server.

4. **What driver does Sequelize use?**  
   It uses the installed `mysql2` package for the MySQL-compatible connection.

5. **Does Sequelize create the table at startup?**  
   No. The server calls `authenticate()`, not `sync()`.

6. **What does `authenticate()` do?**  
   It checks whether Sequelize can connect using the configured database
   credentials; it does not migrate or create tables.

7. **What table does the model use?**  
   `Exercise` explicitly maps to the existing `exercises` table.

8. **Why specify `tableName`?**  
   It prevents Sequelize from guessing a pluralized table name.

9. **How is the primary key defined?**  
   `id` is an integer primary key with auto-increment enabled.

10. **How is `external_id` protected?**  
    The model marks it nullable and unique, matching the database constraint.

11. **Why map `createdAt` and `updatedAt`?**  
    The database uses `created_at` and `updated_at`; explicit mappings prevent
    Sequelize from expecting camelCase columns.

12. **What does `findAll()` do?**  
    It retrieves multiple rows matching a `where` condition and query options.

13. **What does `findByPk()` do?**  
    It retrieves one row using the model's declared primary key.

14. **What does `create()` do?**  
    It inserts a row and returns a Sequelize instance for that new record.

15. **What does `update()` return here?**  
    The wrapper returns the number of rows affected by the update operation.

16. **What does `destroy()` do?**  
    It deletes matching rows and returns the number deleted.

17. **How are SQL values protected?**  
    Sequelize builds parameterized queries from model options rather than
    concatenating user values into SQL strings.

18. **How is sorting protected?**  
    The model checks `sortBy` against a fixed allowlist before using it.

19. **What orders are accepted?**  
    Case-insensitive `ASC` is ascending; all other values resolve to `DESC`.

20. **How does pagination work?**  
    The code computes an offset from page and limit, then passes both to
    `findAll()`.

21. **What is the maximum page size?**  
    The limit is clamped between 1 and 100.

22. **How does search work?**  
    `Op.or` and `Op.like` search four exercise text fields.

23. **How are body-part filters applied?**  
    `body_part` is an exact match and combines with other filters using `Op.and`.

24. **Why does the list controller call count separately?**  
    It needs the total number of matching rows to calculate pagination
    metadata.

25. **What is the list response envelope?**  
    It contains `success`, `pagination`, `count`, and `data`.

26. **What does a single-exercise response contain?**  
    It contains `success` and `data`.

27. **What status represents invalid input?**  
    The controller returns HTTP 400 for invalid IDs and missing required names.

28. **What happens when an exercise does not exist?**  
    Read, update, delete, and upload handlers return HTTP 404 when no row is
    found.

29. **How are duplicate external IDs reported?**  
    Sequelize unique-constraint errors are mapped to HTTP 409.

30. **How does Multer receive the uploaded file?**  
    The route uses `upload.single("image")`, which parses one field named
    `image` into `req.file`.

31. **Where does Multer store files?**  
    In the backend's `uploads` directory.

32. **How are filenames generated?**  
    A random UUID is combined with the lowercased file extension.

33. **What upload formats are accepted?**  
    JPG, JPEG, PNG, GIF, and WEBP, paired with the corresponding accepted MIME
    type.

34. **What is the file-size limit?**  
    Five mebibytes per file, with one file allowed per request.

35. **How is an uploaded image connected to an exercise?**  
    Its relative `/uploads/<filename>` URL is saved in `gif_url`.

36. **How does the browser retrieve the uploaded image?**  
    Express serves the uploads directory at `/uploads`, and the frontend
    resolves that relative path against the backend API base URL.

37. **What happens if the exercise ID is invalid after file storage?**  
    The upload controller attempts to remove the file Multer already stored and
    returns HTTP 400.

38. **What happens if the database update fails after upload?**  
    The controller attempts to remove the new file and returns HTTP 500.

39. **Why keep `mysql2` installed?**  
    Sequelize's MySQL dialect relies on it as the underlying database driver.

40. **What environment variables configure the connection?**  
    `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.

41. **What does `CLIENT_ORIGIN` configure?**  
    It specifies the frontend origin allowed by the CORS middleware.

42. **How does the frontend select this backend?**  
    It uses `VITE_DATA_SOURCE=backend` and the backend API URL configuration.

43. **How are DB field names converted for React?**  
    The frontend service maps snake_case properties to the expected frontend
    property names.

44. **Why should a controller not contain SQL?**  
    Separating HTTP logic from data access makes request handling and model
    behavior easier to understand and maintain.

45. **Does the project run migrations automatically?**  
    No. There is no migration or schema synchronization in the startup code.

46. **Are the six existing rows changed by this conversion?**  
    No database command was run during the conversion, and the server does not
    synchronize the schema on startup.

47. **Are backend tests included?**  
    No. The backend test script is still a placeholder that exits with an
    error.

48. **What should be tested before production?**  
    Verify CRUD, filtering, duplicate handling, and upload behavior against a
    non-production database using the same schema.

49. **Can a Sequelize transaction roll back a file write?**  
    No. A file write is outside the database transaction, so application code
    must explicitly remove the file if the database operation fails.

50. **Why not call `sync({ alter: true })`?**  
    It can modify the real schema automatically. This project must preserve its
    existing table and records, so schema changes require a deliberate,
    separately reviewed migration.
