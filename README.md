# Fitness & Workout Explorer

A practice project for learning React. Search and filter exercises, explore detailed instructions, save favorites, revisit recent exercises, and build a personal workout plan that stays saved after you refresh the browser.

**By default the app uses built-in demo data (24 hand-written sample exercises), so it works right away with no API key.** A "Demo data" banner is always shown in this mode.

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

- Home page with search, body-part shortcuts and featured exercises
- Explore page with debounced name search, filters (body part, target muscle, equipment) and "Show more"
- Exercise details page at `/exercises/:id` with facts, instructions and a favorite button
- Favorites page, saved in the browser (localStorage) and kept after refresh, no duplicates
- Workout builder with add/remove controls, a persistent plan, exercise count, and print-friendly layout
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
  hooks/                    useDebounce, useAsyncData, useDocumentTitle
  layouts/MainLayout.jsx    navbar, demo banner, footer
  pages/                    Home, Explore, ExerciseDetails, Favorites, NotFound
  services/                 ALL data access (see below)
  utils/formatExercise.js   small formatting helpers
```

## Settings (optional)

Copy `.env.example` to `.env.local` and edit the copy. Restart `npm run dev` after any change.

| Variable | Meaning |
|---|---|
| `VITE_USE_MOCK_DATA` | `true` (default) = demo data. `false` = live mode (not finished, see below). |
| `VITE_MOCK_SIMULATE_ERROR` | `true` makes demo requests fail, so you can see the error screen. |
| `VITE_RAPIDAPI_KEY`, `VITE_RAPIDAPI_HOST`, `VITE_RAPIDAPI_BASE_URL` | Live mode only. Placeholders in `.env.example`. |

## Live ExerciseDB mode: NOT verified

Components only import `src/services/exerciseApi.js`, which chooses between `mockExerciseApi.js` (demo data) and `liveExerciseApi.js` (RapidAPI).

**The live file has never been run against the real service.** When this project was created, the official ExerciseDB pages could not be read in full, so these are still unknown:

- the current free-plan limits and whether a credit card is required
- the exact endpoint paths, parameters and response fields
- whether the API works directly from a browser (CORS)

For that reason `ENDPOINTS` in `liveExerciseApi.js` is empty on purpose. With `VITE_USE_MOCK_DATA=false` the app shows a clear "Live data is not set up" message instead of guessing. To finish live mode:

1. Subscribe to ExerciseDB on RapidAPI and read its documentation (https://v2.exercisedb.io/docs).
2. Put the real paths in `ENDPOINTS` and check `normalizeExercise()` against one real response.
3. Test in the browser. If you see a CORS error, the API cannot be called directly from a browser and a small server-side proxy would be needed. Ask before adding one.

One thing the RapidAPI listing does state: each exercise's `gifUrl` changes once per day. That is why favorites store a full copy of the exercise and why the app has an image fallback.

## API key safety

- Never commit a real key. `.env.local` is ignored by Git (see `.gitignore`); `.env.example` holds placeholders only.
- **Anything starting with `VITE_` is placed in the browser bundle and can be read by anyone who opens the site.** It is not secret. That is acceptable for local learning, but a public deployment should call the API through a server-side proxy that keeps the key private.

## Testing status

The original project documentation reports that the baseline version passed install, lint, build, and a headless-browser check using demo data. This upgrade adds a workout builder, persisted recent views, and sorting. In the current editing environment, dependency installation timed out and Vite was not available, so the upgraded version could not be confirmed with a fresh production build here. Please run `npm install`, `npm run lint`, and `npm run build` after extracting the ZIP. Live ExerciseDB requests remain unverified.
