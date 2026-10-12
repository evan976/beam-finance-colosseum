# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Beam Finance — Solana on-chain corporate finance with AI assistant (treasury, payroll, reimbursements, transfers). Turborepo monorepo with bun workspaces.

## Commands

```bash
bun install                # install deps (always bun, never npm/pnpm/yarn)
bun dev                    # start Next.js dev server via Turborepo
bun build                  # production build all packages + app
bun typecheck              # type-check all packages
bun check                  # Biome lint + format with auto-fix
bun lint                   # Biome lint only (no auto-fix)
bun format                 # Biome format with auto-fix

# Anchor program (from packages/anchor/)
anchor build               # compile Solana program
anchor test                # integration tests against local validator
anchor deploy              # deploy to configured cluster

# Add shadcn component
bunx shadcn@latest add <component> --cwd packages/ui
```

## Architecture

### Monorepo Layout

- **`apps/web`** — Next.js 16 App Router frontend (React 19, Tailwind v4, shadcn/ui)
- **`packages/ui`** — Shared component library (`@beam/ui`), shadcn/ui base-nova style
- **`packages/anchor`** — Solana Anchor program (Rust) + TypeScript integration tests
- **`packages/tsconfig`** — Shared TS configs (`base.json`, `nextjs.json`, `react-library.json`)

### Next.js Route Groups

- `(marketing)/` — Public landing page, no sidebar, no wallet required
- `(app)/` — Wallet-gated app pages with sidebar layout. Pages: dashboard, treasury, employees, payroll, reimbursements, transfers, history

### Provider Chain (root layout)

`ThemeProvider > SolanaProvider > AnchorProvider > QueryProvider > TooltipProvider`

- `SolanaProvider` — `@solana/connector/react` (ConnectorKit) for wallet connection
- `AnchorProvider` — Wraps `@coral-xyz/anchor` AnchorProvider, exposed via `useAnchorProvider()` context hook
- `QueryProvider` — TanStack React Query

### Solana Program Integration

- IDL is loaded from `apps/web/src/lib/idl.json` and snake_case names are converted to camelCase at runtime in `program.ts`
- Type definitions in `apps/web/src/lib/beam.ts` (generated Anchor types)
- PDA derivation helpers in `apps/web/src/lib/pda.ts`
- Query key factory in `apps/web/src/lib/query-keys.ts`
- Data-fetching hooks (`use-treasury`, `use-employees`, `use-payroll`, `use-reimbursements`, `use-transfers`) use React Query and call Anchor program accounts
- Transaction signing via `signAndSend()` in `apps/web/src/lib/send-tx.ts`
- Program ID: `EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn`

### Anchor Program Structure (packages/anchor/programs/beam/src/)

- `lib.rs` — Program entry, declares all instructions
- `instructions/` — One file per instruction (10 total), each exports a context struct + handler
- `state/mod.rs` — All account structs: Treasury, Employee, Payroll, Reimbursement, Transfer
- `constants.rs`, `error.rs` — Shared constants and error codes

### AI Integration

- **AI model**: DeepSeek (`@ai-sdk/deepseek`) via Vercel AI SDK v6 (`ai`)
- **AI config**: `apps/web/src/lib/ai.ts` — DeepSeek provider instance
- **Chat API**: `apps/web/src/app/api/chat/route.ts` — streaming chat with 5 tools (treasury summary, pending reimbursements, recent transactions, employee details, suggest_action) and role-based system prompt
- **AI chat UI**: `apps/web/src/components/ai-chat.tsx` — global floating sidebar using AI Elements components
- **AI Elements**: `apps/web/src/components/ai-elements/` — Conversation, Message, PromptInput, Shimmer, Suggestion components
- **Context hook**: `apps/web/src/hooks/use-ai-context.ts` — aggregates on-chain data with role-based filtering (employees only see their own data)
- **Agent actions**: `apps/web/src/hooks/use-agent-actions.ts` — executes on-chain transactions from AI suggestions (add/remove employee, pay salary, transfers, submit/approve/reject reimbursement)
- **Reimbursement review**: `apps/web/src/app/api/ai/reimbursement-review/route.ts` — AI risk assessment for pending reimbursements
- **Anomaly detection**: `apps/web/src/app/api/ai/anomaly-detect/route.ts` — transaction anomaly flagging
- **Markdown rendering**: `streamdown` with `@streamdown/code`, `@streamdown/cjk`, `@streamdown/math`, `@streamdown/mermaid` plugins

### User Roles

Two roles auto-detected by connected wallet:
- **Admin** — Creates treasury, manages employees, approves reimbursements, pays salaries, executes transfers. AI can see all treasury data.
- **Employee** — Submits reimbursements, views personal history, P2P transfers. AI can only see their own data (salary, reimbursements, transfers).

## Code Conventions

### Formatting (Biome — not ESLint/Prettier)

- Single quotes, JSX double quotes, semicolons `asNeeded`, 2-space indent, line width 80, trailing commas `all`

### TypeScript

- Strict mode with `noUncheckedIndexedAccess` — always handle potential `undefined` from index access
- Module resolution: `NodeNext` for libraries, `Bundler` for Next.js app

### Imports

```ts
// UI components — import directly, no barrel exports
import { Button } from '@beam/ui/components/button'
import { cn } from '@beam/ui/lib/utils'
import { useMobile } from '@beam/ui/hooks/use-mobile'
import '@beam/ui/globals.css'

// App-internal (web) — @/ maps to ./src/*
import { ... } from '@/components/...'
import { ... } from '@/hooks/...'
import { ... } from '@/lib/...'
```

### Component Patterns

- `import * as React from 'react'` for React imports
- `'use client'` only when the component needs client interactivity
- Named exports only — no default exports for components
- `cva` for component variants, `cn()` for conditional class merging
- Tailwind v4 utility classes; design tokens via oklch CSS variables in `packages/ui/src/styles/globals.css`
- Dark mode via `.dark` class (`next-themes`)

### File Naming

- Components/hooks: kebab-case (`alert-dialog.tsx`, `use-mobile.ts`)
- Anchor instructions: snake_case Rust modules (`pay_salary.rs`)
