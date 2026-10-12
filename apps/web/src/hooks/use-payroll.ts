'use client'

import type { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useProgram } from './use-program'

export interface PayrollRecord {
  publicKey: PublicKey
  employee: PublicKey
  amount: number
  baseSalary: number
  reimbursementAmount: number
  timestamp: number
  memo: string
  treasury: PublicKey
}

export function usePayroll(
  treasuryPDA: PublicKey | null,
  employee?: PublicKey,
) {
  const { program } = useProgram()

  const query = useQuery({
    queryKey: queryKeys.payroll(treasuryPDA, employee),
    queryFn: async (): Promise<PayrollRecord[]> => {
      if (!program || !treasuryPDA) return []

      let items: { publicKey: PublicKey; account: any }[] = []

      try {
        items = await program.account.payroll.all()
      } catch {
        const conn = program.provider.connection
        const raw = await conn.getProgramAccounts(program.programId)
        for (const { pubkey, account } of raw) {
          try {
            const data = program.coder.accounts.decode('payroll', account.data)
            items.push({ publicKey: pubkey, account: data })
          } catch {
            // not a payroll account or incompatible schema
          }
        }
      }

      return items
        .map((a) => ({
          publicKey: a.publicKey,
          employee: a.account.employee,
          amount: a.account.amount.toNumber(),
          baseSalary: a.account.baseSalary?.toNumber?.() ?? 0,
          reimbursementAmount: a.account.reimbursementAmount?.toNumber?.() ?? 0,
          timestamp: a.account.timestamp.toNumber(),
          memo: a.account.memo,
          treasury: a.account.treasury,
        }))
        .filter((r) => r.treasury.toBase58() === treasuryPDA.toBase58())
        .filter((r) =>
          employee ? r.employee.toBase58() === employee.toBase58() : true,
        )
        .sort((a, b) => b.timestamp - a.timestamp)
    },
    enabled: !!program && !!treasuryPDA,
  })

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
