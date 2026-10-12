import { Badge } from '@beam/ui/components/badge'
import { Button } from '@beam/ui/components/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { HeroImage } from './hero-image'
import { getLandingCopy, type LandingChain } from './landing-variants'

export function Hero({ chain = 'solana' }: { chain?: LandingChain }) {
  const copy = getLandingCopy(chain)

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px),
              linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary)/10_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--primary)/5_0%,transparent_50%)]" />
      </div>
      <div className="absolute top-1/4 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6 text-center">
        <Badge variant="outline" className="mb-6">
          {copy.heroBadge}
        </Badge>
        <h1 className="fade-in slide-in-from-bottom-4 mx-auto max-w-3xl animate-in text-balance font-bold text-4xl tracking-tight duration-200 motion-reduce:duration-0 md:text-5xl lg:text-6xl">
          <span className="text-primary">AI-Powered</span> Treasury Management{' '}
          <span className="text-foreground">for Modern Teams</span>
        </h1>
        <p className="fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-2xl animate-in text-pretty fill-mode-both text-lg text-muted-foreground delay-150 duration-200 motion-reduce:duration-0">
          {copy.heroDescription}
        </p>
        <div className="fade-in slide-in-from-bottom-4 mt-10 flex animate-in items-center justify-center gap-4 fill-mode-both delay-200 duration-200 motion-reduce:duration-0">
          <Button
            nativeButton={false}
            render={<Link href="/dashboard" />}
            size="lg"
          >
            Get Started <ArrowRight />
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="#features" />}
            variant="outline"
            size="lg"
          >
            Request Demo
          </Button>
        </div>
        <div className="mt-20">
          <HeroImage chain={chain} />
        </div>
      </div>
    </section>
  )
}
