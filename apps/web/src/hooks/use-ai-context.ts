'use client'

import * as React from 'react'
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'
import { useContacts } from './use-contacts'
import { useEmployees } from './use-employees'
import { usePayroll } from './use-payroll'
import { useReimbursements } from './use-reimbursements'
import { useTransfers } from './use-transfers'
import { useTreasury } from './use-treasury'
import { useWalletCompat } from './use-wallet-compat'

function fmtToken(raw: number | string): string {
  return (Number(raw) / 10 ** TOKEN_DECIMALS).toFixed(2)
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

export interface AiContext {
  summary: string
  raw: {
    treasuryName: string | null
    balance: string | null
    isAdmin: boolean
    employeeCount: number | null
    employees: Array<{
      name: string
      position: string
      department: string
      wallet: string
      baseSalary: string
    }>
    reimbursements: Array<{
      id: string
      employee: string
      employeeName: string
      amount: string
      description: string
      status: string
      date: string
    }>
    payrolls: Array<{
      employee: string
      employeeName: string
      amount: string
      memo: string
      date: string
    }>
    transfers: Array<{
      sender: string
      senderName: string
      recipient: string
      recipientName: string
      amount: string
      memo: string
      date: string
    }>
    contacts: Array<{
      name: string
      address: string
    }>
  }
}

const STATUS_LABELS: Record<number, string> = {
  0: 'pending',
  1: 'approved',
  2: 'rejected',
}

export function useAiContext(): AiContext | null {
  const { publicKey } = useWalletCompat()
  const { treasury, treasuryPDA, vaultBalance, isAdmin } = useTreasury()
  const { employees } = useEmployees(treasuryPDA)

  const wallet = publicKey ?? undefined
  const employeeFilter = isAdmin ? undefined : wallet
  const { records: payrolls } = usePayroll(treasuryPDA, employeeFilter)
  const { records: reimbursements } = useReimbursements(
    treasuryPDA,
    employeeFilter,
  )
  const { records: transfers } = useTransfers(treasuryPDA, wallet, { isAdmin })
  const { contacts } = useContacts(publicKey)

  return React.useMemo(() => {
    if (!treasury) return null

    const empData = employees.map((e) => ({
      name: e.name,
      position: e.position,
      department: e.department,
      wallet: e.wallet.toBase58(),
      baseSalary: fmtToken(e.baseSalary),
    }))

    const nameByWallet = new Map<string, string>()
    for (const e of empData) nameByWallet.set(e.wallet, e.name)
    const resolveName = (wallet: string) =>
      nameByWallet.get(wallet) ?? `${wallet.slice(0, 8)}…`

    const reimbData = reimbursements.slice(0, 50).map((r) => {
      const wallet = r.employee.toBase58()
      return {
        id: r.publicKey.toBase58(),
        employee: wallet,
        employeeName: resolveName(wallet),
        amount: fmtToken(r.amount),
        description: r.description,
        status: STATUS_LABELS[r.status] ?? String(r.status),
        date: fmtDate(r.timestamp),
      }
    })

    const payData = payrolls.slice(0, 50).map((p) => {
      const wallet = p.employee.toBase58()
      return {
        employee: wallet,
        employeeName: resolveName(wallet),
        amount: fmtToken(p.amount),
        memo: p.memo,
        date: fmtDate(p.timestamp),
      }
    })

    const txData = transfers.slice(0, 50).map((t) => {
      const senderWallet = t.sender.toBase58()
      const recipientWallet = t.recipient.toBase58()
      return {
        sender: senderWallet,
        senderName: resolveName(senderWallet),
        recipient: recipientWallet,
        recipientName: resolveName(recipientWallet),
        amount: fmtToken(t.amount),
        memo: t.memo,
        date: fmtDate(t.timestamp),
      }
    })

    const contactData = contacts.map((c) => ({
      name: c.name,
      address: c.address.toBase58(),
    }))

    const walletKey = publicKey?.toBase58() ?? ''
    const myInfo = empData.find((e) => e.wallet === walletKey)

    const lines: string[] = [
      `Company: ${treasury.name}`,
      `Role: ${isAdmin ? 'Admin' : 'Employee'}`,
    ]

    if (isAdmin) {
      const totalPayroll = employees.reduce((s, e) => s + e.baseSalary, 0)
      lines.push(
        `Treasury Balance: ${fmtToken(vaultBalance)} ${TOKEN_SYMBOL}`,
        `Employees (${employees.length}):`,
        ...empData.map(
          (e) =>
            `  - ${e.name} | ${e.position} | ${e.department} | salary ${e.baseSalary} ${TOKEN_SYMBOL} | wallet: ${e.wallet}`,
        ),
        `Total Monthly Payroll: ${fmtToken(totalPayroll)} ${TOKEN_SYMBOL}`,
        ``,
        `Recent Payroll Records (${payData.length}):`,
        ...payData.map(
          (p) =>
            `  - ${p.date} | ${p.employeeName} | ${p.amount} ${TOKEN_SYMBOL} | ${p.memo}`,
        ),
        ``,
        `All Reimbursements (${reimbData.length}):`,
        ...reimbData.map(
          (r) =>
            `  - [${r.status}] ${r.employeeName} | ${r.date} | ${r.amount} ${TOKEN_SYMBOL} | ${r.description} | id: ${r.id}`,
        ),
        ``,
        `Treasury Transfers (${txData.length}):`,
        ...txData.map(
          (t) =>
            `  - ${t.date} | ${t.amount} ${TOKEN_SYMBOL} | ${t.senderName} → ${t.recipientName} | ${t.memo}`,
        ),
      )
    } else {
      if (myInfo) {
        lines.push(
          `Your Name: ${myInfo.name}`,
          `Position: ${myInfo.position} | Department: ${myInfo.department}`,
          `Your Salary: ${myInfo.baseSalary} ${TOKEN_SYMBOL}`,
          `Your Wallet: ${myInfo.wallet}`,
        )
      }
      lines.push(
        ``,
        `Your Payroll History (${payData.length}):`,
        ...payData.map(
          (p) => `  - ${p.date} | ${p.amount} ${TOKEN_SYMBOL} | ${p.memo}`,
        ),
        ``,
        `Your Reimbursements (${reimbData.length}):`,
        ...reimbData.map(
          (r) =>
            `  - [${r.status}] ${r.date} | ${r.amount} ${TOKEN_SYMBOL} | ${r.description}`,
        ),
        ``,
        `Your Transfers (${txData.length}):`,
        ...txData.map(
          (t) =>
            `  - ${t.date} | ${t.amount} ${TOKEN_SYMBOL} | → ${t.recipientName} | ${t.memo}`,
        ),
      )
    }

    if (contactData.length > 0) {
      lines.push(
        ``,
        `Saved Contacts (${contactData.length}):`,
        ...contactData.map((c) => `  - ${c.name} | ${c.address}`),
      )
    }

    return {
      summary: lines.join('\n'),
      raw: {
        treasuryName: treasury.name,
        balance: isAdmin ? fmtToken(vaultBalance) : null,
        isAdmin,
        employeeCount: isAdmin ? employees.length : null,
        employees: isAdmin ? empData : myInfo ? [myInfo] : [],
        reimbursements: reimbData,
        payrolls: payData,
        transfers: txData,
        contacts: contactData,
      },
    }
  }, [
    publicKey,
    treasury,
    vaultBalance,
    isAdmin,
    employees,
    payrolls,
    reimbursements,
    transfers,
    contacts,
  ])
}
