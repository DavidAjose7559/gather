import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPodcastEpisodes, searchPodcastEpisodes } from '@/lib/spotify'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const podcastId = process.env.SPOTIFY_PODCAST_ID
  if (!podcastId) return NextResponse.json({ error: 'SPOTIFY_PODCAST_ID not configured' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  try {
    const episodes = query
      ? await searchPodcastEpisodes(podcastId, query)
      : await getPodcastEpisodes(podcastId, 50)
    return NextResponse.json({ episodes })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spotify error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
