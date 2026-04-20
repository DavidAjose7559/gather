'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminActions({ checkInId }: { checkInId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/checkins?id=${checkInId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to delete')
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div style={{ backgroundColor: 'rgba(255,77,77,0.06)', borderRadius: 20, border: '1px solid rgba(255,77,77,0.2)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,77,77,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin</p>
      {error && (
        <p style={{ fontSize: 13, color: '#FF4D4D' }}>{error}</p>
      )}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 500, color: '#FF4D4D', background: 'none', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', minHeight: 40 }}
        >
          Delete check-in
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Delete this check-in? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', minHeight: 40 }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ fontSize: 14, fontWeight: 600, color: 'white', backgroundColor: '#FF4D4D', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, minHeight: 40 }}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
