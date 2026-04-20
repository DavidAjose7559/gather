import type { Metadata } from 'next'
import './globals.css'
import DemoBanner from '@/components/DemoBanner'

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('gather-theme') === 'light') {
              document.documentElement.classList.add('light');
            }
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-full font-sans antialiased"><DemoBanner />{children}</body>
    </html>
  )
}
