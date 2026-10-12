'use client'

import type { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useProgram } from './use-program'

export interface TransferRecord {
  publicKey: PublicKey
  sender: PublicKey
  recipient: PublicKey
  amount: number
  memo: string
  timestamp: number
  treasury: PublicKey
  transferType: number
}

export const TRANSFER_TYPE = {
  TREASURY_OUT: 0,
  P2P: 1,
} as const

export function useTransfers(
  treasuryPDA: PublicKey | null,
  wallet?: PublicKey,
  options?: { isAdmin?: boolean },
) {
  const { program } = useProgram()
  const isAdmin = options?.isAdmin ?? false

  const query = useQuery({
    queryKey: queryKeys.transfers(treasuryPDA, wallet, isAdmin),
    queryFn: async (): Promise<TransferRecord[]> => {
      if (!program || !treasuryPDA) return []

      const all = await program.account.transfer.all()
      let mapped: TransferRecord[] = all
        .filter((a) => a.account.treasury.toBase58() === treasuryPDA.toBase58())
        .map((a) => ({
          publicKey: a.publicKey,
          sender: a.account.sender,
          recipient: a.account.recipient,
          amount: a.account.amount.toNumber(),
          memo: a.account.memo,
          timestamp: a.account.timestamp.toNumber(),
          treasury: a.account.treasury,
          transferType: a.account.transferType,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)

      if (isAdmin) {
        mapped = mapped.filter(
          (r) => r.transferType === TRANSFER_TYPE.TREASURY_OUT,
        )
      } else if (wallet) {
        const key = wallet.toBase58()
        mapped = mapped.filter(
          (r) => r.sender.toBase58() === key || r.recipient.toBase58() === key,
        )
      }

      return mapped
    },
    enabled: !!program && !!treasuryPDA,
  })

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
