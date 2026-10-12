'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@beam/ui/components/alert-dialog'
import { Button } from '@beam/ui/components/button'
import { DataTable } from '@beam/ui/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@beam/ui/components/dialog'
import { Input } from '@beam/ui/components/input'
import { Label } from '@beam/ui/components/label'
import { Spinner } from '@beam/ui/components/spinner'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { TokenAmount } from '@/components/token-amount'
import { type EmployeeRecord, useEmployees } from '@/hooks/use-employees'
import { useProgram } from '@/hooks/use-program'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { MAX_EMPLOYEES, TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'
import { getEmployeePDA } from '@/lib/pda'
import { signAndSend } from '@/lib/send-tx'

export default function EmployeesPage() {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { treasury, treasuryPDA, isAdmin } = useTreasury()
  const { program } = useProgram()
  const { employees } = useEmployees(treasuryPDA)
  const queryClient = useQueryClient()

  const [newEmployee, setNewEmployee] = React.useState('')
  const [name, setName] = React.useState('')
  const [department, setDepartment] = React.useState('')
  const [position, setPosition] = React.useState('')
  const [baseSalary, setBaseSalary] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [removingKey, setRemovingKey] = React.useState<string | null>(null)
  const [pendingRemove, setPendingRemove] =
    React.useState<EmployeeRecord | null>(null)

  if (!treasury) return <CreateTreasuryPrompt />

  if (!isAdmin)
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="absolute -inset-3 rounded-2xl bg-muted/60" />
            <div className="relative flex size-14 items-center justify-center rounded-xl bg-muted">
              <Users
                className="size-6 text-muted-foreground"
                strokeWidth={1.75}
              />
            </div>
          </div>
          <h2 className="font-semibold text-xl tracking-tight">Admin Only</h2>
          <p className="mt-2 max-w-xs text-muted-foreground text-sm leading-relaxed">
            Only treasury admins can manage the employee roster. Contact your
            admin if you need changes.
          </p>
        </div>
      </div>
    )

  const handleAdd = async () => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA
    )
      return
    try {
      const employeePubkey = new PublicKey(newEmployee.trim())
      if (employeePubkey.equals(publicKey)) {
        toast.error('This is your admin wallet', {
          description: 'Enter the employee’s own Solana wallet address.',
        })
        return
      }
      const salaryAmount = Math.floor(
        parseFloat(baseSalary) * 10 ** TOKEN_DECIMALS,
      )
      if (Number.isNaN(salaryAmount) || salaryAmount <= 0) {
        toast.error('Please enter a valid salary amount')
        return
      }

      setIsAdding(true)
      const [employeeInfoPda] = getEmployeePDA(treasuryPDA, employeePubkey)

      const tx = await program.methods
        .addEmployee(
          employeePubkey,
          name.trim(),
          department.trim(),
          position.trim(),
          new anchor.BN(salaryAmount),
        )
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPDA,
          employeeInfo: employeeInfoPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)
      toast.success('Employee added successfully')
      setAddOpen(false)
      setNewEmployee('')
      setName('')
      setDepartment('')
      setPosition('')
      setBaseSalary('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['treasury'] }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
      ])
    } catch (err) {
      console.error('Failed to add employee:', err)
      toast.error('Failed to add employee', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (emp: EmployeeRecord) => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA
    )
      return
    setRemovingKey(emp.wallet.toBase58())
    try {
      const [employeeInfoPda] = getEmployeePDA(treasuryPDA, emp.wallet)
      const tx = await program.methods
        .removeEmployee(emp.wallet)
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPDA,
          employeeInfo: employeeInfoPda,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)
      toast.success('Employee removed')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['treasury'] }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
      ])
    } catch (err) {
      console.error('Failed to remove employee:', err)
      toast.error('Failed to remove employee', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRemovingKey(null)
    }
  }

  const columns = [
    {
      header: 'Name',
      cell: (row: EmployeeRecord) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      header: 'Department',
      cell: (row: EmployeeRecord) => (
        <span className="text-muted-foreground">{row.department}</span>
      ),
    },
    {
      header: 'Position',
      cell: (row: EmployeeRecord) => (
        <span className="text-muted-foreground">{row.position}</span>
      ),
    },
    {
      header: `Base Salary (${TOKEN_SYMBOL})`,
      cell: (row: EmployeeRecord) => (
        <TokenAmount
          amount={row.baseSalary}
          className="font-mono tabular-nums"
        />
      ),
    },
    {
      header: 'Pending Reimb.',
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
      header: 'Wallet',
      cell: (row: EmployeeRecord) => (
        <Address address={row.wallet.toBase58()} showExplorer />
      ),
    },
    {
      header: '',
      className: 'w-[100px] text-right',
      cell: (row: EmployeeRecord) => (
        <Button
          variant="destructive"
          size="xs"
          onClick={() => setPendingRemove(row)}
          disabled={removingKey === row.wallet.toBase58()}
        >
          {removingKey === row.wallet.toBase58() ? (
            <Spinner />
          ) : (
            <Trash2 className="mr-1" />
          )}
          {removingKey === row.wallet.toBase58() ? 'Removing...' : 'Remove'}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-balance font-bold text-2xl tracking-tight">
            Employees
          </h1>
          <p className="text-pretty text-muted-foreground text-sm">
            {employees.length} of {MAX_EMPLOYEES} employees
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={<Button disabled={employees.length >= MAX_EMPLOYEES} />}
          >
            <Plus className="mr-1.5" />
            Add Employee
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Enter the employee details and wallet address.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employee-address">Wallet Address</Label>
                <Input
                  id="employee-address"
                  placeholder="Enter Solana address..."
                  value={newEmployee}
                  onChange={(e) => setNewEmployee(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="emp-name">Name</Label>
                  <Input
                    id="emp-name"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={32}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-dept">Department</Label>
                  <Input
                    id="emp-dept"
                    placeholder="e.g. Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    maxLength={32}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="emp-pos">Position</Label>
                  <Input
                    id="emp-pos"
                    placeholder="e.g. Senior Engineer"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    maxLength={32}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-salary">
                    Monthly Salary ({TOKEN_SYMBOL})
                  </Label>
                  <Input
                    id="emp-salary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5000.00"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAdd}
                disabled={
                  !newEmployee.trim() || !name.trim() || !baseSalary || isAdding
                }
              >
                {isAdding && <Spinner />}
                {isAdding ? 'Adding...' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        emptyMessage="No employees added yet."
      />

      <AlertDialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{pendingRemove?.name}</strong> from the treasury? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingRemove) {
                  handleRemove(pendingRemove)
                  setPendingRemove(null)
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
