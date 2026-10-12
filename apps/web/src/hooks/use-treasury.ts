'use client'

import type { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { getTreasuryPDA, getVaultPDA } from '@/lib/pda'
import { queryKeys } from '@/lib/query-keys'
import { useProgram } from './use-program'
import { useWalletCompat } from './use-wallet-compat'

export interface TreasuryData {
  admin: PublicKey
  name: string
  employees: PublicKey[]
  tokenMint: PublicKey
  bump: number
  vaultBump: number
}

interface TreasuryQueryResult {
  treasury: TreasuryData
  treasuryPDA: PublicKey
  vaultPDA: PublicKey
  vaultBalance: string
  isAdmin: boolean
  isEmployee: boolean
}

export function useTreasury() {
  const { publicKey, connection } = useWalletCompat()
  const { program } = useProgram()

  const query = useQuery({
    queryKey: queryKeys.treasury(publicKey),
    queryFn: async (): Promise<TreasuryQueryResult | null> => {
      if (!publicKey || !program || !connection) return null

      const [pda] = getTreasuryPDA(publicKey)
      try {
        const acct = await program.account.treasury.fetch(pda)
        const treasury = acct as TreasuryData
        const [vault] = getVaultPDA(pda)

        let vaultBalance = '0'
        try {
          const tokenBalance = await connection.getTokenAccountBalance(vault)
          vaultBalance = tokenBalance.value.amount
        } catch {
          // vault may not exist yet
        }

        const isAlsoEmployee = treasury.employees.some(
          (e) => e.toBase58() === publicKey!.toBase58(),
        )

        return {
          treasury,
          treasuryPDA: pda,
          vaultPDA: vault,
          vaultBalance,
          isAdmin: true,
          isEmployee: isAlsoEmployee,
        }
      } catch {
        // Not an admin — search as employee
      }

      const allTreasuries = await program.account.treasury.all()
      const found = allTreasuries.find((t) =>
        t.account.employees.some((e) => e.toBase58() === publicKey!.toBase58()),
      )

      if (found) {
        const treasury = found.account as TreasuryData
        const [vault] = getVaultPDA(found.publicKey)

        let vaultBalance = '0'
        try {
          const tokenBalance = await connection.getTokenAccountBalance(vault)
          vaultBalance = tokenBalance.value.amount
        } catch {
          // vault may not exist yet
        }

        return {
          treasury,
          treasuryPDA: found.publicKey,
          vaultPDA: vault,
          vaultBalance,
          isAdmin: false,
          isEmployee: true,
        }
      }

      return null
    },
    enabled: !!publicKey && !!program && !!connection,
  })

  const data = query.data

  return {
    treasury: data?.treasury ?? null,
    treasuryPDA: data?.treasuryPDA ?? null,
    vaultPDA: data?.vaultPDA ?? null,
    vaultBalance: data?.vaultBalance ?? '0',
    isAdmin: data?.isAdmin ?? false,
    isEmployee: data?.isEmployee ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
