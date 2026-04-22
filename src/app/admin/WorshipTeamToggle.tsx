'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WorshipTeamToggle({
  memberId,
  isWorshipTeam,
}: {
  memberId: string
  isWorshipTeam: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(isWorshipTeam)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function toggle() {
    if (saving) return
    setSaving(true)
    setToast(null)
    const next = !value

    const res = await fetch('/api/admin/worship-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, isWorshipTeam: next }),
    })

    const data = await res.json()

    if (res.ok) {
      setValue(next)
      setToast({ type: 'success', msg: next ? 'Added to worship team' : 'Removed' })
      router.refresh()
    } else {
      setToast({ type: 'error', msg: data.error || 'Failed' })
    }

    setSaving(false)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={toggle}
        disabled={saving}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 14px',
          borderRadius: 10,
          minHeight: 36,
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.5 : 1,
          backgroundColor: value ? 'rgba(108,99,255,0.15)' : 'var(--bg-input)',
          color: value ? '#A09AF8' : 'var(--text-secondary)',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {saving ? '…' : value ? 'Worship team' : 'Not on team'}
      </button>
      {toast && (
        <span style={{ fontSize: 11, color: toast.type === 'success' ? '#4CAF50' : '#FF4D4D', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </span>
      )}
    </div>
  )
}
