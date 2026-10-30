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

function monthOffset(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(date)
}

export function getCompletedWorkoutSessions(history, now = new Date()) {
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
  return sessions.sort((first, second) => second.completedAt - first.completedAt)
}

function countByPeriod(sessions, keyForSession, key) {
  return sessions.filter((session) => keyForSession(session) === key).length
}

function collectTrackedWork(session) {
  const sets = (Array.isArray(session.exercises) ? session.exercises : []).flatMap((exercise) =>
    Array.isArray(exercise?.sets) ? exercise.sets : [])
  const completedSets = sets.filter((set) => set?.completed === true)
  return {
    sets: completedSets.length,
    reps: completedSets.reduce((total, set) => total + (Number.isFinite(Number(set.reps)) && Number(set.reps) > 0
      ? Number(set.reps)
      : 0), 0),
  }
}

export function calculateWorkoutProgress(history, now = new Date()) {
  const currentDate = now instanceof Date
    ? Number.isNaN(now.getTime()) ? new Date() : now
    : validDate(now) ?? new Date()
  const sessions = getCompletedWorkoutSessions(history, currentDate)
  const todayKey = localDateKey(currentDate)
  const mondayOffset = (currentDate.getDay() + 6) % 7
  const weekStart = dayOffset(currentDate, -mondayOffset)
  const weekStartKey = localDateKey(weekStart)
  const monthStartKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = dayOffset(weekStart, index)
    const key = localDateKey(date)
    return {
      date: key,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      count: countByPeriod(sessions, (session) => localDateKey(session.completedAt), key),
    }
  })
  const weeklyWorkouts = sessions.filter((session) => {
    const key = localDateKey(session.completedAt)
    return key >= weekStartKey && key <= todayKey
  }).length
  const monthlyWorkouts = sessions.filter((session) => {
    const key = localDateKey(session.completedAt)
    return key >= monthStartKey && key <= todayKey
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

  const completedDaysThisWeek = new Set(sessions
    .map((session) => localDateKey(session.completedAt))
    .filter((key) => key >= weekStartKey && key <= todayKey)).size
  const recentStartKey = localDateKey(dayOffset(currentDate, -27))
  const recentWorkouts = sessions.filter((session) => {
    const key = localDateKey(session.completedAt)
    return key >= recentStartKey && key <= todayKey
  }).length
  const weeklyTrends = Array.from({ length: 6 }, (_, index) => {
    const start = dayOffset(weekStart, (index - 5) * 7)
    const end = dayOffset(start, 6)
    const startKey = localDateKey(start)
    const endKey = localDateKey(end)
    return {
      key: startKey,
      label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start),
      count: sessions.filter((session) => {
        const key = localDateKey(session.completedAt)
        return key >= startKey && key <= endKey && key <= todayKey
      }).length,
    }
  })
  const monthlyTrends = Array.from({ length: 6 }, (_, index) => {
    const date = monthOffset(currentDate, index - 5)
    const key = monthKey(date)
    return {
      key,
      label: monthLabel(date),
      count: countByPeriod(sessions, (session) => monthKey(session.completedAt), key),
    }
  })
  const durations = sessions
    .map((session) => Number(session.durationSeconds))
    .filter((duration) => Number.isFinite(duration) && duration > 0)
  const trackedTotals = sessions.reduce((totals, session) => {
    const tracked = collectTrackedWork(session)
    return { sets: totals.sets + tracked.sets, reps: totals.reps + tracked.reps }
  }, { sets: 0, reps: 0 })
  const milestones = [1, 5, 10, 25, 50].map((target) => ({
    id: `workouts-${target}`,
    target,
    achieved: sessions.length >= target,
    label: target === 1 ? 'First completed workout' : `${target} completed workouts`,
  }))

  return {
    totalWorkouts: sessions.length,
    weeklyWorkouts,
    monthlyWorkouts,
    currentStreak,
    longestStreak,
    exercisesCompleted: sessions.reduce((total, session) => total + (Array.isArray(session.exercises)
      ? session.exercises.filter((exercise) => exercise.status === 'completed' ||
        (!exercise.status && Array.isArray(exercise.sets) && exercise.sets.some((set) => set?.completed === true))).length
      : 0), 0),
    completedDaysThisWeek,
    recentWorkouts,
    recentWeeklyAverage: recentWorkouts / 4,
    weeklyTrends,
    monthlyTrends,
    durationSamples: durations.length,
    averageDurationMinutes: durations.length
      ? durations.reduce((total, duration) => total + duration, 0) / durations.length / 60
      : null,
    trackedSets: trackedTotals.sets,
    trackedReps: trackedTotals.reps,
    milestones,
    weekDays,
  }
}

export function formatSessionDate(value) {
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : validDate(value)
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Date unavailable'
}
