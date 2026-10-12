'use client'

import * as React from 'react'
import { DataTable } from '@beam/ui/components/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@beam/ui/components/select'
import { format } from 'date-fns'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { StatusBadge, TypeBadge } from '@/components/status-badge'
import { TokenAmount } from '@/components/token-amount'
import {
  type UnifiedTransaction,
  useTransactions,
} from '@/hooks/use-transactions'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'transfer', label: 'Transfer' },
]

export default function HistoryPage() {
  const { publicKey } = useWalletCompat()
  const { treasury, treasuryPDA, isAdmin } = useTreasury()
  const { transactions, isLoading } = useTransactions(
    treasuryPDA,
    publicKey ?? undefined,
    { isAdmin },
  )

  const [typeFilter, setTypeFilter] = React.useState('all')

  const filtered = React.useMemo(() => {
    if (typeFilter === 'all') return transactions
    return transactions.filter((t) => t.type === typeFilter)
  }, [transactions, typeFilter])

  if (!treasury) return <CreateTreasuryPrompt />

  const columns = [
    {
      header: 'Type',
      cell: (row: UnifiedTransaction) => <TypeBadge type={row.type} />,
    },
    {
      header: 'Amount',
      cell: (row: UnifiedTransaction) => (
        <TokenAmount amount={row.amount} className="font-mono tabular-nums" />
      ),
    },
    {
      header: isAdmin ? 'Counterparty' : 'From/To',
      cell: (row: UnifiedTransaction) => (
        <Address address={row.counterparty.toBase58()} />
      ),
    },
    {
      header: 'Description',
      cell: (row: UnifiedTransaction) => (
        <span className="max-w-64 truncate text-muted-foreground">
          {row.description}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: UnifiedTransaction) => (
        <StatusBadge
          status={row.status !== undefined ? row.status : 'completed'}
        />
      ),
    },
    {
      header: 'Date',
      cell: (row: UnifiedTransaction) =>
        format(new Date(row.timestamp * 1000), 'MMM d, yyyy'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-balance font-bold text-2xl tracking-tight">
            Transaction History
          </h1>
          <p className="text-pretty text-muted-foreground text-sm">
            {isAdmin
              ? 'Complete ledger of all financial operations'
              : 'Your personal transaction history'}
          </p>
        </div>
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value ?? 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No transactions found."
        />
      )}
    </div>
  )
}
