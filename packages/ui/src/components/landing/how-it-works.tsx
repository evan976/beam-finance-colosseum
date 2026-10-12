import { getLandingCopy, type LandingChain } from './landing-variants'

export function HowItWorks({ chain = 'solana' }: { chain?: LandingChain }) {
  const copy = getLandingCopy(chain)

  const steps = [
    {
      number: '01',
      title: 'Create Treasury',
      description: copy.howStep1Description,
    },
    {
      number: '02',
      title: 'Add Your Team',
      description:
        'Invite employees by wallet address. They automatically get access to submit expenses and view their records.',
    },
    {
      number: '03',
      title: 'Manage Finances',
      description:
        'Pay salaries, approve reimbursements, and execute transfers. Every action is permanent and auditable.',
    },
  ]

  return (
    <section
      id="how-it-works"
      className="border-border/40 border-t bg-muted/20 py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
            How it Works
          </h2>
          <p className="mt-3 text-pretty text-lg text-muted-foreground">
            Get up and running in minutes, not days.
          </p>
        </div>
        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="absolute top-6 left-0 hidden h-0.5 w-full -translate-y-1/2 md:block">
            <div className="mask-[repeating-linear-gradient(90deg,black_0px,black_8px,transparent_8px,transparent_16px)] h-full bg-primary/10" />
          </div>
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative bg-background pt-4 md:bg-transparent md:pt-0"
            >
              <div className="mb-6 flex size-12 items-center justify-center rounded-full border border-primary/20 bg-background font-bold font-mono text-foreground text-xl shadow-sm md:mx-auto">
                {i + 1}
              </div>
              <div className="md:text-center">
                <h3 className="font-semibold text-xl">{step.title}</h3>
                <p className="mt-2 text-pretty text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
