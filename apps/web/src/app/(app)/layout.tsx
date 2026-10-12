import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const instant = true

export const metadata: Metadata = {
  title: 'App',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
