import { Button } from '@beam/ui/components/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function CTA() {
  return (
    <section className="relative overflow-hidden border-border/40 border-t py-24">
      <div className="pointer-events-none absolute -top-40 -left-40 -z-10 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 -z-10 size-96 rounded-full bg-primary/3 blur-3xl" />

      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
          Ready to Modernize Your Treasury?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
          Join teams already managing their finances on-chain with Beam Finance.
          Set up takes less than 5 minutes.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button
            nativeButton={false}
            render={<Link href="/dashboard" />}
            size="lg"
            className="px-4"
          >
            Launch App <ChevronRight className="ml-1 size-4" />
          </Button>
          <Button
            nativeButton={false}
            render={
              <Link
                href="https://github.com/even976/beam-finance"
                target="_blank"
              />
            }
            variant="outline"
            size="lg"
            className="px-4"
          >
            View on GitHub
          </Button>
        </div>
      </div>
    </section>
  )
}
