import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey(
  'EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn',
)

export const TREASURY_SEED = Buffer.from('treasury')
export const VAULT_SEED = Buffer.from('vault')
export const PAYROLL_SEED = Buffer.from('payroll')
export const REIMBURSEMENT_SEED = Buffer.from('reimbursement')
export const TRANSFER_SEED = Buffer.from('transfer')
export const EMPLOYEE_SEED = Buffer.from('employee')
export const CONTACT_SEED = Buffer.from('contact')

export const MAX_EMPLOYEES = 20

export const LAMPORTS_PER_SOL = 1_000_000_000

export const USDC_DEVNET_MINT = new PublicKey(
  'Ax2UXPZwThtchUcjdSEPKFiZHs8kPb4cjYbWoWZp63aJ',
)
export const TOKEN_DECIMALS = 6
export const TOKEN_SYMBOL = 'USDT'

export const ADMIN_WHITELIST: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_WHITELIST ?? ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function isWhitelistedAdmin(pubkey: PublicKey | null): boolean {
  if (!pubkey) return false
  if (ADMIN_WHITELIST.length === 0) return true
  return ADMIN_WHITELIST.includes(pubkey.toBase58())
}

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL?.trim() || 'https://explorer.solana.com'

export const CLUSTER =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim() || 'devnet'

const RPC_ENDPOINTS: Record<string, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
  localhost: 'http://localhost:8899',
}

export function resolveClusterUrl(
  url: string | undefined | null,
): string | null {
  if (!url) return null
  if (url.startsWith('http:') || url.startsWith('https:')) return url
  return RPC_ENDPOINTS[url] ?? null
}

export function getExplorerUrl(
  signature: string,
  type: 'tx' | 'address' = 'tx',
) {
  const cluster = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`
  return `${EXPLORER_URL}/${type}/${signature}${cluster}`
}
