import { Eye, Lock, Server } from 'lucide-react'
import { getLandingCopy, type LandingChain } from './landing-variants'

export function Security({ chain = 'solana' }: { chain?: LandingChain }) {
  const copy = getLandingCopy(chain)

  const securityPoints = [
    {
      icon: Eye,
      title: 'On-chain Transparency',
      description: copy.securityOnChainDescription,
    },
    {
      icon: Lock,
      title: 'Zero-trust Permissions',
      description:
        'Role checks are enforced at the smart contract level. No backdoors, no admin overrides.',
    },
    {
      icon: Server,
      title: 'No Central Server',
      description:
        'Your frontend talks directly to the blockchain. No intermediary servers that can be compromised.',
    },
  ]

  return (
    <section id="security" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-balance font-bold text-3xl tracking-tight">
            Security by Design
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Built on blockchain-native security principles from the ground up.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {securityPoints.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-border bg-card/70 p-6 text-center"
            >
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-primary/15 bg-primary/5 shadow-sm">
                <point.icon className="size-5 text-foreground" />
              </div>
              <h3 className="font-semibold">{point.title}</h3>
              <p className="mt-2 text-pretty text-muted-foreground text-sm">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
