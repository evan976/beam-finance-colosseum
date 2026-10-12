import type { Metadata } from 'next'
import { CTA } from '@beam/ui/components/landing/cta'
import { FeaturesGrid } from '@beam/ui/components/landing/features-grid'
import { Footer } from '@beam/ui/components/landing/footer'
import { Hero } from '@beam/ui/components/landing/hero'
import { HowItWorks } from '@beam/ui/components/landing/how-it-works'
import { Navbar } from '@beam/ui/components/landing/navbar'
import { Security } from '@beam/ui/components/landing/security'
import { TrustBar } from '@beam/ui/components/landing/trust-bar'

export const metadata: Metadata = {
  title: 'AI Treasury Management for Modern Teams',
  description:
    'Beam Finance helps teams run payroll, reimbursements, and transfers on Solana with an AI assistant and a complete on-chain audit trail.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: '/',
    title: 'AI Treasury Management for Modern Teams',
    description:
      'Beam Finance helps teams run payroll, reimbursements, and transfers on Solana with an AI assistant and a complete on-chain audit trail.',
  },
}

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <FeaturesGrid />
        <HowItWorks />
        <Security />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
