import { CardContent } from '@beam/ui/components/card'
import { cn } from '@beam/ui/lib/utils'
import {
  ArrowLeftRight,
  Banknote,
  Bot,
  Receipt,
  ScrollText,
  ShieldAlert,
  Users,
  Vault,
} from 'lucide-react'
import { getLandingCopy, type LandingChain } from './landing-variants'

const features = [
  {
    icon: Vault,
    title: 'Treasury Management',
    description:
      'Create and fund a shared treasury. Track balances in real-time with full transparency. No more hidden bank accounts or opaque ledgers.',
    className: 'md:col-span-2',
  },
  {
    icon: Banknote,
    title: 'Payroll',
    description:
      'Pay salaries directly from your treasury. Every payment is recorded on-chain with memos.',
    className: 'md:col-span-1',
  },
  {
    icon: Receipt,
    title: 'Reimbursements',
    description:
      'Employees submit expenses on-chain. Admins approve with one click — funds transfer instantly.',
    className: 'md:col-span-1',
  },
  {
    icon: ArrowLeftRight,
    title: 'Transfers',
    description:
      'Treasury-to-external or peer-to-peer transfers between teammates, all logged permanently.',
    className: 'md:col-span-2',
  },
  {
    icon: Bot,
    title: 'AI Financial Assistant',
    description:
      'Natural language interface to manage your finances. Ask questions, submit reimbursements, pay salaries, and execute transfers — all through conversation with role-based access control.',
    className: 'md:col-span-2',
  },
  {
    icon: ShieldAlert,
    title: 'Anomaly Detection',
    description:
      'AI-powered transaction monitoring flags unusual patterns — duplicate payments, outlier amounts, and suspicious activity.',
    className: 'md:col-span-1',
  },
  {
    icon: ScrollText,
    title: 'Real-time Ledger',
    description:
      'Complete transaction history — payroll, reimbursements, transfers — filterable and exportable.',
    className: 'md:col-span-1',
  },
  {
    icon: Users,
    title: 'Role-based Access',
    description:
      'Admin and employee roles enforced at the program level. Zero-trust by default — even the AI respects role boundaries.',
    className: 'md:col-span-2',
  },
]

export function FeaturesGrid({ chain = 'solana' }: { chain?: LandingChain }) {
  const copy = getLandingCopy(chain)

  return (
    <section id="features" className="relative bg-muted/30 py-24">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
            Everything Your Team Needs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-lg text-muted-foreground">
            {copy.featuresSubtitle}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-card/80 p-px transition-colors hover:border-primary/15 hover:shadow-md',
                f.className,
              )}
            >
              <CardContent className="p-8">
                <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  <f.icon className="size-6 text-foreground" />
                </div>
                <h3 className="mb-3 text-balance font-semibold text-xl">
                  {f.title}
                </h3>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </CardContent>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
