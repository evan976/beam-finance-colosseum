'use client'

import type * as React from 'react'
import { cn } from '@beam/ui/lib/utils'
import {
  ArrowUpRight,
  Bot,
  DollarSign,
  Receipt,
  TrendingUp,
  Users,
  Vault,
} from 'lucide-react'
import type { LandingChain } from './landing-variants'

const mockRows: Record<
  LandingChain,
  Array<{
    type: string
    amount: string
    addr: string
    desc: string
    date: string
    color: string
  }>
> = {
  solana: [
    {
      type: 'Payroll',
      amount: '1,200.00',
      addr: '7xKr…9fGh',
      desc: 'March salary',
      date: 'Mar 15',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      type: 'Transfer',
      amount: '100.00',
      addr: 'DbYJ…VGd',
      desc: 'Equipment',
      date: 'Mar 14',
      color:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    },
    {
      type: 'Reimb.',
      amount: '50.00',
      addr: 'rMjd…XMh',
      desc: 'Software sub',
      date: 'Mar 13',
      color:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
  ],
  evm: [
    {
      type: 'Payroll',
      amount: '1,200.00',
      addr: '0x7a2c…d4f1',
      desc: 'March salary',
      date: 'Mar 15',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      type: 'Transfer',
      amount: '100.00',
      addr: '0x91be…3a09',
      desc: 'Equipment',
      date: 'Mar 14',
      color:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    },
    {
      type: 'Reimb.',
      amount: '50.00',
      addr: '0x4f88…e822',
      desc: 'Software sub',
      date: 'Mar 13',
      color:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
  ],
}

export function HeroImage({ chain = 'solana' }: { chain?: LandingChain }) {
  const rows = mockRows[chain] ?? mockRows.solana

  return (
    <div className="perspective-1000 relative mx-auto max-w-6xl">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl',
        )}
        style={{
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 50%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2 border-border/60 border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-2">
            <div className="size-3 rounded-full bg-[#ff5f57]" />
            <div className="size-3 rounded-full bg-[#febc2e]" />
            <div className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex items-center gap-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <span className="text-muted-foreground text-xs">
              beam.finance/dashboard
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="h-5 w-28 rounded bg-foreground/10" />
              <div className="mt-1.5 h-3 w-48 rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-md bg-primary/15" />
              <div className="h-8 w-28 rounded-md bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <MockStatCard
              icon={Vault}
              label="Treasury Balance"
              value="496,170.00"
              sub="+12 txns"
            />
            <MockStatCard
              icon={Users}
              label="Active Employees"
              value="4"
              sub="4/20 slots"
            />
            <MockStatCard
              icon={DollarSign}
              label="Monthly Burn"
              value="4,200.00"
              sub="This month"
            />
            <MockStatCard
              icon={Receipt}
              label="Pending Approvals"
              value="1"
              sub="Action needed"
            />
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                  <Bot className="size-3.5 text-foreground/60" />
                </div>
                <div>
                  <div className="h-3.5 w-32 rounded bg-foreground/10" />
                  <div className="mt-1 h-2.5 w-52 rounded bg-muted" />
                </div>
              </div>
              <div className="h-7 w-16 rounded-md bg-muted" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-3">
            <div className="col-span-3 rounded-lg border border-border/60 bg-card/50 p-4">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <div className="h-3.5 w-28 rounded bg-foreground/10" />
                  <div className="mt-1 h-2.5 w-16 rounded bg-muted" />
                </div>
                <TrendingUp className="size-3.5 text-muted-foreground/50" />
              </div>
              <div className="mt-4 flex items-end gap-[6px] px-1">
                {[
                  [35, 10, 8],
                  [42, 15, 12],
                  [38, 8, 15],
                  [50, 12, 10],
                  [45, 20, 8],
                  [55, 10, 14],
                ].map((group, gi) => (
                  <div key={gi} className="flex flex-1 items-end gap-[2px]">
                    <div
                      className="w-full rounded-t bg-(--color-chart-1)"
                      style={{ height: `${group[0]}%` }}
                    />
                    <div
                      className="w-full rounded-t bg-(--color-chart-2)"
                      style={{ height: `${group[1]}%` }}
                    />
                    <div
                      className="w-full rounded-t bg-(--color-chart-3)"
                      style={{ height: `${group[2]}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between px-1">
                {['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m) => (
                  <span
                    key={m}
                    className="flex-1 text-center text-[9px] text-muted-foreground/50"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-2 rounded-lg border border-border/60 bg-card/50 p-4">
              <div className="h-3.5 w-28 rounded bg-foreground/10" />
              <div className="mt-1 h-2.5 w-14 rounded bg-muted" />
              <div className="mt-4 flex justify-center">
                <div className="relative size-28">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="var(--color-chart-1)"
                      strokeWidth="14"
                      strokeDasharray="132 220"
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="var(--color-chart-2)"
                      strokeWidth="14"
                      strokeDasharray="44 220"
                      strokeDashoffset="-132"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="var(--color-chart-3)"
                      strokeWidth="14"
                      strokeDasharray="44 220"
                      strokeDashoffset="-176"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { label: 'Payroll', color: 'var(--color-chart-1)' },
                  { label: 'Reimbursements', color: 'var(--color-chart-2)' },
                  { label: 'Transfers', color: 'var(--color-chart-3)' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-2 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <div className="h-2.5 w-14 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-foreground/10" />
              <div className="h-6 w-16 rounded bg-muted" />
            </div>
            <div className="space-y-0">
              <div className="flex gap-4 border-border/40 border-b pb-2 text-[10px] text-muted-foreground/40">
                <span className="w-16">Type</span>
                <span className="w-20">Amount</span>
                <span className="flex-1">Counterparty</span>
                <span className="w-28">Description</span>
                <span className="w-12">Date</span>
              </div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-border/20 border-b py-2 last:border-0"
                >
                  <span
                    className={cn(
                      'w-16 rounded-full px-1.5 py-0.5 text-center font-medium text-[9px]',
                      row.color,
                    )}
                  >
                    {row.type}
                  </span>
                  <span className="w-20 font-mono text-[11px]">
                    {row.amount}
                  </span>
                  <span className="flex-1 font-mono text-[10px] text-muted-foreground">
                    {row.addr}
                  </span>
                  <span className="w-28 text-[10px] text-muted-foreground">
                    {row.desc}
                  </span>
                  <span className="w-12 text-[10px] text-muted-foreground">
                    {row.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -top-24 -left-24 -z-10 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 -z-10 size-96 rounded-full bg-primary/5 blur-3xl" />
    </div>
  )
}

function MockStatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <Icon className="size-3.5 text-muted-foreground/50" />
      </div>
      <div className="mt-1 font-bold text-lg tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center text-[10px] text-emerald-500 tabular-nums">
        <ArrowUpRight className="mr-0.5 size-2.5" />
        {sub}
      </div>
    </div>
  )
}
