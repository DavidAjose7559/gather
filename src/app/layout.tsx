import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gather',
  description: 'A daily check-in for your fellowship group.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  )
}
