import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import ExplorePage from '../pages/ExplorePage.jsx'
import ExerciseDetailsPage from '../pages/ExerciseDetailsPage.jsx'
import FavoritesPage from '../pages/FavoritesPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import WorkoutPage from '../pages/WorkoutPage.jsx'
import WorkoutCalendarPage from '../pages/WorkoutCalendarPage.jsx'
import WorkoutSessionPage from '../pages/WorkoutSessionPage.jsx'
import ProgressPage from '../pages/ProgressPage.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'exercises/:id', element: <ExerciseDetailsPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'workout/session', element: <WorkoutSessionPage /> },
      { path: 'calendar', element: <WorkoutCalendarPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
