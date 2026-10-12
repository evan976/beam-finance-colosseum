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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@beam/ui/components/dialog'
import { Input } from '@beam/ui/components/input'
import { Label } from '@beam/ui/components/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@beam/ui/components/select'
import { Spinner } from '@beam/ui/components/spinner'
import * as anchor from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeftRight, BookUser, Plus, Send, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { TokenAmount } from '@/components/token-amount'
import { useContacts } from '@/hooks/use-contacts'
import { useEmployees } from '@/hooks/use-employees'
import { useProgram } from '@/hooks/use-program'
import {
  TRANSFER_TYPE,
  type TransferRecord,
  useTransfers,
} from '@/hooks/use-transfers'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'
import { createRecordId, getContactPDA, getTransferPDA } from '@/lib/pda'
import { signAndSend } from '@/lib/send-tx'

function AddContactDialog({ onAdded }: { onAdded: () => void }) {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { program } = useProgram()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    if (!publicKey || !connection || !sendTransaction || !program) return
    if (!name.trim() || !address.trim()) return

    setIsSaving(true)
    try {
      const addressPk = new PublicKey(address.trim())
      const [contactPda] = getContactPDA(publicKey, addressPk)

      const tx = await program.methods
        .addContact(addressPk, name.trim())
        .accountsStrict({
          owner: publicKey,
          contact: contactPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)

      toast.success('Contact saved')
      setName('')
      setAddress('')
      setOpen(false)
      onAdded()
    } catch (err) {
      console.error('Failed to add contact:', err)
      toast.error('Failed to save contact', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            Add Contact
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Save a wallet address for quick transfers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Binance, OKX..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
          </div>
          <div className="grid gap-2">
            <Label>Wallet Address</Label>
            <Input
              placeholder="Solana address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !address.trim() || isSaving}
          >
            {isSaving && <Spinner />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MANUAL_ENTRY = '__manual__'

export default function TransfersPage() {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { treasury, treasuryPDA, vaultPDA, isAdmin } = useTreasury()
  const { program } = useProgram()
  const queryClient = useQueryClient()
  const { records } = useTransfers(treasuryPDA, publicKey ?? undefined, {
    isAdmin,
  })
  const { contacts, refetch: refetchContacts } = useContacts(publicKey)
  const { employees } = useEmployees(treasuryPDA)

  const [selectedContact, setSelectedContact] = React.useState('')
  const [manualAddress, setManualAddress] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [memo, setMemo] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)

  const employeesByWallet = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees) map.set(e.wallet.toBase58(), e.name)
    return map
  }, [employees])

  const recipient =
    selectedContact === MANUAL_ENTRY ? manualAddress.trim() : selectedContact

  if (!treasury) return <CreateTreasuryPrompt />

  const resetForm = () => {
    setSelectedContact('')
    setManualAddress('')
    setAmount('')
    setMemo('')
  }

  const handleTreasuryTransfer = async () => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA ||
      !vaultPDA
    )
      return
    const tokenAmount = Math.floor(parseFloat(amount) * 10 ** TOKEN_DECIMALS)
    if (Number.isNaN(tokenAmount) || tokenAmount <= 0 || !recipient) return

    setIsSending(true)
    try {
      const recipientPk = new PublicKey(recipient)
      const recordId = createRecordId()
      const [transferPda] = getTransferPDA(treasuryPDA, recipientPk, recordId)
      const recipientAta = getAssociatedTokenAddressSync(
        treasury.tokenMint,
        recipientPk,
      )

      const tx = await program.methods
        .transferFromTreasury(
          new anchor.BN(recordId.toString()),
          new anchor.BN(tokenAmount),
          memo || 'Transfer',
        )
        .accountsStrict({
          admin: publicKey,
          treasury: treasuryPDA,
          vault: vaultPDA,
          recipient: recipientPk,
          recipientTokenAccount: recipientAta,
          transferRecord: transferPda,
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

      toast.success('Treasury transfer completed')
      resetForm()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['treasury'] }),
        queryClient.invalidateQueries({
          queryKey: ['transfers'],
        }),
      ])
    } catch (err) {
      console.error('Treasury transfer failed:', err)
      toast.error('Transfer failed', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleP2pTransfer = async () => {
    if (
      !publicKey ||
      !connection ||
      !sendTransaction ||
      !program ||
      !treasuryPDA
    )
      return
    const tokenAmount = Math.floor(parseFloat(amount) * 10 ** TOKEN_DECIMALS)
    if (Number.isNaN(tokenAmount) || tokenAmount <= 0 || !recipient) return

    setIsSending(true)
    try {
      const recipientPk = new PublicKey(recipient)
      const recordId = createRecordId()
      const [transferPda] = getTransferPDA(treasuryPDA, publicKey, recordId)
      const senderAta = getAssociatedTokenAddressSync(
        treasury.tokenMint,
        publicKey,
      )
      const recipientAta = getAssociatedTokenAddressSync(
        treasury.tokenMint,
        recipientPk,
      )

      const tx = await program.methods
        .transferP2P(
          new anchor.BN(recordId.toString()),
          new anchor.BN(tokenAmount),
          memo || 'Transfer',
        )
        .accountsStrict({
          sender: publicKey,
          recipient: recipientPk,
          treasury: treasuryPDA,
          senderTokenAccount: senderAta,
          recipientTokenAccount: recipientAta,
          transferRecord: transferPda,
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

      toast.success('P2P transfer completed')
      resetForm()
      await queryClient.invalidateQueries({
        queryKey: ['transfers'],
      })
    } catch (err) {
      console.error('P2P transfer failed:', err)
      toast.error('P2P transfer failed', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteContact = async (address: PublicKey) => {
    if (!publicKey || !connection || !sendTransaction || !program) return
    try {
      const [contactPda] = getContactPDA(publicKey, address)

      const tx = await program.methods
        .removeContact(address)
        .accountsStrict({
          owner: publicKey,
          contact: contactPda,
        })
        .transaction()

      await signAndSend(tx, publicKey, connection, sendTransaction)
      toast.success('Contact removed')
      await refetchContacts()
    } catch (err) {
      console.error('Failed to remove contact:', err)
      toast.error('Failed to remove contact', {
        description: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const recipientSelector = (
    <div className="grid gap-2">
      <Label>Recipient</Label>
      {selectedContact === MANUAL_ENTRY ? (
        <div className="relative">
          <Input
            placeholder="Solana address..."
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            className="pr-9 font-mono"
            autoFocus
          />
          <button
            type="button"
            aria-label="Clear manual address"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSelectedContact('')
              setManualAddress('')
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <Select
          value={selectedContact}
          onValueChange={(v) => {
            setSelectedContact(v ?? '')
            if (v !== MANUAL_ENTRY) setManualAddress('')
          }}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="Select recipient" />
          </SelectTrigger>
          <SelectContent>
            {contacts.length > 0 && (
              <SelectGroup>
                <SelectLabel>Contacts</SelectLabel>
                {contacts.map((c) => (
                  <SelectItem
                    key={c.address.toBase58()}
                    value={c.address.toBase58()}
                  >
                    {c.name} ({c.address.toBase58().slice(0, 4)}...
                    {c.address.toBase58().slice(-4)})
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {!isAdmin && (
              <SelectGroup>
                <SelectLabel>Teammates</SelectLabel>
                {treasury.employees
                  .filter((e) => e.toBase58() !== publicKey?.toBase58())
                  .map((e) => {
                    const addr = e.toBase58()
                    const name = employeesByWallet.get(addr)
                    return (
                      <SelectItem key={addr} value={addr}>
                        {name
                          ? `${name} (${addr.slice(0, 4)}...${addr.slice(-4)})`
                          : `${addr.slice(0, 4)}...${addr.slice(-4)}`}
                      </SelectItem>
                    )
                  })}
              </SelectGroup>
            )}
            {(contacts.length > 0 ||
              (!isAdmin && treasury.employees.length > 0)) && (
              <SelectSeparator />
            )}
            <SelectGroup>
              <SelectItem value={MANUAL_ENTRY}>
                Enter address manually...
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  )

  const columns = [
    {
      header: 'Type',
      cell: (row: TransferRecord) => (
        <Badge variant="secondary" className="text-xs">
          {row.transferType === TRANSFER_TYPE.P2P ? 'P2P' : 'Treasury'}
        </Badge>
      ),
    },
    {
      header: 'From',
      cell: (row: TransferRecord) => (
        <Address address={row.sender.toBase58()} />
      ),
    },
    {
      header: 'To',
      cell: (row: TransferRecord) => (
        <Address address={row.recipient.toBase58()} />
      ),
    },
    {
      header: 'Amount',
      cell: (row: TransferRecord) => (
        <TokenAmount amount={row.amount} className="font-mono" />
      ),
    },
    {
      header: 'Memo',
      cell: (row: TransferRecord) => (
        <span className="text-muted-foreground">{row.memo}</span>
      ),
    },
    {
      header: 'Date',
      cell: (row: TransferRecord) =>
        format(new Date(row.timestamp * 1000), 'MMM d, yyyy'),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          Transfers
        </h1>
        <p className="text-pretty text-muted-foreground text-sm">
          {isAdmin
            ? `Transfer ${TOKEN_SYMBOL} from the treasury or view team transfers`
            : `Send ${TOKEN_SYMBOL} to contacts, teammates, or any wallet`}
        </p>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-5" />
              Treasury Transfer
            </CardTitle>
            <CardDescription>
              Send {TOKEN_SYMBOL} from the treasury to any wallet address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              {recipientSelector}
              <div className="grid gap-2">
                <Label>Amount ({TOKEN_SYMBOL})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Memo</Label>
                <Input
                  placeholder="Payment for..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={64}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleTreasuryTransfer}
                  disabled={!recipient || !amount || isSending}
                  className="w-full"
                >
                  {isSending && <Spinner />}
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="size-5" />
              Send {TOKEN_SYMBOL}
            </CardTitle>
            <CardDescription>
              Transfer {TOKEN_SYMBOL} from your wallet to any address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              {recipientSelector}
              <div className="grid gap-2">
                <Label>Amount ({TOKEN_SYMBOL})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="10.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Memo</Label>
                <Input
                  placeholder="Lunch money..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={64}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleP2pTransfer}
                  disabled={!recipient || !amount || isSending}
                  className="w-full"
                >
                  {isSending && <Spinner />}
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookUser className="size-5" />
              Address Book
            </CardTitle>
            <AddContactDialog
              onAdded={() => {
                refetchContacts()
                queryClient.invalidateQueries({
                  queryKey: ['contacts'],
                })
              }}
            />
          </div>
          <CardDescription>
            Saved wallet addresses for quick transfers.
          </CardDescription>
        </CardHeader>
        {contacts.length > 0 && (
          <CardContent>
            <div className="divide-y">
              {contacts.map((c) => (
                <div
                  key={c.publicKey.toBase58()}
                  className="flex items-center justify-between py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{c.name}</p>
                    <Address
                      className="font-mono text-muted-foreground text-xs"
                      address={c.address.toBase58()}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteContact(c.address)}
                    aria-label={`Remove contact ${c.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <div>
        <h2 className="mb-4 text-balance font-semibold text-lg">
          Transfer History
        </h2>
        <DataTable
          columns={columns}
          data={records}
          emptyMessage="No transfers yet."
        />
      </div>
    </div>
  )
}
