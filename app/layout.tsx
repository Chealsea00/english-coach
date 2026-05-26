import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Business English AI Coach',
  description: 'Sound fluent, natural, and executive in English',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
