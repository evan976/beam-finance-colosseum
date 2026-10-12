import '@beam/ui/globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@beam/ui/components/sonner'
import { TooltipProvider } from '@beam/ui/components/tooltip'
import { cn } from '@beam/ui/lib/utils'
import { Geist, Geist_Mono } from 'next/font/google'
import { AnchorProvider } from '@/components/providers/anchor-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { SolanaProvider } from '@/components/providers/solana-provider'
import { ThemeProvider } from '@/components/theme-provider'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://beam-finance.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Beam Finance',
    template: '%s - Beam Finance',
  },
  description:
    'AI-powered treasury management for modern teams. Manage payroll, reimbursements, and transfers on Solana with a full on-chain audit trail.',
  applicationName: 'Beam Finance',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Beam Finance',
    title: 'Beam Finance',
    description:
      'AI-powered treasury management for modern teams. Manage payroll, reimbursements, and transfers on Solana with a full on-chain audit trail.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beam Finance',
    description:
      'AI-powered treasury management for modern teams. Manage payroll, reimbursements, and transfers on Solana with a full on-chain audit trail.',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo-square.svg',
    apple: '/logo-square.svg',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        fontSans.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <SolanaProvider>
            <AnchorProvider>
              <QueryProvider>
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster position="bottom-center" />
              </QueryProvider>
            </AnchorProvider>
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
