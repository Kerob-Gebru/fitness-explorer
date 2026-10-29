function validDate(value) {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayOffset(date, offset) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + offset)
  return result
}

function dateKeyOffset(key, offset) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + offset))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function calendarDayNumber(key) {
  const [year, month, day] = key.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86400000
}

export function calculateWorkoutProgress(history, now = new Date()) {
  const currentDate = now instanceof Date
    ? Number.isNaN(now.getTime()) ? new Date() : now
    : validDate(now) ?? new Date()
  const sessions = []
  const seenIds = new Set()
  for (const session of Array.isArray(history) ? history : []) {
    if (!session || session.status !== 'completed' || typeof session.id !== 'string' || seenIds.has(session.id)) continue
    const completedAt = validDate(session.completedAt)
    if (!completedAt || completedAt > currentDate) continue
    seenIds.add(session.id)
    sessions.push({ ...session, completedAt })
  }

  const todayKey = localDateKey(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = dayOffset(currentDate, index - 6)
    const key = localDateKey(date)
    return {
      date: key,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      count: sessions.filter((session) => localDateKey(session.completedAt) === key).length,
    }
  })
  const weekStartKey = weekDays[0].date
  const weeklyWorkouts = sessions.filter((session) => {
    const key = localDateKey(session.completedAt)
    return key >= weekStartKey && key <= todayKey
  }).length
  const completedDays = [...new Set(sessions.map((session) => localDateKey(session.completedAt)))].sort()

  let longestStreak = 0
  let run = 0
  let previousDayNumber = null
  for (const key of completedDays) {
    const dayNumber = calendarDayNumber(key)
    run = previousDayNumber != null && dayNumber - previousDayNumber === 1 ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
    previousDayNumber = dayNumber
  }

  const yesterdayKey = localDateKey(dayOffset(currentDate, -1))
  const latestDay = completedDays.at(-1)
  let currentStreak = 0
  if (latestDay === todayKey || latestDay === yesterdayKey) {
    let expectedDate = latestDay
    for (let index = completedDays.length - 1; index >= 0; index -= 1) {
      if (completedDays[index] !== expectedDate) break
      currentStreak += 1
      expectedDate = dateKeyOffset(expectedDate, -1)
    }
  }

  const exercisesCompleted = sessions.reduce((total, session) => total + (Array.isArray(session.exercises)
    ? session.exercises.filter((exercise) => Array.isArray(exercise.sets) && exercise.sets.some((set) => set?.completed === true)).length
    : 0), 0)

  return {
    totalWorkouts: sessions.length,
    weeklyWorkouts,
    currentStreak,
    longestStreak,
    exercisesCompleted,
    weekDays,
  }
}

export function formatSessionDate(value) {
  const date = validDate(value)
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Date unavailable'
}
