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

export async function getPodcastEpisodes(podcastId: string, limit = 20): Promise<SpotifyEpisode[]> {
  const token = await getSpotifyAccessToken()
  const res = await fetch(
    `https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=${limit}&market=US`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Spotify episodes error: ${res.status}`)
  const data = await res.json()
  return data.items ?? []
}

export async function searchEpisodesByTheme(query: string, limit = 10): Promise<SpotifyEpisode[]> {
  const token = await getSpotifyAccessToken()
  const params = new URLSearchParams({ q: query, type: 'episode', market: 'US', limit: String(limit) })
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Spotify search error: ${res.status}`)
  const data = await res.json()
  return data.episodes?.items ?? []
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
