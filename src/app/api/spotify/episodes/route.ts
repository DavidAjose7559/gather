import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPodcastEpisodes, searchEpisodesByTheme } from '@/lib/spotify'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const podcastId = searchParams.get('podcast_id')

  try {
    if (query) {
      const episodes = await searchEpisodesByTheme(query)
      return NextResponse.json({ episodes })
    }
    if (podcastId) {
      const episodes = await getPodcastEpisodes(podcastId)
      return NextResponse.json({ episodes })
    }
    return NextResponse.json({ episodes: [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spotify error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
