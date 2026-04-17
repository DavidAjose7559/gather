import { todayToronto, formatDateToronto } from './date'

export function calculateStreak(
  checkIns: { check_in_date: string }[]
): number {
  if (checkIns.length === 0) return 0

  const checkedDates = new Set(checkIns.map((c) => c.check_in_date))
  const todayStr = todayToronto()
  const hasToday = checkedDates.has(todayStr)

  // Start counting from today if checked in, otherwise from yesterday
  // so the streak doesn't reset mid-day before the user checks in
  const cursor = new Date()
  if (!hasToday) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const dateStr = formatDateToronto(cursor)
    if (!checkedDates.has(dateStr)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export const STREAK_MILESTONES = [7, 14, 30, 60]

export function getNewMilestone(streak: number, userId: string): number | null {
  if (typeof window === 'undefined') return null
  const key = `gather_milestones_${userId}`
  const seen: number[] = JSON.parse(localStorage.getItem(key) ?? '[]')
  const hit = STREAK_MILESTONES.find((m) => streak >= m && !seen.includes(m))
  if (hit) {
    localStorage.setItem(key, JSON.stringify([...seen, hit]))
    return hit
  }
  return null
}

export function milestoneMessage(days: number): string {
  const msgs: Record<number, string> = {
    7: "7 days in a row \u2014 your faithfulness encourages the whole group. \uD83D\uDD25",
    14: "2 weeks of showing up. Your consistency is a gift to your community. \uD83D\uDE4C",
    30: "30 days! A whole month of checking in. That's something worth celebrating. \uD83C\uDF89",
    60: "60 days in a row. You're an anchor for this group. Keep going. \uD83D\uDC9B",
  }
  return msgs[days] ?? `${days} days in a row \u2014 keep it up!`
}
