import { localDateKey } from './workoutProgress.js'

export function parseLocalDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}

export function getMonthCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)
  const days = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    days.push({
      date,
      key: localDateKey(date),
      inMonth: date.getMonth() === month,
    })
  }
  return days
}

export function formatDateKey(value, options = { dateStyle: 'full' }) {
  const date = parseLocalDateKey(value)
  return date ? new Intl.DateTimeFormat(undefined, options).format(date) : 'Date unavailable'
}
