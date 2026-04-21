export type SpotifyEpisode = {
  id: string
  name: string
  description: string
  duration_ms: number
  release_date: string
  images: { url: string; width: number; height: number }[]
  external_urls: { spotify: string }
  audio_preview_url: string | null
}

type TokenCache = { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null

async function getSpotifyAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Spotify token error: ${res.status}`)
  const data = await res.json()
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return tokenCache.token
}

const MAX_EPISODES = 500

export async function getPodcastEpisodes(podcastId: string): Promise<SpotifyEpisode[]> {
  const token = await getSpotifyAccessToken()

  const firstRes = await fetch(
    `https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=50&offset=0&market=US`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!firstRes.ok) throw new Error(`Spotify episodes error: ${firstRes.status}`)
  const firstData = await firstRes.json()

  const all: SpotifyEpisode[] = firstData.items ?? []
  const total: number = Math.min(firstData.total ?? 0, MAX_EPISODES)

  const offsets: number[] = []
  for (let offset = 50; offset < total; offset += 50) {
    offsets.push(offset)
  }

  if (offsets.length > 0) {
    const pages = await Promise.all(
      offsets.map((offset) =>
        fetch(
          `https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=50&offset=${offset}&market=US`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
        ).then((r) => r.json())
      )
    )
    for (const page of pages) {
      all.push(...(page.items ?? []))
    }
  }

  return all
}

export async function searchPodcastEpisodes(podcastId: string, query: string): Promise<SpotifyEpisode[]> {
  const episodes = await getPodcastEpisodes(podcastId)
  const lower = query.toLowerCase()
  return episodes.filter(
    ep => ep.name.toLowerCase().includes(lower) || ep.description.toLowerCase().includes(lower)
  )
}

export async function getEpisodeById(episodeId: string): Promise<SpotifyEpisode | null> {
  const token = await getSpotifyAccessToken()
  const res = await fetch(`https://api.spotify.com/v1/episodes/${episodeId}?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}
