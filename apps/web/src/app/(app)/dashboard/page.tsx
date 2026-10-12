'use client'

import * as React from 'react'
import { Button } from '@beam/ui/components/button'
import { Card, CardContent } from '@beam/ui/components/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@beam/ui/components/chart'
import { DataTable } from '@beam/ui/components/data-table'
import { Spinner } from '@beam/ui/components/spinner'
import { StatCard } from '@beam/ui/components/stat-card'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bot,
  DollarSign,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Users,
  Vault,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts'
import { Address } from '@/components/address'
import { CreateTreasuryPrompt } from '@/components/create-treasury-prompt'
import { StatusBadge, TypeBadge } from '@/components/status-badge'
import { TokenAmount } from '@/components/token-amount'
import { useAiContext } from '@/hooks/use-ai-context'
import {
  type UnifiedTransaction,
  useTransactions,
} from '@/hooks/use-transactions'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from '@/lib/constants'

function formatTokenValue(raw: number | string): string {
  const value = Number(raw) / 10 ** TOKEN_DECIMALS
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function payrollBaseAmount(tx: UnifiedTransaction): number {
  const baseSalary = tx.baseSalary ?? 0
  const reimbursementAmount = tx.reimbursementAmount ?? 0
  return baseSalary === 0 && reimbursementAmount === 0 ? tx.amount : baseSalary
}

function payrollReimbursementAmount(tx: UnifiedTransaction): number {
  return tx.reimbursementAmount ?? 0
}

function getMonthlyData(transactions: UnifiedTransaction[]): {
  month: string
  payroll: number
  reimbursement: number
  transfer: number
}[] {
  const now = new Date()
  const months: {
    month: string
    payroll: number
    reimbursement: number
    transfer: number
  }[] = []
  const monthIndex = new Map<string, number>()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthIndex.set(key, months.length)
    months.push({
      month: format(d, 'MMM'),
      payroll: 0,
      reimbursement: 0,
      transfer: 0,
    })
  }

  for (const tx of transactions) {
    const txDate = new Date(tx.timestamp * 1000)
    const key = `${txDate.getFullYear()}-${txDate.getMonth()}`
    const idx = monthIndex.get(key)
    if (idx === undefined) continue

    if (tx.type === 'payroll') {
      months[idx]!.payroll += payrollBaseAmount(tx) / 10 ** TOKEN_DECIMALS
      months[idx]!.reimbursement +=
        payrollReimbursementAmount(tx) / 10 ** TOKEN_DECIMALS
      continue
    }
    if (tx.type === 'transfer') {
      months[idx]!.transfer += tx.amount / 10 ** TOKEN_DECIMALS
    }
  }

  return months
}

function getBreakdownData(transactions: UnifiedTransaction[]) {
  const totals = { payroll: 0, reimbursement: 0, transfer: 0 }

  for (const tx of transactions) {
    if (tx.type === 'payroll') {
      totals.payroll += payrollBaseAmount(tx) / 10 ** TOKEN_DECIMALS
      totals.reimbursement +=
        payrollReimbursementAmount(tx) / 10 ** TOKEN_DECIMALS
      continue
    }
    if (tx.type === 'transfer') {
      totals.transfer += tx.amount / 10 ** TOKEN_DECIMALS
    }
  }

  return [
    { name: 'Payroll', value: totals.payroll, fill: 'var(--color-chart-1)' },
    {
      name: 'Reimbursements',
      value: totals.reimbursement,
      fill: 'var(--color-chart-2)',
    },
    {
      name: 'Transfers',
      value: totals.transfer,
      fill: 'var(--color-chart-3)',
    },
  ].filter((d) => d.value > 0)
}

const barChartConfig = {
  payroll: { label: 'Payroll', color: 'var(--color-chart-1)' },
  reimbursement: { label: 'Reimbursements', color: 'var(--color-chart-2)' },
  transfer: { label: 'Transfers', color: 'var(--color-chart-3)' },
} satisfies ChartConfig

const pieChartConfig = {
  value: { label: 'Amount' },
  payroll: { label: 'Payroll', color: 'var(--color-chart-1)' },
  reimbursement: { label: 'Reimbursements', color: 'var(--color-chart-2)' },
  transfer: { label: 'Transfers', color: 'var(--color-chart-3)' },
} satisfies ChartConfig

