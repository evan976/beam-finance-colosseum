'use client'

import * as React from 'react'
import { Button } from '@beam/ui/components/button'
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
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Plus, Vault } from 'lucide-react'
import { toast } from 'sonner'
import { useProgram } from '@/hooks/use-program'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { isWhitelistedAdmin, USDC_DEVNET_MINT } from '@/lib/constants'
import { getTreasuryPDA, getVaultPDA } from '@/lib/pda'
import { signAndSend } from '@/lib/send-tx'

interface CreateTreasuryPromptProps {
  onCreated?: () => void
}

export function CreateTreasuryPrompt({ onCreated }: CreateTreasuryPromptProps) {
  const { publicKey } = useWalletCompat()
  const canCreate = isWhitelistedAdmin(publicKey)

  if (canCreate) {
    return <AdminCreateView onCreated={onCreated} />
  }

  return <EmployeeWaitView />
}

/* ------------------------------------------------------------------ */
/*  Admin — Create Treasury                                           */
/* ------------------------------------------------------------------ */

function AdminCreateView({ onCreated }: { onCreated?: () => void }) {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { program } = useProgram()
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')
  const [tokenMint, setTokenMint] = React.useState(USDC_DEVNET_MINT.toBase58())
  const [isCreating, setIsCreating] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const handleCreate = async () => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !name.trim() ||
      !tokenMint.trim()
    )
      return

    setIsCreating(true)
    try {
      const mintPk = new PublicKey(tokenMint.trim())
      const [treasuryPda] = getTreasuryPDA(publicKey)
      const [vaultPda] = getVaultPDA(treasuryPda)

      const tx = await program.methods
        .createTreasury(name.trim())
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPda,
          vault: vaultPda,
          tokenMint: mintPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)

      toast.success('Treasury created successfully')
      setOpen(false)
      setName('')
      await queryClient.invalidateQueries({
        queryKey: ['treasury'],
      })
      onCreated?.()
    } catch (err) {
      console.error('Failed to create treasury:', err)
      toast.error('Failed to create treasury', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="relative flex w-full max-w-md flex-col items-center">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -z-10 size-72 -translate-x-1/2 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative mb-10">
          <div className="absolute -inset-4 rounded-3xl bg-primary/5 opacity-80 blur-sm" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Vault className="size-7" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-balance font-semibold text-xl tracking-tight">
          Create your Treasury
        </h1>
        <p className="mt-3 max-w-xs text-center text-muted-foreground text-sm leading-relaxed">
          Set up an on-chain treasury to manage payroll, reimbursements, and
          transfers for your team.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="lg" className="mt-10 px-6" />}>
            <Plus className="size-4" />
            Get Started
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Treasury</DialogTitle>
              <DialogDescription>
                Choose a name and token mint for your company treasury.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="treasury-name">Treasury Name</Label>
                <Input
                  id="treasury-name"
                  placeholder="e.g. Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token-mint">Token Mint (SPL)</Label>
                <Input
                  id="token-mint"
                  placeholder="Token mint address"
                  value={tokenMint}
                  onChange={(e) => setTokenMint(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-muted-foreground text-xs">
                  Defaults to USDT on devnet
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || !tokenMint.trim() || isCreating}
              >
                {isCreating && <Spinner />}
                {isCreating ? 'Creating...' : 'Create Treasury'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="mt-4 text-muted-foreground/50 text-xs">
          Your wallet will become the treasury admin
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Employee — Waiting                                                */
/* ------------------------------------------------------------------ */

function EmployeeWaitView() {
  const { publicKey } = useWalletCompat()
  const [copied, setCopied] = React.useState(false)
  const address = publicKey?.toBase58() ?? ''

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    toast.success('Address copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatted = address
    ? `${address.slice(0, 4)} ${address.slice(4, 8)} ${address.slice(8, 12)} ... ${address.slice(-12, -8)} ${address.slice(-8, -4)} ${address.slice(-4)}`
    : ''

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="relative flex w-full max-w-md flex-col items-center">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -z-10 size-72 -translate-x-1/2 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative mb-10">
          <div className="absolute -inset-4 rounded-3xl bg-muted/50 blur-sm" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl border bg-card">
            <span className="absolute -top-1.5 -right-1.5 flex size-3.5">
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-card bg-amber-500" />
            </span>
            <Vault className="size-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-balance font-semibold text-2xl tracking-tight">
          Waiting for your team
        </h1>
        <p className="mt-3 max-w-xs text-center text-[15px] text-muted-foreground leading-relaxed">
          Share your wallet address with your treasury admin. This page updates
          automatically once you&apos;re added.
        </p>
        {address && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy wallet address"
            className="group mt-10 w-full max-w-sm cursor-pointer rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase">
                Your wallet
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors group-hover:text-primary">
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </span>
            </div>
            <p className="text-foreground/80 text-sm leading-relaxed">
              {formatted}
            </p>
          </button>
        )}
      </div>
    </div>
  )
}
