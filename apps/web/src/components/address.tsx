'use client'

import * as React from 'react'
import { Button } from '@beam/ui/components/button'
import { cn } from '@beam/ui/lib/utils'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { getExplorerUrl } from '@/lib/constants'

interface AddressProps {
  address: string
  showCopy?: boolean
  showExplorer?: boolean
  className?: string
}

function truncate(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function Address({
  address,
  showCopy = true,
  showExplorer = false,
  className,
}: AddressProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-sm',
        className,
      )}
    >
      {truncate(address)}
      {showCopy && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          aria-label={`Copy address ${truncate(address)}`}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      )}
      {showExplorer && (
        <Button
          variant="ghost"
          size="icon-xs"
          nativeButton={false}
          render={
            <a
              href={getExplorerUrl(address, 'address')}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          aria-label={`Open ${truncate(address)} in Solana Explorer`}
        >
          <ExternalLink />
        </Button>
      )}
    </span>
  )
}
