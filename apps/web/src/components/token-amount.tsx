'use client'

import { usePrivacyMode } from '@beam/ui/components/privacy-provider'
import { cn } from '@beam/ui/lib/utils'
import NumberFlow from '@number-flow/react'
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'

interface TokenAmountProps {
  amount: number | string
  decimals?: number
  symbol?: string
  className?: string
  showSymbol?: boolean
  animated?: boolean
}

export function TokenAmount({
  amount,
  decimals = TOKEN_DECIMALS,
  symbol = TOKEN_SYMBOL,
  className,
  showSymbol = true,
  animated = false,
}: TokenAmountProps) {
  const { isPrivacyMode } = usePrivacyMode()

  const value = Number(amount) / 10 ** decimals

  if (isPrivacyMode) {
    return (
      <span className={cn(className, 'select-none')}>
        ******
        {showSymbol && ` ${symbol}`}
      </span>
    )
  }

  if (animated) {
    return (
      <span className={className}>
        <NumberFlow
          value={value}
          format={{
            minimumFractionDigits: 2,
            maximumFractionDigits: decimals,
          }}
          transformTiming={{ duration: 400, easing: 'ease-out' }}
          spinTiming={{ duration: 400, easing: 'ease-out' }}
          opacityTiming={{ duration: 200, easing: 'ease-out' }}
        />
        {showSymbol && ` ${symbol}`}
      </span>
    )
  }

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={className}>
      {formatted}
      {showSymbol && ` ${symbol}`}
    </span>
  )
}
