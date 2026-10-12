'use client'

import * as React from 'react'
import { Badge } from '@beam/ui/components/badge'
import { Button } from '@beam/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@beam/ui/components/card'
import { DataTable } from '@beam/ui/components/data-table'
import { Input } from '@beam/ui/components/input'
import { Label } from '@beam/ui/components/label'
import { Spinner } from '@beam/ui/components/spinner'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@beam/ui/components/tabs'
import { Textarea } from '@beam/ui/components/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@beam/ui/components/tooltip'
import * as anchor from '@coral-xyz/anchor'
import { SYSVAR_CLOCK_PUBKEY, SystemProgram } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bot, Check, Receipt, X } from 'lucide-react'
import { toast } from 'sonner'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { StatusBadge } from '@/components/status-badge'
import { TokenAmount } from '@/components/token-amount'
import { type EmployeeRecord, useEmployees } from '@/hooks/use-employees'
import { useProgram } from '@/hooks/use-program'
import {
  REIMBURSEMENT_STATUS,
  type ReimbursementRecord,
  useReimbursements,
} from '@/hooks/use-reimbursements'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'
import { createRecordId, getEmployeePDA, getReimbursementPDA } from '@/lib/pda'
import { signAndSend } from '@/lib/send-tx'

export default function ReimbursementsPage() {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { treasury, treasuryPDA, isAdmin } = useTreasury()
  const { program } = useProgram()
  const queryClient = useQueryClient()

  const { employees } = useEmployees(treasuryPDA)

  const { records: myRecords } = useReimbursements(
    treasuryPDA,
    isAdmin ? undefined : (publicKey ?? undefined),
  )
  const { records: allPending } = useReimbursements(
    isAdmin ? treasuryPDA : null,
    undefined,
    REIMBURSEMENT_STATUS.PENDING,
  )

  const employeeMap = React.useMemo(() => {
    const map = new Map<string, EmployeeRecord>()
    for (const emp of employees) {
      map.set(emp.wallet.toBase58(), emp)
    }
    return map
  }, [employees])
  const pendingRecords = isAdmin
    ? allPending
    : myRecords.filter((r) => r.status === REIMBURSEMENT_STATUS.PENDING)

  const [amount, setAmount] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [processingKey, setProcessingKey] = React.useState<string | null>(null)

  type AiReview = { risk: 'low' | 'medium' | 'high'; reason: string }
  const [aiReviews, setAiReviews] = React.useState<Map<string, AiReview>>(
    new Map(),
  )
  const [isReviewing, setIsReviewing] = React.useState(false)

  const handleAiReviewAll = async () => {
    if (!isAdmin || pendingRecords.length === 0) return
    setIsReviewing(true)

    const allApproved = myRecords.filter((r) => r.status === 1)

    // Pre-compute per-employee history once
    const historyByEmployee = new Map<
      string,
      { avgAmount: number; totalCount: number; recentCount: number }
    >()
    const thirtyDaysAgo = Date.now() / 1000 - 30 * 86400
    for (const r of allApproved) {
      const key = r.employee.toBase58()
      const entry = historyByEmployee.get(key) ?? {
        avgAmount: 0,
        totalCount: 0,
        recentCount: 0,
      }
      entry.totalCount++
      entry.avgAmount += r.amount / 10 ** TOKEN_DECIMALS
      if (r.timestamp > thirtyDaysAgo) entry.recentCount++
      historyByEmployee.set(key, entry)
    }
    for (const [, entry] of historyByEmployee) {
      if (entry.totalCount > 0) entry.avgAmount /= entry.totalCount
    }

    try {
      const results: [string, AiReview][] = []
      const batchSize = 5

      for (let i = 0; i < pendingRecords.length; i += batchSize) {
        const batch = pendingRecords.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(async (rec) => {
            const wallet = rec.employee.toBase58()
            const emp = employeeMap.get(wallet)
            const history = historyByEmployee.get(wallet) ?? {
              avgAmount: 0,
              totalCount: 0,
              recentCount: 0,
            }

            const res = await fetch('/api/ai/reimbursement-review', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reimbursement: {
                  amount: (rec.amount / 10 ** TOKEN_DECIMALS).toFixed(2),
                  description: rec.description,
                  date: new Date(rec.timestamp * 1000)
                    .toISOString()
                    .slice(0, 10),
                },
                employee: {
                  name: emp?.name ?? 'Unknown',
                  position: emp?.position ?? '',
                  department: emp?.department ?? '',
                  baseSalary: emp
                    ? (emp.baseSalary / 10 ** TOKEN_DECIMALS).toFixed(2)
                    : '0',
                },
                history,
              }),
            })

            if (!res.ok) throw new Error('Review API failed')
            const review: AiReview = await res.json()
            return [rec.publicKey.toBase58(), review] as [string, AiReview]
          }),
        )
        results.push(...batchResults)
      }

      setAiReviews(new Map(results))
      toast.success(`AI reviewed ${results.length} reimbursements`)
    } catch (err) {
      console.error('AI review failed:', err)
      toast.error('AI review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  if (!treasury) return <CreateTreasuryPrompt />

  const handleSubmit = async () => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA
    )
      return
    const tokenAmount = Math.floor(parseFloat(amount) * 10 ** TOKEN_DECIMALS)
    if (Number.isNaN(tokenAmount) || tokenAmount <= 0 || !description.trim())
      return

    setIsSubmitting(true)
    try {
      const recordId = createRecordId()
      const [reimbPda] = getReimbursementPDA(treasuryPDA, publicKey, recordId)

      const tx = await program.methods
        .submitReimbursement(
          new anchor.BN(recordId.toString()),
          new anchor.BN(tokenAmount),
          description.trim(),
        )
        .accountsStrict({
          employee: publicKey,
          treasury: treasuryPDA,
          reimbursement: reimbPda,
          clock: SYSVAR_CLOCK_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction, {
        skipPreflight: true,
      })

      toast.success('Reimbursement submitted')
      setAmount('')
      setDescription('')
      await queryClient.invalidateQueries({
        queryKey: ['reimbursements'],
      })
    } catch (err) {
      console.error('Submit reimbursement failed:', err)
      toast.error('Failed to submit reimbursement', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (record: ReimbursementRecord) => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA
    )
      return
    setProcessingKey(record.publicKey.toBase58())
    try {
      const [employeeInfoPda] = getEmployeePDA(treasuryPDA, record.employee)

      const tx = await program.methods
        .approveReimbursement()
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPDA,
          reimbursement: record.publicKey,
          employeeInfo: employeeInfoPda,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)
      toast.success('Reimbursement approved — amount added to next payroll')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reimbursements'] }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
      ])
    } catch (err) {
      console.error('Approve failed:', err)
      toast.error('Failed to approve reimbursement', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setProcessingKey(null)
    }
  }

  const handleReject = async (record: ReimbursementRecord) => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA
    )
      return
    setProcessingKey(record.publicKey.toBase58())
    try {
      const tx = await program.methods
        .rejectReimbursement()
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPDA,
          reimbursement: record.publicKey,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)
      toast.success('Reimbursement rejected')
      await queryClient.invalidateQueries({
        queryKey: ['reimbursements'],
      })
    } catch (err) {
      console.error('Reject failed:', err)
      toast.error('Failed to reject reimbursement', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setProcessingKey(null)
    }
  }

  const pendingColumns = [
    {
      header: 'Employee',
      cell: (row: ReimbursementRecord) => {
        const emp = employeeMap.get(row.employee.toBase58())
        return emp ? (
          <div className="min-w-0">
            <p className="truncate font-medium">{emp.name}</p>
            <p className="truncate text-muted-foreground text-xs">
              {emp.position}
              {emp.department ? ` · ${emp.department}` : ''}
            </p>
          </div>
        ) : (
          <Address address={row.employee.toBase58()} />
        )
      },
    },
    {
      header: 'Amount',
      cell: (row: ReimbursementRecord) => (
        <TokenAmount amount={row.amount} className="font-mono tabular-nums" />
      ),
    },
    {
      header: 'Description',
      cell: (row: ReimbursementRecord) => (
        <span className="max-w-[200px] truncate">{row.description}</span>
      ),
    },
    {
      header: 'AI Review',
      cell: (row: ReimbursementRecord) => {
        const review = aiReviews.get(row.publicKey.toBase58())
        if (!review) return null
        const colors = {
          low: 'default' as const,
          medium: 'secondary' as const,
          high: 'destructive' as const,
        }
        const labels = { low: 'Low Risk', medium: 'Medium', high: 'High Risk' }
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant={colors[review.risk]}>{labels[review.risk]}</Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px]">
              <p className="text-xs">{review.reason}</p>
            </TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      header: 'Date',
      cell: (row: ReimbursementRecord) =>
        format(new Date(row.timestamp * 1000), 'MMM d, yyyy'),
    },
    {
      header: '',
      className: 'text-right',
      cell: (row: ReimbursementRecord) => {
        const processing = processingKey === row.publicKey.toBase58()
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="xs"
              onClick={() => handleApprove(row)}
              disabled={processing}
            >
              {processing ? <Spinner /> : <Check className="mr-1" />}
              Approve
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => handleReject(row)}
              disabled={processing}
            >
              {processing ? <Spinner /> : <X className="mr-1" />}
              Reject
            </Button>
          </div>
        )
      },
    },
  ]

  const historyColumns = [
    {
      header: 'Employee',
      cell: (row: ReimbursementRecord) => {
        const emp = employeeMap.get(row.employee.toBase58())
        return emp ? (
          <div className="min-w-0">
            <p className="truncate font-medium">{emp.name}</p>
            <p className="truncate text-muted-foreground text-xs">
              {emp.position}
              {emp.department ? ` · ${emp.department}` : ''}
            </p>
          </div>
        ) : (
          <Address address={row.employee.toBase58()} />
        )
      },
    },
    {
      header: 'Amount',
      cell: (row: ReimbursementRecord) => (
        <TokenAmount amount={row.amount} className="font-mono tabular-nums" />
      ),
    },
    {
      header: 'Description',
      cell: (row: ReimbursementRecord) => (
        <span className="max-w-[200px] truncate text-muted-foreground">
          {row.description}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: ReimbursementRecord) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Date',
      cell: (row: ReimbursementRecord) =>
        format(new Date(row.timestamp * 1000), 'MMM d, yyyy'),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          Reimbursements
        </h1>
        <p className="text-pretty text-muted-foreground text-sm">
          {isAdmin
            ? 'Review and approve expense reimbursements'
            : 'Submit and track your reimbursement requests'}
        </p>
      </div>

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              Submit Reimbursement
            </CardTitle>
            <CardDescription>
              Request reimbursement for an expense. Your admin will review it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid items-start gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Amount ({TOKEN_SYMBOL})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Office supplies, travel, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={128}
                  rows={1}
                />
              </div>
            </div>
            <Button
              className="mt-4"
              onClick={handleSubmit}
              disabled={!amount || !description.trim() || isSubmitting}
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin ? (
        <Tabs defaultValue="pending">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingRecords.length})
              </TabsTrigger>
              <TabsTrigger value="history">All History</TabsTrigger>
            </TabsList>
            {pendingRecords.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiReviewAll}
                disabled={isReviewing}
              >
                {isReviewing ? <Spinner /> : <Bot className="mr-1.5" />}
                {isReviewing ? 'Reviewing...' : 'AI Review All'}
              </Button>
            )}
          </div>
          <TabsContent value="pending" className="mt-4">
            <DataTable
              columns={pendingColumns}
              data={pendingRecords}
              emptyMessage="No pending reimbursements."
            />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <DataTable
              columns={historyColumns}
              data={myRecords}
              emptyMessage="No reimbursements yet."
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <h2 className="mb-4 font-semibold text-lg">My Reimbursements</h2>
          <DataTable
            columns={historyColumns}
            data={myRecords}
            emptyMessage="You haven't submitted any reimbursements yet."
          />
        </div>
      )}
    </div>
  )
}
