import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'QuoteFlow — Professional Quotation Platform',
    template: '%s | QuoteFlow',
  },
  description: 'The complete quotation-to-payment platform. Create beautiful quotes, collect e-signatures, and get paid faster.',
  keywords: ['quotation software', 'proposal software', 'e-signature', 'invoice management', 'CRM'],
  authors: [{ name: 'QuoteFlow' }],
  creator: 'QuoteFlow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'QuoteFlow',
    title: 'QuoteFlow — Professional Quotation Platform',
    description: 'Create beautiful quotes, collect e-signatures, and get paid faster.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuoteFlow',
    description: 'The complete quotation-to-payment platform.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c5cfc',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'hsl(222, 47%, 9%)',
                border: '1px solid hsl(222, 47%, 16%)',
                color: 'hsl(210, 40%, 96%)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
