// Central place for data-source settings.
// Demo (mock) data is the default. Set VITE_USE_MOCK_DATA=false in .env to use live mode.
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false'
export const MOCK_SIMULATE_ERROR = import.meta.env.VITE_MOCK_SIMULATE_ERROR === 'true'
