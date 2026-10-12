import type { PublicKey } from '@solana/web3.js'

function pk(key: PublicKey | null | undefined) {
  return key?.toBase58() ?? null
}

export const queryKeys = {
  treasury: (wallet: PublicKey | null) => ['treasury', pk(wallet)] as const,

  employees: (treasuryPDA: PublicKey | null) =>
    ['employees', pk(treasuryPDA)] as const,

  payroll: (treasuryPDA: PublicKey | null, employee?: PublicKey) =>
    ['payroll', pk(treasuryPDA), pk(employee)] as const,

  reimbursements: (
    treasuryPDA: PublicKey | null,
    employee?: PublicKey,
    statusFilter?: number,
  ) =>
    [
      'reimbursements',
      pk(treasuryPDA),
      pk(employee),
      statusFilter ?? null,
    ] as const,

  transfers: (
    treasuryPDA: PublicKey | null,
    wallet?: PublicKey,
    isAdmin?: boolean,
  ) => ['transfers', pk(treasuryPDA), pk(wallet), isAdmin ?? false] as const,

  contacts: (owner: PublicKey | null) => ['contacts', pk(owner)] as const,
}
