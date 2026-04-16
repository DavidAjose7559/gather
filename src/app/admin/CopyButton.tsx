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
      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 min-h-[36px] px-2 flex-shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
