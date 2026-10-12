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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@beam/ui/components/dialog'
import { Spinner } from '@beam/ui/components/spinner'
import * as anchor from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { SYSVAR_CLOCK_PUBKEY, SystemProgram } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Banknote,
  CheckCircle2,
  CircleDot,
  UserRoundCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { TokenAmount } from '@/components/token-amount'
import { type EmployeeRecord, useEmployees } from '@/hooks/use-employees'
import { type PayrollRecord, usePayroll } from '@/hooks/use-payroll'
import { useProgram } from '@/hooks/use-program'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { createRecordId, getEmployeePDA, getPayrollPDA } from '@/lib/pda'
import { signAndSend } from '@/lib/send-tx'

type BatchStatus = 'pending' | 'paying' | 'success' | 'error'

interface BatchItem {
  employee: EmployeeRecord
  status: BatchStatus
  error?: string
}

export default function Payroll() {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { treasury, treasuryPDA, vaultPDA, isAdmin } = useTreasury()
  const { program } = useProgram()
  const { employees } = useEmployees(treasuryPDA)
  const queryClient = useQueryClient()

  const employee = isAdmin ? undefined : (publicKey ?? undefined)
  const { records } = usePayroll(treasuryPDA, employee)

  const [isBatchPaying, setIsBatchPaying] = React.useState(false)
  const [batchItems, setBatchItems] = React.useState<BatchItem[]>([])
  const [batchOpen, setBatchOpen] = React.useState(false)
  const [payingEmployee, setPayingEmployee] =
    React.useState<EmployeeRecord | null>(null)
  const [isIndividualPaying, setIsIndividualPaying] = React.useState(false)

  if (!treasury) return <CreateTreasuryPrompt />

  const totalPayable = employees.reduce(
    (sum, e) => sum + e.baseSalary + e.pendingReimbursement,
    0,
  )

  const handleBatchPay = async () => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA ||
      !vaultPDA
    )
      return

    const items: BatchItem[] = employees
      .filter((e) => e.baseSalary + e.pendingReimbursement > 0)
      .map((e) => ({ employee: e, status: 'pending' as BatchStatus }))

    if (items.length === 0) {
      toast.error('No employees with payable salary')
      return
    }

    setIsBatchPaying(true)
    setBatchItems(items)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      setBatchItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'paying' } : it)),
      )

      try {
        const emp = item.employee
        const recordId = createRecordId()
        const [payrollPda] = getPayrollPDA(treasuryPDA, emp.wallet, recordId)
        const [employeeInfoPda] = getEmployeePDA(treasuryPDA, emp.wallet)
        const employeeAta = getAssociatedTokenAddressSync(
          treasury.tokenMint,
          emp.wallet,
        )

        const month = format(new Date(), 'MMMM yyyy')

        const tx = await program.methods
          .paySalary(new anchor.BN(recordId.toString()), `${month} salary`)
          .accountsStrict({
            admin: publicKey,
            treasury: treasuryPDA,
            vault: vaultPDA,
            employee: emp.wallet,
            employeeInfo: employeeInfoPda,
            employeeTokenAccount: employeeAta,
            payroll: payrollPda,
            tokenMint: treasury.tokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
            systemProgram: SystemProgram.programId,
          })
          .transaction()

        await signAndSend(tx, publicKey, connection, sendTransaction, {
          skipPreflight: true,
        })

        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'success' } : it,
          ),
        )
        successCount++
      } catch (err) {
        console.error(`Pay salary failed for ${item.employee.name}:`, err)
        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  error: err instanceof Error ? err.message : String(err),
                }
              : it,
          ),
        )
        failCount++
      }
    }

    setIsBatchPaying(false)

    if (successCount > 0) {
      toast.success(
        `Paid ${successCount} employee${successCount > 1 ? 's' : ''}`,
      )
    }
    if (failCount > 0) {
      toast.error(
        `Failed to pay ${failCount} employee${failCount > 1 ? 's' : ''}`,
      )
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['treasury'] }),
      queryClient.invalidateQueries({ queryKey: ['payroll'] }),
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
    ])
  }

  const handleIndividualPay = async (emp: EmployeeRecord) => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA ||
      !vaultPDA
    )
      return

    setIsIndividualPaying(true)
    try {
      const recordId = createRecordId()
      const [payrollPda] = getPayrollPDA(treasuryPDA, emp.wallet, recordId)
      const [employeeInfoPda] = getEmployeePDA(treasuryPDA, emp.wallet)
      const employeeAta = getAssociatedTokenAddressSync(
        treasury.tokenMint,
        emp.wallet,
      )

      const month = format(new Date(), 'MMMM yyyy')

      const tx = await program.methods
        .paySalary(new anchor.BN(recordId.toString()), `${month} salary`)
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPDA,
          vault: vaultPDA,
          employee: emp.wallet,
          employeeInfo: employeeInfoPda,
          employeeTokenAccount: employeeAta,
          payroll: payrollPda,
          tokenMint: treasury.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction, {
        skipPreflight: true,
      })

      toast.success(`Paid ${emp.name} successfully`)
      setPayingEmployee(null)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['treasury'] }),
        queryClient.invalidateQueries({ queryKey: ['payroll'] }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
      ])
    } catch (err) {
      console.error(`Pay salary failed for ${emp.name}:`, err)
      toast.error(`Failed to pay ${emp.name}`, {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsIndividualPaying(false)
    }
  }

  const totalReceived = records.reduce((sum, r) => sum + r.amount, 0)

  const batchPreviewColumns = [
    {
      header: 'Employee',
      className: 'w-40',
      cell: (row: BatchItem) => (
        <span className="truncate font-medium">{row.employee.name}</span>
      ),
    },
    {
      header: 'Base Salary',
      className: 'whitespace-nowrap',
      cell: (row: BatchItem) => (
        <TokenAmount
          amount={row.employee.baseSalary}
          className="font-mono tabular-nums"
        />
      ),
    },
    {
      header: 'Reimb.',
      className: 'whitespace-nowrap',
      cell: (row: BatchItem) =>
        row.employee.pendingReimbursement > 0 ? (
          <TokenAmount
            amount={row.employee.pendingReimbursement}
            className="font-mono text-amber-600"
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: 'Total',
      className: 'whitespace-nowrap',
      cell: (row: BatchItem) => (
        <TokenAmount
          amount={row.employee.baseSalary + row.employee.pendingReimbursement}
          className="font-mono font-semibold"
        />
      ),
    },
    {
      header: 'Status',
      className: 'w-32 text-right',
      cell: (row: BatchItem) => {
        switch (row.status) {
          case 'pending':
            return (
              <Badge variant="outline">
                <CircleDot className="mr-1 size-3" />
                Pending
              </Badge>
            )
          case 'paying':
            return (
              <Badge variant="secondary">
                <Spinner className="mr-1" />
                Paying...
              </Badge>
            )
          case 'success':
            return (
              <Badge variant="default" className="bg-emerald-600">
                <CheckCircle2 className="mr-1 size-3" />
                Paid
              </Badge>
            )
          case 'error':
            return (
              <Badge variant="destructive">
                <XCircle className="mr-1 size-3" />
                Failed
              </Badge>
            )
        }
      },
    },
  ]

  const historyColumns = [
    {
      header: 'Employee',
      cell: (row: PayrollRecord) => (
        <Address address={row.employee.toBase58()} />
      ),
    },
    {
      header: 'Total',
      cell: (row: PayrollRecord) => (
        <TokenAmount
          amount={row.amount}
          className="font-mono font-semibold tabular-nums"
        />
      ),
    },
    {
      header: 'Base',
      cell: (row: PayrollRecord) => (
        <TokenAmount
          amount={row.baseSalary}
          className="font-mono text-sm tabular-nums"
        />
      ),
    },
    {
      header: 'Reimb.',
      cell: (row: PayrollRecord) =>
        row.reimbursementAmount > 0 ? (
          <TokenAmount
            amount={row.reimbursementAmount}
            className="font-mono text-amber-600 text-sm"
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: 'Memo',
      cell: (row: PayrollRecord) => (
        <span className="text-muted-foreground">{row.memo}</span>
      ),
    },
    {
      header: 'Date',
      cell: (row: PayrollRecord) =>
        format(new Date(row.timestamp * 1000), 'MMM d, yyyy'),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          Payroll
        </h1>
        <p className="text-pretty text-muted-foreground text-sm">
          {isAdmin ? 'Batch pay salaries to your team' : 'Your salary history'}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-5" />
              Monthly Batch Payroll
            </CardTitle>
            <CardDescription>
              Pay all employees their monthly salary (base + approved
              reimbursements) in one batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Employees</p>
                <p className="font-bold text-2xl">{employees.length}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Total Payable</p>
                <p className="font-bold text-2xl">
                  <TokenAmount amount={totalPayable} animated />
                </p>
              </div>
              <div className="flex items-end">
                <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={employees.length === 0 || isBatchPaying}
                      />
                    }
                  >
                    <Banknote className="mr-1.5" />
                    Pay All Salaries
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Confirm Batch Payroll</DialogTitle>
                      <DialogDescription>
                        Review the salary breakdown for each employee. Each
                        payment will be sent as a separate transaction.
                      </DialogDescription>
                    </DialogHeader>
                    <DataTable
                      columns={batchPreviewColumns}
                      data={
                        batchItems.length > 0
                          ? batchItems
                          : employees
                              .filter(
                                (e) =>
                                  e.baseSalary + e.pendingReimbursement > 0,
                              )
                              .map((e) => ({
                                employee: e,
                                status: 'pending' as BatchStatus,
                              }))
                      }
                      emptyMessage="No payable employees."
                      pageSize={20}
                    />
                    <div className="-mx-4 -mb-4 flex flex-col-reverse items-center justify-between gap-2 rounded-b-xl border-t bg-muted/50 p-4 pt-4 sm:flex-row">
                      <div>
                        <span className="text-muted-foreground text-sm">
                          Total:{' '}
                        </span>
                        <TokenAmount
                          amount={totalPayable}
                          className="font-mono font-semibold"
                        />
                      </div>
                      <Button
                        onClick={handleBatchPay}
                        disabled={isBatchPaying || employees.length === 0}
                      >
                        {isBatchPaying ? (
                          <Spinner />
                        ) : (
                          <Banknote className="mr-1.5" />
                        )}
                        {isBatchPaying ? 'Processing...' : 'Confirm & Pay'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && employees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="size-5" />
              Individual Pay
            </CardTitle>
            <CardDescription>
              Pay a specific employee their salary outside of the batch cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  header: 'Employee',
                  className: 'w-[160px]',
                  cell: (row: EmployeeRecord) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="truncate text-muted-foreground text-xs">
                        {row.position}
                      </p>
                    </div>
                  ),
                },
                {
                  header: 'Base Salary',
                  cell: (row: EmployeeRecord) => (
                    <TokenAmount
                      amount={row.baseSalary}
                      className="font-mono"
                    />
                  ),
                },
                {
                  header: 'Reimb.',
                  cell: (row: EmployeeRecord) =>
                    row.pendingReimbursement > 0 ? (
                      <TokenAmount
                        amount={row.pendingReimbursement}
                        className="font-mono text-amber-600"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    ),
                },
                {
                  header: 'Total',
                  cell: (row: EmployeeRecord) => (
                    <TokenAmount
                      amount={row.baseSalary + row.pendingReimbursement}
                      className="font-mono font-semibold"
                    />
                  ),
                },
                {
                  header: '',
                  className: 'w-[80px] text-right',
                  cell: (row: EmployeeRecord) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={row.baseSalary + row.pendingReimbursement === 0}
                      onClick={() => setPayingEmployee(row)}
                    >
                      Pay
                    </Button>
                  ),
                },
              ]}
              data={employees}
              emptyMessage="No employees."
            />
          </CardContent>

          <Dialog
            open={!!payingEmployee}
            onOpenChange={(open) => {
              if (!open) setPayingEmployee(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pay {payingEmployee?.name}</DialogTitle>
                <DialogDescription>
                  Confirm salary payment for this employee.
                </DialogDescription>
              </DialogHeader>
              {payingEmployee && (
                <div className="grid gap-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      Base Salary
                    </span>
                    <TokenAmount
                      amount={payingEmployee.baseSalary}
                      className="font-mono"
                    />
                  </div>
                  {payingEmployee.pendingReimbursement > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Reimbursement
                      </span>
                      <TokenAmount
                        amount={payingEmployee.pendingReimbursement}
                        className="font-mono text-amber-600"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="font-medium text-sm">Total</span>
                    <TokenAmount
                      amount={
                        payingEmployee.baseSalary +
                        payingEmployee.pendingReimbursement
                      }
                      className="font-mono font-semibold"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  onClick={() => {
                    if (payingEmployee) handleIndividualPay(payingEmployee)
                  }}
                  disabled={isIndividualPaying}
                >
                  {isIndividualPaying ? (
                    <Spinner />
                  ) : (
                    <Banknote className="mr-1.5" />
                  )}
                  {isIndividualPaying ? 'Paying...' : 'Confirm & Pay'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      {!isAdmin && totalReceived > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Total Received</p>
            <p className="font-bold text-3xl">
              <TokenAmount amount={totalReceived} animated />
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-4 font-semibold text-lg">Payment History</h2>
        <DataTable
          columns={historyColumns}
          data={records}
          emptyMessage="No salary payments yet."
        />
      </div>
    </div>
  )
}
