'use client'

import type { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useProgram } from './use-program'

export interface EmployeeRecord {
  publicKey: PublicKey
  wallet: PublicKey
  treasury: PublicKey
  name: string
  department: string
  position: string
  baseSalary: number
  pendingReimbursement: number
}

export function useEmployees(treasuryPDA: PublicKey | null) {
  const { program } = useProgram()

  const query = useQuery({
    queryKey: queryKeys.employees(treasuryPDA),
    queryFn: async (): Promise<EmployeeRecord[]> => {
      if (!program || !treasuryPDA) return []

      const all = await program.account.employee.all()
      return all
        .filter((a) => a.account.treasury.toBase58() === treasuryPDA.toBase58())
        .map((a) => ({
          publicKey: a.publicKey,
          wallet: a.account.wallet,
          treasury: a.account.treasury,
          name: a.account.name,
          department: a.account.department,
          position: a.account.position,
          baseSalary: a.account.baseSalary.toNumber(),
          pendingReimbursement: a.account.pendingReimbursement.toNumber(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: !!program && !!treasuryPDA,
  })

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
