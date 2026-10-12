# AGENTS.md

## Project Overview

Beam Finance is a Solana on-chain corporate finance system with an AI-powered assistant — treasury management, payroll, reimbursements, and internal transfers. All critical operations are recorded on-chain for auditability. Users can manage finances through natural language conversation or traditional UI.

- **Monorepo**: Turborepo with bun (v1.4.0) workspaces
- **Apps**: `apps/web` (Next.js 16.4, React 19, App Router)
- **Packages**: `packages/ui` (shadcn/ui component library), `packages/anchor` (Solana Anchor program), `packages/contracts` (optional EVM contracts), `packages/tsconfig` (shared TS configs)

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16.4 App Router, React 19, Tailwind CSS v4, shadcn/ui (base-nova style) |
| Solana | Anchor 0.32.1 (Rust), @coral-xyz/anchor, @solana/web3.js, @solana/connector (ConnectorKit) |
| AI | Vercel AI SDK v6 (`ai`, `@ai-sdk/deepseek`), DeepSeek API, Streamdown, AI Elements |
| Styling | Tailwind v4 via `@tailwindcss/postcss`, oklch CSS variables, `next-themes` for dark mode |
| Formatting | Biome (not ESLint/Prettier) — single quotes, no semicolons, 2-space indent |
| Package manager | bun — always use `bun` instead of npm/pnpm/yarn |
| TypeScript | 5.9.3, strict mode, `noUncheckedIndexedAccess` enabled |

## Commands

```bash
bun install          # install deps
bun run dev          # start all apps in dev mode (turbo)
bun run build        # build all packages/apps
bun run typecheck    # type-check all packages/apps
```

## Code Conventions

### File Naming

- Components: **kebab-case** (`alert-dialog.tsx`, `button-group.tsx`)
- Hooks: **kebab-case** with `use-` prefix (`use-mobile.ts`)
- Anchor instructions: **snake_case** Rust modules (`initialize.rs`, `pay_salary.rs`)

### Imports

- UI components: `import { Button } from '@beam/ui/components/button'`
- Utils: `import { cn } from '@beam/ui/lib/utils'`
- Hooks: `import { useMobile } from '@beam/ui/hooks/use-mobile'`
- Styles: `import '@beam/ui/globals.css'`
- App-internal (web): `import { ... } from '@/components/...'` (maps to `./src/*`)

Never use barrel exports or `index.ts` re-exports for UI components — import directly from the component file.

### Component Patterns

- Always use `import * as React from 'react'` for React imports
- Use `'use client'` directive only when the component needs client interactivity
- Build on Base UI primitives (`@base-ui/react/*`) for accessible low-level components
- Base UI uses `render` prop for polymorphism, not `asChild` — e.g. `<Button render={<Link href="/" />}>`
- Use `cva` (class-variance-authority) for component variants
- Use `cn()` (clsx + tailwind-merge) for conditional class merging
- Named exports only — no default exports for components

### Styling

- Tailwind v4 utility classes; no CSS modules or styled-components
- Design tokens via oklch CSS variables defined in `packages/ui/src/styles/globals.css`
- Dark mode via `.dark` class (managed by `next-themes`)
- Fonts: Geist Sans + Geist Mono (loaded via `next/font/local` in the app layout)
- Biome sorts Tailwind classes — use `className`, `cn`, `cva`, `twMerge`, or `clsx` for class attributes

### TypeScript

- Strict mode with `noUncheckedIndexedAccess` — always handle potential `undefined` from index access
- Module resolution: `NodeNext` for libraries, `Bundler` for Next.js app
- Prefer `interface` for object shapes that may be extended, `type` for unions/intersections

## Formatting (Biome)

This project uses **Biome** for linting and formatting. Do not add ESLint or Prettier configs.

- Single quotes, JSX double quotes
- Semicolons: `asNeeded` (omit when possible)
- Indent: 2 spaces
- Line width: 80
- Trailing commas in JS/TS: `all`
- Import organization: Node builtins → `react` → `next` (web) → everything else

## Project Structure

```
apps/
  web/                    # Next.js frontend
    src/
      app/
        (marketing)/      # Landing page (public, no sidebar)
        (app)/            # App pages (wallet-gated, sidebar layout)
          dashboard/
          treasury/
          employees/
          payroll/
          reimbursements/
          transfers/
          history/
      components/
        providers/        # Solana + Anchor providers
        ai-elements/      # AI Elements UI components
        ai-chat.tsx       # Global AI chat sidebar
      hooks/              # Data-fetching hooks (use-treasury, use-payroll, use-ai-context, use-agent-actions, etc.)
      lib/                # Constants, PDA helpers, program utils, AI config
packages/
  anchor/                 # Solana Anchor program (Rust)
    programs/beam/src/
      instructions/       # 9 instruction handlers
      state/              # Account structs (Treasury, Payroll, Reimbursement, Transfer)
      constants.rs
      error.rs
      lib.rs
    tests/                # Integration tests
  ui/                     # Shared UI component library (@beam/ui)
    src/
      components/         # shadcn/ui components
      hooks/              # Shared hooks
      lib/                # Utilities (cn, etc.)
      styles/             # globals.css
  contracts/              # Optional EVM contracts and Hardhat tests
  tsconfig/               # Shared TypeScript configs
```

## Anchor / Solana Guidelines

- Program ID: `EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn`
- Default cluster: localnet (configurable in `Anchor.toml`)
- Wallet: `~/.config/solana/id.json`
- Each instruction gets its own file in `programs/beam/src/instructions/`
- Account structs live in `programs/beam/src/state/`
- Re-export all instruction modules from `instructions/mod.rs` and all state from `state/mod.rs`

## AI Integration

- **Model**: DeepSeek via `@ai-sdk/deepseek`, configured in `apps/web/src/lib/ai.ts`
- **Chat API**: `apps/web/src/app/api/chat/route.ts` — streaming with tool calling (5 tools), role-based system prompt
- **AI Chat UI**: `apps/web/src/components/ai-chat.tsx` — floating sidebar with AI Elements components
- **Context**: `apps/web/src/hooks/use-ai-context.ts` — role-filtered on-chain data passed to AI
- **Agent Actions**: `apps/web/src/hooks/use-agent-actions.ts` — executes on-chain transactions from AI suggestions
- **Additional AI routes**: `apps/web/src/app/api/ai/reimbursement-review/` (risk assessment), `apps/web/src/app/api/ai/anomaly-detect/` (anomaly flagging)
- **Env var**: `DEEPSEEK_API_KEY` in `apps/web/.env.local`

### AI Agent Supported Actions
`add_employee`, `remove_employee`, `pay_salary`, `transfer_from_treasury`, `transfer_p2p`, `submit_reimbursement`, `approve_reimbursement`, `reject_reimbursement`

## User Roles (Domain Context)

Two roles exist in the system — the frontend auto-detects which based on connected wallet:

- **Admin (Boss)**: Creates treasury, manages employees, approves reimbursements, pays salaries, executes transfers. AI shows full treasury data.
- **Employee**: Submits reimbursement requests, views personal payroll/reimbursement history, P2P transfers to teammates. AI only shows their own data.

## Adding UI Components

Use the shadcn CLI scoped to the ui package:

```bash
bunx shadcn@latest add <component> --cwd packages/ui
```

Components land in `packages/ui/src/components/` and are importable as `@beam/ui/components/<name>`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
