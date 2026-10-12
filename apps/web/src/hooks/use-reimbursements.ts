'use client'

import type { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useProgram } from './use-program'

export interface ReimbursementRecord {
  publicKey: PublicKey
  employee: PublicKey
  amount: number
  description: string
  status: number
  approvedBy: PublicKey | null
  approvedAt: number | null
  timestamp: number
  treasury: PublicKey
}

export const REIMBURSEMENT_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

export function useReimbursements(
  treasuryPDA: PublicKey | null,
  employee?: PublicKey,
  statusFilter?: number,
) {
  const { program } = useProgram()

  const query = useQuery({
    queryKey: queryKeys.reimbursements(treasuryPDA, employee, statusFilter),
    queryFn: async (): Promise<ReimbursementRecord[]> => {
      if (!program || !treasuryPDA) return []

      const filters: any[] = []
      if (employee) {
        filters.push({
          memcmp: { offset: 8, bytes: employee.toBase58() },
        })
      }

      const all = await program.account.reimbursement.all(filters)
      let mapped: ReimbursementRecord[] = all
        .filter((a) => a.account.treasury.toBase58() === treasuryPDA.toBase58())
        .map((a) => ({
          publicKey: a.publicKey,
          employee: a.account.employee,
          amount: a.account.amount.toNumber(),
          description: a.account.description,
          status: a.account.status,
          approvedBy: a.account.approvedBy ?? null,
          approvedAt: a.account.approvedAt
            ? a.account.approvedAt.toNumber()
            : null,
          timestamp: a.account.timestamp.toNumber(),
          treasury: a.account.treasury,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)

      if (statusFilter !== undefined) {
        mapped = mapped.filter((r) => r.status === statusFilter)
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
