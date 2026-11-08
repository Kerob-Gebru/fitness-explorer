// Central place for data-source settings.

// Available data sources:
// mock    = local demo data
// live    = ExerciseDB RapidAPI
// backend = Express + MariaDB

export const DATA_SOURCE =
  import.meta.env.VITE_DATA_SOURCE || 'mock'

export const USE_MOCK_DATA = DATA_SOURCE === 'mock'
export const USE_BACKEND_DATA = DATA_SOURCE === 'backend'
export const USE_LIVE_DATA = DATA_SOURCE === 'live'

export const MOCK_SIMULATE_ERROR =
  import.meta.env.VITE_MOCK_SIMULATE_ERROR === 'true'