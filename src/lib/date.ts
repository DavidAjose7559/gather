const TZ = 'America/Toronto'

export function todayToronto(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function formatDateToronto(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Returns yesterday's date string in Toronto timezone using pure calendar arithmetic.
// Never uses UTC offset math so it's immune to DST edge cases.
export function yesterdayToronto(): string {
  return offsetTorontoDay(-1)
}

// Returns a YYYY-MM-DD date string offset by `days` from today in Toronto timezone.
export function offsetTorontoDay(days: number): string {
  const today = todayToronto() // YYYY-MM-DD
  const [y, m, d] = today.split('-').map(Number)
  // Date.UTC treats components as UTC calendar — pure arithmetic, no TZ conversion
  const result = new Date(Date.UTC(y, m - 1, d + days))
  return result.toISOString().split('T')[0]
}

// Returns true if the given YYYY-MM-DD string matches today in Toronto timezone.
export function isToday(dateStr: string): boolean {
  return dateStr === todayToronto()
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}
