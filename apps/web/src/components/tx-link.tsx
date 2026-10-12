import { cn } from '@beam/ui/lib/utils'
import { ExternalLink } from 'lucide-react'
import { getExplorerUrl } from '@/lib/constants'

interface TxLinkProps {
  signature: string
  className?: string
}

function truncateSig(sig: string) {
  return `${sig.slice(0, 8)}...`
}

export function TxLink({ signature, className }: TxLinkProps) {
  return (
    <a
      href={getExplorerUrl(signature, 'tx')}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 font-mono text-muted-foreground text-xs transition-colors hover:text-foreground',
        className,
      )}
    >
      {truncateSig(signature)}
      <ExternalLink className="size-3" />
    </a>
  )
}
