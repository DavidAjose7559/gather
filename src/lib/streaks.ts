import { todayToronto, yesterdayToronto, offsetTorontoDay } from './date'

export function calculateStreak(
  checkIns: { check_in_date: string }[]
): number {
  if (checkIns.length === 0) return 0

  const checkedDates = new Set(checkIns.map((c) => c.check_in_date))
  const todayStr = todayToronto()
  const hasToday = checkedDates.has(todayStr)

  // Start from today if checked in, otherwise from yesterday — streak never
  // resets mid-day just because the user hasn't checked in yet.
  // Uses pure date-string arithmetic to avoid DST edge cases.
  let current = hasToday ? todayStr : yesterdayToronto()
  let streak = 0

  while (checkedDates.has(current)) {
    streak++
    // Step back one Toronto calendar day using pure arithmetic
    const [y, m, d] = current.split('-').map(Number)
    const prev = new Date(Date.UTC(y, m - 1, d - 1))
    current = prev.toISOString().split('T')[0]
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
