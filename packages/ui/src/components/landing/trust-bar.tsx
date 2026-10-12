import { Bot, DollarSign, Eye, ShieldCheck, Zap } from 'lucide-react'
import { getLandingCopy, type LandingChain } from './landing-variants'

export function TrustBar({ chain = 'solana' }: { chain?: LandingChain }) {
  const copy = getLandingCopy(chain)

  const trustItems = [
    { icon: Zap, label: copy.trustBuiltLabel },
    { icon: Bot, label: 'AI-Powered' },
    { icon: ShieldCheck, label: 'Audited Smart Contracts' },
    { icon: DollarSign, label: copy.trustFeeLabel },
    { icon: Eye, label: '100% Transparent' },
  ]

  return (
    <section className="border-border/40 border-y bg-muted/30 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center divide-x divide-border/40 px-4 py-8">
        {trustItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 px-8 font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <item.icon className="size-4 text-foreground" />
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
