'use client'

import * as React from 'react'
import { Button } from '@beam/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@beam/ui/components/card'
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
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { Transaction } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Shield, Users, Vault } from 'lucide-react'
import { toast } from 'sonner'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { TokenAmount } from '@/components/token-amount'
import { useEmployees } from '@/hooks/use-employees'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { MAX_EMPLOYEES, TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'
import { signAndSend } from '@/lib/send-tx'

export default function TreasuryPage() {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { treasury, treasuryPDA, vaultPDA, vaultBalance, isAdmin, refetch } =
    useTreasury()
  const { employees } = useEmployees(treasuryPDA)
  const queryClient = useQueryClient()

  const [fundAmount, setFundAmount] = React.useState('')
  const [isFunding, setIsFunding] = React.useState(false)
  const [fundOpen, setFundOpen] = React.useState(false)

  if (!treasury) {
    return <CreateTreasuryPrompt onCreated={refetch} />
  }

  const handleFund = async () => {
    if (!publicKey || !vaultPDA || !connection || !sendTransaction || !treasury)
      return
    const parsed = parseFloat(fundAmount)
    if (Number.isNaN(parsed) || parsed <= 0) return

    const amount = Math.floor(parsed * 10 ** TOKEN_DECIMALS)

    setIsFunding(true)
    try {
      const userAta = getAssociatedTokenAddressSync(
        treasury.tokenMint,
        publicKey,
      )
      const tx = new Transaction().add(
        createTransferInstruction(userAta, vaultPDA, publicKey, amount),
      )
      await signAndSend(tx, publicKey, connection, sendTransaction)
      toast.success('Treasury funded successfully')
      setFundOpen(false)
      setFundAmount('')
      await queryClient.invalidateQueries({ queryKey: ['treasury'] })
    } catch (err) {
      console.error('Fund failed:', err)
      toast.error('Failed to fund treasury', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsFunding(false)
    }
  }

  const totalMonthlyPayroll = employees.reduce(
    (sum, e) => sum + e.baseSalary,
    0,
  )

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Treasury</h1>
          <p className="text-muted-foreground text-sm">
            {treasury.name} &middot; View-only access
          </p>
        </div>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Vault className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Treasury Balance
                </p>
                <p className="font-bold text-3xl tracking-tight">
                  <TokenAmount amount={vaultBalance} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Treasury Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <InfoRow label="Name" value={treasury.name} />
              <InfoRow
                label="Admin"
                value={
                  <Address address={treasury.admin.toBase58()} showExplorer />
                }
              />
              <InfoRow
                label="Token"
                value={
                  <Address
                    address={treasury.tokenMint.toBase58()}
                    showExplorer
                  />
                }
              />
              <InfoRow
                label="Employees"
                value={`${treasury.employees.length} / ${MAX_EMPLOYEES}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Treasury</h1>
          <p className="text-muted-foreground text-sm">
            Manage your company treasury
          </p>
        </div>
        <Dialog open={fundOpen} onOpenChange={setFundOpen}>
          <DialogTrigger render={<Button />}>
            <ArrowDownToLine className="mr-1.5" />
            Fund Treasury
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fund Treasury</DialogTitle>
              <DialogDescription>
                Transfer {TOKEN_SYMBOL} from your wallet to the treasury vault.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fund-amount">Amount ({TOKEN_SYMBOL})</Label>
                <Input
                  id="fund-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleFund} disabled={isFunding}>
                {isFunding && <Spinner />}
                {isFunding ? 'Funding...' : `Send ${TOKEN_SYMBOL}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="relative overflow-hidden">
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Vault className="size-7" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground text-sm">
                  {treasury.name}
                </p>
                <p className="font-bold text-4xl tracking-tight">
                  <TokenAmount amount={vaultBalance} />
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Employees</p>
                <p className="font-semibold text-lg">
                  {treasury.employees.length}
                  <span className="text-muted-foreground text-sm">
                    {' '}
                    / {MAX_EMPLOYEES}
                  </span>
                </p>
              </div>
              {totalMonthlyPayroll > 0 && (
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">
                    Monthly Payroll
                  </p>
                  <p className="font-semibold text-lg">
                    <TokenAmount amount={totalMonthlyPayroll} />
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-muted-foreground" />
              Team
            </CardTitle>
            <CardDescription>
              {employees.length === 0
                ? 'No employees added yet'
                : `${employees.length} employee${employees.length > 1 ? 's' : ''} on payroll`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length > 0 ? (
              <div className="grid gap-2">
                {employees.slice(0, 5).map((emp) => (
                  <div
                    key={emp.wallet.toBase58()}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{emp.name}</p>
                      <p className="truncate text-muted-foreground text-xs">
                        {emp.position}
                        {emp.department ? ` · ${emp.department}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm">
                      <TokenAmount amount={emp.baseSalary} />
                    </span>
                  </div>
                ))}
                {employees.length > 5 && (
                  <p className="pt-1 text-center text-muted-foreground text-xs">
                    + {employees.length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm">
                  Add employees from the Employees page
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4 text-muted-foreground" />
              Admin &amp; Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow
              label="Admin"
              value={
                <Address address={treasury.admin.toBase58()} showExplorer />
              }
            />
            <InfoRow
              label="Token Mint"
              value={
                <Address address={treasury.tokenMint.toBase58()} showExplorer />
              }
            />
            {treasuryPDA && (
              <InfoRow
                label="Treasury PDA"
                value={
                  <Address address={treasuryPDA.toBase58()} showExplorer />
                }
              />
            )}
            {vaultPDA && (
              <InfoRow
                label="Vault PDA"
                value={<Address address={vaultPDA.toBase58()} showExplorer />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-muted-foreground text-sm">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-sm">
        {value}
      </span>
    </div>
  )
}
