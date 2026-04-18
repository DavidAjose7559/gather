'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: copied ? '#4CAF50' : '#6C63FF',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        minHeight: 36,
        padding: '0 8px',
        transition: 'color 0.2s',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
