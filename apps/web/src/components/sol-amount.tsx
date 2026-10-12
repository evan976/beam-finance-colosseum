import { LAMPORTS_PER_SOL } from '@/lib/constants'

interface SolAmountProps {
  lamports: number
  className?: string
  showSymbol?: boolean
}

export function SolAmount({
  lamports,
  className,
  showSymbol = true,
}: SolAmountProps) {
  const sol = lamports / LAMPORTS_PER_SOL
  const formatted = sol.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })

  return (
    <span className={className}>
      {formatted}
      {showSymbol && ' SOL'}
    </span>
  )
}
