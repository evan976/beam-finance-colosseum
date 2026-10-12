import { Button } from '@beam/ui/components/button'
import Image from 'next/image'
import Link from 'next/link'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-border/40 border-b bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/logo-square.svg"
              alt="Beam Finance"
              width={32}
              height={32}
              className="dark:invert"
            />
            <span className="hidden font-bold text-xl md:block">
              Beam Finance
            </span>
          </Link>
        </div>
        <nav className="hidden items-center gap-6 text-muted-foreground text-sm md:flex">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it Works
          </a>
          <a
            href="#security"
            className="transition-colors hover:text-foreground"
          >
            Security
          </a>
        </nav>
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          Launch App
        </Button>
      </div>
    </header>
  )
}
