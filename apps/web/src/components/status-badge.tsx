import { Badge } from '@beam/ui/components/badge'
import { cn } from '@beam/ui/lib/utils'
import {
  BadgeCheck,
  CheckCircle2,
  CircleDot,
  Clock,
  XCircle,
} from 'lucide-react'
import { REIMBURSEMENT_STATUS } from '@/hooks/use-reimbursements'

interface StatusBadgeProps {
  status: number | 'completed'
}

const statusConfig: Record<
  number | string,
  {
    label: string
    icon: typeof Clock
    className: string
  }
> = {
  [REIMBURSEMENT_STATUS.PENDING]: {
    label: 'Pending',
    icon: Clock,
    className:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400',
  },
  [REIMBURSEMENT_STATUS.APPROVED]: {
    label: 'Approved',
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400',
  },
  [REIMBURSEMENT_STATUS.REJECTED]: {
    label: 'Rejected',
    icon: XCircle,
    className:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400',
  },
  completed: {
    label: 'Completed',
    icon: BadgeCheck,
    className:
      'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-400',
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: 'Unknown',
    icon: CircleDot,
    className: '',
  }
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn('gap-1 px-2', config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

export type TransactionType = 'payroll' | 'reimbursement' | 'transfer'

const typeConfig: Record<TransactionType, { className: string }> = {
  payroll: {
    className:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
  },
  reimbursement: {
    className:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400',
  },
  transfer: {
    className:
      'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-400',
  },
}

export function TypeBadge({ type }: { type: string }) {
  const config = typeConfig[type as TransactionType]

  return (
    <Badge
      variant="outline"
      className={cn('text-xs capitalize', config?.className)}
    >
      {type}
    </Badge>
  )
}
