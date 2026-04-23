'use client'

import { useState } from 'react'
import type { WorshipBudgetItem, WorshipTeamMember } from '@/lib/types'
import MentionTextarea, { renderWithMentions } from './MentionTextarea'

function AmountInput({
  value,
  onSave,
}: {
  value: number
  onSave: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  if (editing) {
    return (
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(draft)
          if (!isNaN(parsed) && parsed >= 0) onSave(parsed)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false); setDraft(String(value)) }
        }}
        autoFocus
        style={{
          width: 90,
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid #6C63FF',
          borderRadius: 8,
          padding: '4px 8px',
          fontSize: 14,
          fontWeight: 600,
          outline: 'none',
        }}
      />
    )
  }

  return (
    <span
      onClick={() => { setEditing(true); setDraft(String(value)) }}
      title="Click to edit"
      style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px dashed var(--border-light)', paddingBottom: 1 }}
    >
      ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  )
}

function NoteInlineEdit({
  value,
  team,
  onSave,
}: {
  value: string
  team: WorshipTeamMember[]
  onSave: (v: string, mentionedIds: string[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [mentionedIds, setMentionedIds] = useState<string[]>([])

  function commit() {
    onSave(draft, mentionedIds)
    setEditing(false)
    setMentionedIds([])
  }

  if (editing) {
    return (
      <div>
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          onMentionedUsers={setMentionedIds}
          team={team}
          placeholder="Add a note… type @ to mention someone"
          minHeight={56}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            onClick={commit}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, backgroundColor: '#6C63FF', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(value); setMentionedIds([]) }}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <span
      onClick={() => { setEditing(true); setDraft(value) }}
      style={{ fontSize: 13, color: value ? 'var(--text-secondary)' : 'var(--text-tertiary)', cursor: 'pointer', display: 'block' }}
    >
      {value ? renderWithMentions(value, team) : 'Add note…'}
    </span>
  )
}

export default function BudgetTab({
  eventId,
  budget: initialBudget,
  team,
  moneyInBank: initialMoneyInBank,
  onBudgetChange,
  onMoneyInBankChange,
}: {
  eventId: string
  budget: WorshipBudgetItem[]
  team: WorshipTeamMember[]
  moneyInBank: number
  onBudgetChange: (b: WorshipBudgetItem[]) => void
  onMoneyInBankChange: (v: number) => void
}) {
  const [budget, setBudgetState] = useState(initialBudget)
  const [moneyInBank, setMoneyInBank] = useState(initialMoneyInBank)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function saveMoneyInBank(v: number) {
    setMoneyInBank(v)
    onMoneyInBankChange(v)
    await fetch(`/api/worship/events?id=${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ money_in_bank: v }),
    })
  }

  function updateLocal(items: WorshipBudgetItem[]) {
    setBudgetState(items)
    onBudgetChange(items)
  }

  async function patchItem(id: string, patch: Partial<WorshipBudgetItem> & { mentioned_user_ids?: string[] }) {
    setSavingId(id)
    const res = await fetch(`/api/worship/budget?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      updateLocal(budget.map((b) => (b.id === id ? { ...b, ...updated } : b)))
    }
    setSavingId(null)
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/worship/budget?id=${id}`, { method: 'DELETE' })
    if (res.ok) updateLocal(budget.filter((b) => b.id !== id))
  }

  async function addCategory() {
    if (!newCategory.trim()) return
    setSaving(true)
    const res = await fetch('/api/worship/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, category: newCategory.trim(), allocated: 0, spent: 0 }),
    })
    if (res.ok) {
      const item = await res.json()
      updateLocal([...budget, item])
      setNewCategory('')
      setAddingCategory(false)
    }
    setSaving(false)
  }

  function copyBudget() {
    const totalBudgeted = budget.reduce((s, b) => s + Number(b.allocated), 0)
    const totalSpent = budget.reduce((s, b) => s + Number(b.spent), 0)
    const stillToRaise = Math.max(0, totalBudgeted - moneyInBank)
    const lines = [
      'BUDGET SUMMARY',
      '==============',
      ...budget.map((b) =>
        `${b.category}: Budgeted $${Number(b.allocated).toFixed(2)} | Spent $${Number(b.spent).toFixed(2)} | Remaining $${(Number(b.allocated) - Number(b.spent)).toFixed(2)}`
          + (b.notes ? ` (${b.notes})` : '')
      ),
      '==============',
      `TOTAL BUDGETED: $${totalBudgeted.toFixed(2)}`,
      `IN THE BANK: $${moneyInBank.toFixed(2)}`,
      `TOTAL SPENT: $${totalSpent.toFixed(2)}`,
      `STILL TO RAISE: $${stillToRaise.toFixed(2)}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalBudgeted = budget.reduce((s, b) => s + Number(b.allocated), 0)
  const totalSpent = budget.reduce((s, b) => s + Number(b.spent), 0)
  const stillToRaise = Math.max(0, totalBudgeted - moneyInBank)
  const pct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0
  const barColor = pct >= 100 ? '#FF4D4D' : pct >= 80 ? '#FF9500' : '#4CAF50'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary card */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Budget summary</h2>
          <button
            onClick={copyBudget}
            style={{ fontSize: 13, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            {copied ? 'Copied!' : 'Copy summary'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Budgeted', value: `$${totalBudgeted.toLocaleString()}` },
            { label: 'Spent', value: `$${totalSpent.toLocaleString()}` },
            { label: 'Unspent', value: `$${(totalBudgeted - totalSpent).toLocaleString()}`, color: (totalBudgeted - totalSpent) < 0 ? '#FF4D4D' : 'var(--text-primary)' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '12px 8px', backgroundColor: 'var(--bg-card-2)', borderRadius: 12 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: stat.color ?? 'var(--text-primary)' }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* In the bank + still to raise */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card-2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>In the bank</span>
            <AmountInput value={moneyInBank} onSave={saveMoneyInBank} />
          </div>
          {stillToRaise > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Still to raise</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#FF9500' }}>
                ${stillToRaise.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {stillToRaise === 0 && moneyInBank > 0 && (
            <p style={{ fontSize: 12, fontWeight: 600, color: '#4CAF50' }}>Fully funded</p>
          )}
        </div>

        {totalBudgeted > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Budget spent</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{pct}%</span>
            </div>
            <div style={{ height: 8, backgroundColor: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Category cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...budget].sort((a, b) => Number(b.allocated) - Number(a.allocated)).map((item) => {
          const allocated = Number(item.allocated)
          const spent = Number(item.spent)
          const rem = allocated - spent
          const itemPct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0
          const itemColor = itemPct >= 100 ? '#FF4D4D' : itemPct >= 80 ? '#FF9500' : '#4CAF50'

          return (
            <div key={item.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{item.category}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {savingId === item.id && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Saving…</span>}
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Budgeted</p>
                  <AmountInput value={allocated} onSave={(v) => patchItem(item.id, { allocated: v })} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Spent</p>
                  <AmountInput value={spent} onSave={(v) => patchItem(item.id, { spent: v })} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Remaining</p>
                  <span style={{ fontSize: 14, fontWeight: 600, color: rem < 0 ? '#FF4D4D' : 'var(--text-secondary)' }}>
                    ${rem.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {allocated > 0 && (
                <div style={{ height: 4, backgroundColor: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${Math.min(itemPct, 100)}%`, backgroundColor: itemColor, borderRadius: 2 }} />
                </div>
              )}

              <NoteInlineEdit
                value={item.notes ?? ''}
                team={team}
                onSave={(v, mentionedIds) => patchItem(item.id, { notes: v || null, mentioned_user_ids: mentionedIds })}
              />
            </div>
          )
        })}
      </div>

      {/* Add custom category */}
      {addingCategory ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category name"
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCategory()
              if (e.key === 'Escape') { setAddingCategory(false); setNewCategory('') }
            }}
          />
          <button
            onClick={addCategory}
            disabled={saving || !newCategory.trim()}
            style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {saving ? '…' : 'Add'}
          </button>
          <button
            onClick={() => { setAddingCategory(false); setNewCategory('') }}
            style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingCategory(true)}
          style={{ padding: '12px', borderRadius: 14, backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-light)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          + Add custom category
        </button>
      )}
    </div>
  )
}
