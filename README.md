# Beam Finance

Solana on-chain corporate finance with an AI-powered assistant — treasury management, payroll, reimbursements, and internal transfers. All critical operations are recorded on-chain for full auditability. Manage your finances through natural language or traditional UI.

## Features

### Core Finance
- **Treasury Management** — Create and fund a company vault (SPL token), monitor balance and on-chain accounts
- **Employee Management** — Add/remove team members with position, department, and base salary
- **Payroll** — Pay employees individually or in a batch; salary + approved reimbursements are settled together
- **Reimbursements** — Employees submit requests, admins approve or reject; approved amounts are paid with the next salary run
- **Transfers** — Treasury-to-address transfers and employee P2P transfers
- **Transaction History** — Filterable ledger of all payroll, reimbursement, and transfer activity
- **Role-Based Views** — Wallet auto-detects admin vs employee; UI adapts accordingly

### AI Features
- **AI Financial Assistant** — Natural language chat interface (DeepSeek) to query data and execute on-chain operations with user confirmation
- **AI Agent Operations** — Pay salaries, transfer funds, submit/approve reimbursements, add/remove employees — all through conversation with wallet signing
- **Smart Reimbursement Review** — AI analyzes pending reimbursements for risk level based on amount, history, and employee context
- **Transaction Anomaly Detection** — AI flags unusual patterns like duplicate payments, outlier amounts, and suspicious activity on the dashboard
- **Role-Based AI Access Control** — AI respects user roles; employees can only see their own data, admins get full visibility

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16.4 with Instant Navigation, React 19, Tailwind CSS v4, shadcn/ui |
| Solana | Anchor 0.32.1 (Rust), @coral-xyz/anchor, @solana/web3.js |
| Wallet | @solana/connector (ConnectorKit) |
| AI | Vercel AI SDK v6, DeepSeek API, Streamdown, AI Elements |
| Data | @tanstack/react-query, @tanstack/react-table, recharts |
| Tooling | Turborepo, bun, Biome, TypeScript 5.9 |

## Project Structure

```
apps/web/                 Next.js frontend
  src/app/(app)/           App pages (dashboard, treasury, employees, payroll, ...)
  src/app/api/             API routes (chat, AI reimbursement review, anomaly detection)
  src/components/          Shared components (providers, data-table, ai-chat, ...)
  src/components/ai-elements/  AI Elements UI components (conversation, message, prompt-input, ...)
  src/hooks/               Data-fetching hooks (use-treasury, use-payroll, use-ai-context, use-agent-actions, ...)
  src/lib/                 Constants, PDA helpers, program utils, AI config

packages/anchor/           Solana Anchor program (Rust)
  programs/beam/src/
    instructions/          10 instruction handlers
    state/                 Account structs (Treasury, Employee, Payroll, Reimbursement, Transfer)

packages/ui/               Shared UI component library (@beam/ui)
packages/contracts/        Optional EVM Solidity contracts and Hardhat tests
packages/tsconfig/         Shared TypeScript configs
```

## Getting Started

### Prerequisites

- [bun](https://bun.sh) v1.4.0+
- [Rust](https://rustup.rs) + [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) v0.32.1

### Install & Run

```bash
bun install               # install all dependencies
bun run dev               # start Next.js dev server (via Turborepo)
```

### Anchor Program

```bash
cd packages/anchor
anchor build              # compile the Solana program
anchor test               # run integration tests against local validator
anchor deploy             # deploy to configured cluster
```

### EVM Contracts

The EVM frontend has been removed from this repository, but the deployable
`BeamFinance` contracts remain available under `packages/contracts`.

```bash
bun run --cwd packages/contracts build
bun run --cwd packages/contracts test
```

### Other Commands

```bash
bun run build             # production build (all packages + app)
bun run typecheck         # type-check everything
bun run check             # Biome lint + format (auto-fix)
```

## Adding UI Components

```bash
bunx shadcn@latest add <component> --cwd packages/ui
```

Components land in `packages/ui/src/components/` and are importable as `@beam/ui/components/<name>`.

## On-Chain Instructions

| Instruction | Role | Description |
|---|---|---|
| `create_treasury` | Admin | Create a new company treasury with SPL token vault |
| `add_employee` | Admin | Register an employee with wallet, salary, position |
| `remove_employee` | Admin | Remove an employee from the treasury |
| `pay_salary` | Admin | Pay an employee (base salary + pending reimbursements) |
| `submit_reimbursement` | Employee | Submit a reimbursement request |
| `approve_reimbursement` | Admin | Approve a reimbursement and add it to the employee's pending payout |
| `reject_reimbursement` | Admin | Reject a reimbursement request |
| `transfer_from_treasury` | Admin | Transfer funds from treasury to any address |
| `transfer_p2p` | Employee | Transfer between team members |
| `close_legacy_treasury` | Admin | Close and reclaim rent from a legacy treasury |

## Environment Variables

Copy `apps/web/.env.local.example` to `apps/web/.env.local` and configure:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_CLUSTER` | Cluster name: `localnet`, `devnet`, `testnet`, or `mainnet-beta` | `devnet` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Custom Solana RPC endpoint, recommended for devnet/mainnet | Cluster public RPC |
| `NEXT_PUBLIC_APP_URL` | Public URL used for metadata and canonical links | Vercel fallback |
| `NEXT_PUBLIC_EXPLORER_URL` | Block explorer base URL | `https://explorer.solana.com` |
| `NEXT_PUBLIC_ADMIN_WHITELIST` | Optional UI restriction for treasury creation; it does not replace the on-chain whitelist | Empty |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI features | — |

## License

MIT