const txColumns = [
  {
    header: 'Type',
    cell: (row: UnifiedTransaction) => <TypeBadge type={row.type} />,
  },
  {
    header: 'Amount',
    cell: (row: UnifiedTransaction) => (
      <TokenAmount amount={row.amount} className="font-mono tabular-nums" />
    ),
  },
  {
    header: 'Counterparty',
    cell: (row: UnifiedTransaction) => (
      <Address address={row.counterparty.toBase58()} />
    ),
  },
  {
    header: 'Description',
    cell: (row: UnifiedTransaction) => (
      <span className="max-w-56 truncate text-muted-foreground">
        {row.description}
      </span>
    ),
  },
  {
    header: 'Date',
    cell: (row: UnifiedTransaction) =>
      format(new Date(row.timestamp * 1000), 'MMM d, yyyy'),
  },
]

interface Anomaly {
  id: string
  type: string
  severity: 'warning' | 'critical'
  reason: string
  amount: string
}

function AnomalyAlerts() {
  const aiContext = useAiContext()
  const [anomalies, setAnomalies] = React.useState<Anomaly[]>([])
  const [summary, setSummary] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [hasRun, setHasRun] = React.useState(false)

  const runDetection = async () => {
    if (!aiContext) return
    setLoading(true)
    try {
      const transactions = [
        ...aiContext.raw.payrolls.map((p) => ({ ...p, type: 'payroll' })),
        ...aiContext.raw.reimbursements.map((r) => ({
          ...r,
          type: 'reimbursement',
        })),
        ...aiContext.raw.transfers.map((t) => ({ ...t, type: 'transfer' })),
      ]
      const res = await fetch('/api/ai/anomaly-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          context: aiContext.summary,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAnomalies(data.anomalies ?? [])
      setSummary(data.summary ?? null)
      setHasRun(true)
    } catch (err) {
      console.error('Anomaly detection failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!aiContext) return null

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-1 size-4 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-base">AI Anomaly Detection</h3>
              <p className="text-muted-foreground text-xs">
                {summary ?? 'Scan transactions for unusual patterns'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runDetection}
            disabled={loading}
          >
            {loading ? <Spinner /> : <Bot />}
            {loading ? 'Scanning...' : hasRun ? 'Re-scan' : 'Scan'}
          </Button>
        </div>

        {hasRun && anomalies.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
            <span className="text-emerald-600 text-sm dark:text-emerald-400">
              No anomalies detected. All transactions look normal.
            </span>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div
                key={`${a.id}-${i}`}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  a.severity === 'critical'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950'
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 size-4 shrink-0 ${
                    a.severity === 'critical'
                      ? 'text-destructive'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">
                      {a.type}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      {a.amount} {TOKEN_SYMBOL}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {a.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { publicKey } = useWalletCompat()
  const { treasury, treasuryPDA, vaultBalance, isAdmin, refetch } =
    useTreasury()

  const { transactions } = useTransactions(
    treasuryPDA,
    publicKey ?? undefined,
    { isAdmin },
  )

  const monthlyData = React.useMemo(
    () => getMonthlyData(transactions),
    [transactions],
  )
  const breakdownData = React.useMemo(
    () => getBreakdownData(transactions),
    [transactions],
  )
  const recentTxs = React.useMemo(
    () => transactions.slice(0, 8),
    [transactions],
  )

  if (!treasury) {
    return <CreateTreasuryPrompt onCreated={refetch} />
  }

  const tokenBalance = formatTokenValue(vaultBalance)

  if (isAdmin) {
    const now = new Date()
    let monthlyBurn = 0
    let pendingReimbCount = 0
    for (const tx of transactions) {
      const d = new Date(tx.timestamp * 1000)
      const isCurrentMonth =
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (isCurrentMonth && tx.type !== 'reimbursement') {
        monthlyBurn += tx.amount
      }
      if (tx.type === 'reimbursement' && tx.status === 0) {
        pendingReimbCount++
      }
    }

    return (
      <AdminDashboard
        treasury={treasury}
        tokenBalance={tokenBalance}
        transactions={transactions}
        recentTxs={recentTxs}
        monthlyData={monthlyData}
        breakdownData={breakdownData}
        pendingReimbursements={pendingReimbCount}
        monthlyBurn={monthlyBurn}
      />
    )
  }

  let myTotalEarned = 0
  let myPendingReimb = 0
  let myTransferCount = 0
  for (const tx of transactions) {
    if (tx.type === 'payroll') myTotalEarned += tx.amount
    else if (tx.type === 'reimbursement' && tx.status === 0) myPendingReimb++
    else if (tx.type === 'transfer') myTransferCount++
  }

  return (
    <EmployeeDashboard
      treasuryName={treasury.name}
      totalEarned={myTotalEarned}
      pendingReimbursements={myPendingReimb}
      transferCount={myTransferCount}
      transactions={transactions}
      recentTxs={recentTxs}
      monthlyData={monthlyData}
      breakdownData={breakdownData}
    />
  )
}

interface AdminDashboardProps {
  treasury: { name: string; employees: any[] }
  tokenBalance: string
  transactions: UnifiedTransaction[]
  recentTxs: UnifiedTransaction[]
  monthlyData: ReturnType<typeof getMonthlyData>
  breakdownData: ReturnType<typeof getBreakdownData>
  pendingReimbursements: number
  monthlyBurn: number
}

function AdminDashboard({
  treasury,
  tokenBalance,
  transactions,
  recentTxs,
  monthlyData,
  breakdownData,
  pendingReimbursements,
  monthlyBurn,
}: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          {treasury.name}
        </h1>
        <p className="text-pretty text-muted-foreground text-sm">
          Treasury overview and analytics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Vault}
          label="Treasury Balance"
          value={`${tokenBalance} ${TOKEN_SYMBOL}`}
          animated
          trend={{
            value: `${transactions.length} txns`,
            label: 'total recorded',
            direction: 'neutral',
          }}
        />
        <StatCard
          icon={Users}
          label="Active Employees"
          value={treasury.employees.length}
          hideInPrivacy={false}
          animated
          trend={{
            value: `${treasury.employees.length}/20`,
            label: 'slots used',
            direction: treasury.employees.length > 0 ? 'up' : 'neutral',
          }}
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Burn"
          value={`${formatTokenValue(monthlyBurn)} ${TOKEN_SYMBOL}`}
          animated
          trend={{
            value: 'This month',
            label: 'spending',
            direction: monthlyBurn > 0 ? 'up' : 'neutral',
          }}
        />
        <StatCard
          icon={Receipt}
          label="Pending Approvals"
          value={pendingReimbursements}
          hideInPrivacy={false}
          animated
          trend={{
            value: pendingReimbursements > 0 ? 'Action needed' : 'All clear',
            label: '',
            direction: pendingReimbursements > 0 ? 'up' : 'neutral',
          }}
        />
      </div>

      <AnomalyAlerts />

      <div className="flex gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/payroll" />}
          size="sm"
        >
          Pay Salary <ArrowRight className="ml-1" />
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/reimbursements" />}
          variant="outline"
          size="sm"
        >
          Review Reimbursements <ArrowRight className="ml-1" />
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/transfers" />}
          variant="outline"
          size="sm"
        >
          Transfers <ArrowRight className="ml-1" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Transaction Volume</h3>
                <p className="text-muted-foreground text-xs">Last 6 months</p>
              </div>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>
            <ChartContainer
              config={barChartConfig}
              className="aspect-auto h-64 w-full"
            >
              <BarChart accessibilityLayer data={monthlyData} barGap={4}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="payroll" fill="var(--color-chart-1)" radius={4} />
                <Bar
                  dataKey="reimbursement"
                  fill="var(--color-chart-2)"
                  radius={4}
                />
                <Bar
                  dataKey="transfer"
                  fill="var(--color-chart-3)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-base">Spending Breakdown</h3>
              <p className="text-muted-foreground text-xs">By category</p>
            </div>
            {breakdownData.length > 0 ? (
              <>
                <ChartContainer
                  config={pieChartConfig}
                  className="aspect-square h-48 w-full"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="var(--color-card)"
                    />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-1">
                  {breakdownData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-muted-foreground">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-medium font-mono tabular-nums">
                        {item.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {TOKEN_SYMBOL}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  No transactions yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Recent Activity</h3>
              <p className="text-muted-foreground text-xs">
                Latest transactions across the organization
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/history" />}
              variant="ghost"
              size="sm"
            >
              View All <ArrowRight className="ml-1" />
            </Button>
          </div>
          <DataTable
            columns={txColumns}
            data={recentTxs}
            emptyMessage="No transactions yet. Start by funding your treasury and paying salaries."
          />
        </CardContent>
      </Card>
    </div>
  )
}

interface EmployeeDashboardProps {
  treasuryName: string
  totalEarned: number
  pendingReimbursements: number
  transferCount: number
  transactions: UnifiedTransaction[]
  recentTxs: UnifiedTransaction[]
  monthlyData: ReturnType<typeof getMonthlyData>
  breakdownData: ReturnType<typeof getBreakdownData>
}

function EmployeeDashboard({
  treasuryName,
  totalEarned,
  pendingReimbursements,
  transferCount,
  transactions,
  recentTxs,
  monthlyData,
  breakdownData,
}: EmployeeDashboardProps) {
  const currentMonthEarned = transactions
    .filter((tx) => {
      if (tx.type !== 'payroll') return false
      const d = new Date(tx.timestamp * 1000)
      const now = new Date()
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      )
    })
    .reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          My Dashboard
        </h1>
        <p className="text-pretty text-muted-foreground text-sm">
          {treasuryName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Total Earned"
          value={`${formatTokenValue(totalEarned)} ${TOKEN_SYMBOL}`}
          animated
          trend={{
            value: `${formatTokenValue(currentMonthEarned)} ${TOKEN_SYMBOL}`,
            label: 'this month',
            direction: currentMonthEarned > 0 ? 'up' : 'neutral',
          }}
        />
        <StatCard
          icon={Receipt}
          label="Pending Reimbursements"
          value={pendingReimbursements}
          hideInPrivacy={false}
          animated
          trend={{
            value:
              pendingReimbursements > 0 ? 'Awaiting approval' : 'None pending',
            label: '',
            direction: 'neutral',
          }}
        />
        <StatCard
          icon={ArrowUpDown}
          label="My Transfers"
          value={transferCount}
          hideInPrivacy={false}
          animated
          trend={{
            value: `${transactions.length}`,
            label: 'total activity',
            direction: 'neutral',
          }}
        />
      </div>

      <div className="flex gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/reimbursements" />}
          size="sm"
        >
          Submit Reimbursement <ArrowRight className="ml-1" />
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/transfers" />}
          variant="outline"
          size="sm"
        >
          Send Transfer <ArrowRight className="ml-1" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">My Activity</h3>
                <p className="text-muted-foreground text-xs">Last 6 months</p>
              </div>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>
            <ChartContainer
              config={barChartConfig}
              className="aspect-auto h-64 w-full"
            >
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="payroll" fill="var(--color-chart-1)" radius={4} />
                <Bar
                  dataKey="reimbursement"
                  fill="var(--color-chart-2)"
                  radius={4}
                />
                <Bar
                  dataKey="transfer"
                  fill="var(--color-chart-3)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-base">Income Breakdown</h3>
              <p className="text-muted-foreground text-xs">By type</p>
            </div>
            {breakdownData.length > 0 ? (
              <>
                <ChartContainer
                  config={pieChartConfig}
                  className="aspect-square h-48 w-full"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="var(--color-card)"
                    />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-1">
                  {breakdownData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-muted-foreground">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-medium font-mono tabular-nums">
                        {item.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {TOKEN_SYMBOL}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-muted-foreground text-sm">No activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Recent Activity</h3>
              <p className="text-muted-foreground text-xs">
                Your latest transactions
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/history" />}
              variant="ghost"
              size="sm"
            >
              View All <ArrowRight className="ml-1" />
            </Button>
          </div>
          <DataTable
            columns={[
              ...txColumns,
              {
                header: 'Status',
                cell: (row: UnifiedTransaction) => (
                  <StatusBadge
                    status={row.status !== undefined ? row.status : 'completed'}
                  />
                ),
              },
            ]}
            data={recentTxs}
            emptyMessage="No transactions yet."
          />
        </CardContent>
      </Card>
    </div>
  )
}
