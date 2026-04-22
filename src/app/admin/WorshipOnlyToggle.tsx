'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WorshipOnlyToggle({
  memberId,
  isWorshipOnly,
}: {
  memberId: string
  isWorshipOnly: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(isWorshipOnly)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function toggle() {
    if (saving) return
    setSaving(true)
    setToast(null)
    const next = !value

    const res = await fetch('/api/admin/worship-only', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, isWorshipOnly: next }),
    })

    const data = await res.json()

    if (res.ok) {
      setValue(next)
      setToast({ type: 'success', msg: next ? 'Worship access only' : 'Full access restored' })
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
        title={value ? 'Can only access /worship — click to restore full access' : 'Has full Gather access — click to restrict to worship only'}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 14px',
          borderRadius: 10,
          minHeight: 36,
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.5 : 1,
          backgroundColor: value ? 'rgba(255,149,0,0.12)' : 'var(--bg-input)',
          color: value ? '#FF9500' : 'var(--text-secondary)',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {saving ? '…' : value ? 'Worship only' : 'Full access'}
      </button>
      {toast && (
        <span style={{ fontSize: 11, color: toast.type === 'success' ? '#4CAF50' : '#FF4D4D', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </span>
      )}
    </div>
  )
}
