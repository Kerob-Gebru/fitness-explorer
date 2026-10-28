// Small error classes so pages can show the right message.
export class NotFoundError extends Error {
  constructor(message = 'That exercise could not be found.') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ApiNotVerifiedError extends Error {
  constructor(
    message = 'Live ExerciseDB mode is not set up yet. The endpoints have not been verified. Set VITE_USE_MOCK_DATA=true to use demo data.',
  ) {
    super(message)
    this.name = 'ApiNotVerifiedError'
  }
}

export class ApiRequestError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}
