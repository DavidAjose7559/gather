'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RoleToggle({
  memberId,
  currentRole,
  isSelf,
}: {
  memberId: string
  currentRole: 'member' | 'admin'
  isSelf: boolean
}) {
  const [role, setRole] = useState(currentRole)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    if (isSelf) return
    setSaving(true)
    const newRole = role === 'admin' ? 'member' : 'admin'
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId)
    if (!error) setRole(newRole)
    setSaving(false)
  }

  if (isSelf) {
    return (
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 10px', backgroundColor: '#2A2A2A', borderRadius: 8 }}>
        {role}
      </span>
    )
  }

  return (
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
        backgroundColor: role === 'admin' ? 'rgba(108,99,255,0.15)' : '#2A2A2A',
        color: role === 'admin' ? '#A09AF8' : 'rgba(255,255,255,0.5)',
        transition: 'all 0.15s',
      }}
    >
      {saving ? '…' : role === 'admin' ? 'Admin' : 'Member'}
    </button>
  )
}
