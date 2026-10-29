# Fitness & Workout Explorer

A practice project for learning React. Search and filter exercises, explore detailed instructions, save favorites, revisit recent exercises, and create workout plans and track completed sessions locally after you refresh the browser.

**By default the app uses built-in demo data (24 hand-written sample exercises), so it works right away with no API key.**

## Technologies

React, Vite, JavaScript (JSX), Zustand (with the `persist` middleware and localStorage), React Router, plain CSS, ESLint. There is no backend and no database.

## Run it on Windows with VS Code

1. Install **Node.js** (LTS version, 20.19 or newer, or 22.12 or newer) from https://nodejs.org. Restart your computer or VS Code afterwards.
2. Right-click the ZIP file, choose **Extract All...**, and pick a folder (for example `C:\Projects`).
3. Open **VS Code**, choose **File > Open Folder...**, and select the extracted `fitness-explorer` folder (the one that contains `package.json`).
4. Open the terminal in VS Code (**Terminal > New Terminal**) and run:

```bash
npm install
npm run dev
```

5. Open the address shown in the terminal (normally http://localhost:5173).

Other commands: `npm run build` (production build), `npm run preview` (serve the build), `npm run lint` (code checks).

## Features

- Personalized home dashboard with activity summaries, calendar-week chart, recent completed workouts, saved plans, quick actions, and exercise discovery
- Explore page with debounced name search, filters (body part, target muscle, equipment) and "Show more"
- Exercise details page at `/exercises/:id` with demonstration media, primary and secondary muscles, equipment, numbered instructions, source-provided guidance, related exercises, and favorite/workout actions
- Favorites page, saved in the browser (localStorage) and kept after refresh, no duplicates
- Workout builder with add/remove controls, editable saved workout plans, and print-friendly layout
- In-progress sessions saved locally, completed set/repetition tracking, and reviewable workout history
- Monthly workout calendar with persistent plan scheduling, rescheduling, cancellation, overdue status, and scheduled-session completion
- Workout progress summary with completed workout counts, current calendar-week activity, and current/longest streaks
- Workout plans, active session progress, scheduled workouts, and completed history share the existing `fitness-explorer-workout` localStorage key; workout data stays in this browser
- Recently viewed exercises on the homepage, saved locally
- Explore sorting by recommended order, name A–Z, name Z–A, and body part
- Loading, error, empty-result and empty-favorites states; image fallback; friendly not-found pages
- Responsive layout (desktop, tablet, mobile) with keyboard focus styles, labelled controls and a skip link

## Project structure

```text
src/
  app/routes.jsx            route table
  components/               common/, layout/, exercises/ (reusable UI)
  features/                 favorites, search, recent-view and workout Zustand stores
                            workoutProgress.js calculates history-based dashboard statistics
  hooks/                    useDebounce, useAsyncData, useDocumentTitle
  layouts/MainLayout.jsx    navbar, footer and shared route layout
  pages/                    Home, Explore, ExerciseDetails, Favorites, Workout, NotFound
  services/                 ALL data access (see below)
  utils/formatExercise.js   small formatting helpers
```

## Settings (optional)

Copy `.env.example` to `.env` and edit the copy. Restart `npm run dev` after any change.

| Variable | Meaning |
|---|---|
| `VITE_USE_MOCK_DATA` | `true` (default) = demo data. `false` = live ExerciseDB data. |
| `VITE_MOCK_SIMULATE_ERROR` | `true` makes demo requests fail, so you can see the error screen. |
| `VITE_RAPIDAPI_KEY`, `VITE_RAPIDAPI_HOST`, `VITE_RAPIDAPI_BASE_URL` | Live mode only. Placeholders in `.env.example`. |

## Live ExerciseDB mode

Components only import `src/services/exerciseApi.js`, which chooses between `mockExerciseApi.js` (demo data) and `liveExerciseApi.js` (RapidAPI).

`liveExerciseApi.js` uses the endpoints and response fields published in the official OpenAPI document (https://v2.exercisedb.io/docs, v2.1.0):

- `GET /exercises?limit=0` — full library, cached for the session so search and filters run locally without spending a request per keystroke
- `GET /exercises/exercise/{id}`
- `GET /exercises/bodyPartList`, `/targetList`, `/equipmentList`
- Headers: `X-RapidAPI-Key` and `X-RapidAPI-Host`

To use it:

1. Subscribe to ExerciseDB on RapidAPI and copy your key.
2. Put the key in `.env` (`VITE_RAPIDAPI_KEY`) and set `VITE_USE_MOCK_DATA=false`.
3. Restart `npm run dev`.

The API returns CORS headers for the browser dev origin, so no proxy is needed locally. Each exercise's `gifUrl` changes once per day; favorites store a full copy of the exercise and the app has an image fallback.

## API key safety

- Never commit a real key. `.env.local` is ignored by Git (see `.gitignore`); `.env.example` holds placeholders only.
- **Anything starting with `VITE_` is placed in the browser bundle and can be read by anyone who opens the site.** It is not secret. That is acceptable for local learning, but a public deployment should call the API through a server-side proxy that keeps the key private.

## Testing status

`npm run lint` and `npm run build` pass. Demo mode is verified in a browser. The live ExerciseDB code follows the published OpenAPI document, and the API host was checked for reachability and CORS headers without a key; a request with a real subscription key has not been run in this environment.
