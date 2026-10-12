'use client'

import * as React from 'react'
import type { PublicKey } from '@solana/web3.js'
import { type PayrollRecord, usePayroll } from './use-payroll'
import {
  type ReimbursementRecord,
  useReimbursements,
} from './use-reimbursements'
import { type TransferRecord, useTransfers } from './use-transfers'

export type TransactionType = 'payroll' | 'reimbursement' | 'transfer'

export interface UnifiedTransaction {
  type: TransactionType
  publicKey: PublicKey
  amount: number
  baseSalary?: number
  reimbursementAmount?: number
  timestamp: number
  description: string
  status?: number
  counterparty: PublicKey
}

function mapPayroll(r: PayrollRecord): UnifiedTransaction {
  return {
    type: 'payroll',
    publicKey: r.publicKey,
    amount: r.amount,
    baseSalary: r.baseSalary,
    reimbursementAmount: r.reimbursementAmount,
    timestamp: r.timestamp,
    description: r.memo || 'Salary payment',
    counterparty: r.employee,
  }
}

function mapReimbursement(r: ReimbursementRecord): UnifiedTransaction {
  return {
    type: 'reimbursement',
    publicKey: r.publicKey,
    amount: r.amount,
    timestamp: r.timestamp,
    description: r.description,
    status: r.status,
    counterparty: r.employee,
  }
}

function mapTransfer(r: TransferRecord): UnifiedTransaction {
  return {
    type: 'transfer',
    publicKey: r.publicKey,
    amount: r.amount,
    timestamp: r.timestamp,
    description: r.memo || 'Transfer',
    counterparty: r.recipient,
  }
}

export function useTransactions(
  treasuryPDA: PublicKey | null,
  wallet?: PublicKey,
  options?: { isAdmin?: boolean },
) {
  const isAdmin = options?.isAdmin ?? false
  const employeeFilter = isAdmin ? undefined : wallet

  const {
    records: payrollRecords,
    isLoading: payrollLoading,
    refetch: refetchPayroll,
  } = usePayroll(treasuryPDA, employeeFilter)
  const {
    records: reimbursementRecords,
    isLoading: reimbursementLoading,
    refetch: refetchReimbursements,
  } = useReimbursements(treasuryPDA, employeeFilter)
  const {
    records: transferRecords,
    isLoading: transferLoading,
    refetch: refetchTransfers,
  } = useTransfers(treasuryPDA, wallet, { isAdmin })

  const transactions = React.useMemo(() => {
    const all: UnifiedTransaction[] = [
      ...payrollRecords.map(mapPayroll),
      ...reimbursementRecords.map(mapReimbursement),
      ...transferRecords.map(mapTransfer),
    ]
    return all.sort((a, b) => b.timestamp - a.timestamp)
  }, [payrollRecords, reimbursementRecords, transferRecords])

  const isLoading = payrollLoading || reimbursementLoading || transferLoading

  const refetch = React.useCallback(() => {
    refetchPayroll()
    refetchReimbursements()
    refetchTransfers()
  }, [refetchPayroll, refetchReimbursements, refetchTransfers])

  return { transactions, isLoading, refetch }
}
