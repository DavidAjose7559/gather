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
      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">
        {role}
      </span>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg min-h-[36px] transition-all disabled:opacity-50 ${
        role === 'admin'
          ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {saving ? '…' : role === 'admin' ? 'Admin' : 'Member'}
    </button>
  )
}
