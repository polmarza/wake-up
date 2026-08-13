import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import './globals.css'

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--fuente-display',
  weight: ['500', '600', '700'],
})

const sans = Inter({
  subsets: ['latin'],
  variable: '--fuente-sans',
})

export const metadata: Metadata = {
  title: 'Wake Up Heroes',
  description: 'Reactivación de alumnos de Learning Heroes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
