import Image from 'next/image'
import Link from 'next/link'
import { getLandingCopy, type LandingChain } from './landing-variants'

export function Footer({ chain = 'solana' }: { chain?: LandingChain }) {
  const copy = getLandingCopy(chain)

  return (
    <footer className="border-border/40 border-t">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Beam Finance"
              width={32}
              height={32}
              className="dark:invert"
            />
          </Link>
        </div>
        <div className="flex gap-6">
          <a
            href={copy.footerChain.href}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            {copy.footerChain.label}
          </a>
          <a
            href="https://github.com/evan976/beam-finance-colosseum"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
