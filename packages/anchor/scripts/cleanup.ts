/**
 * Full reset: close ALL Beam program accounts on-chain.
 * Removes employees, closes records (payroll/reimbursement/transfer),
 * drains vault tokens, and closes the treasury.
 *
 * Usage (from packages/anchor): bun run cleanup [cluster]
 *   cluster: devnet (default) | localnet
 *
 * Env override:  SOLANA_RPC_URL=<url>  to use a custom RPC (e.g. Helius)
 */
import * as fs from 'node:fs'
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor'
import type { Wallet } from '@coral-xyz/anchor/dist/cjs/provider'
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'

const CLUSTERS: Record<string, string> = {
  localnet: 'http://localhost:8899',
  devnet: 'https://api.devnet.solana.com',
}

const PROGRAM_ID = new PublicKey('EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn')

const TREASURY_SEED = Buffer.from('treasury')
const VAULT_SEED = Buffer.from('vault')
const EMPLOYEE_SEED = Buffer.from('employee')

const cluster = process.argv[2] ?? 'devnet'
const rpcUrl =
  process.env.SOLANA_RPC_URL ?? CLUSTERS[cluster] ?? CLUSTERS.devnet!

const walletPath =
  cluster === 'devnet'
    ? `${process.env.HOME}/.config/solana/devnet-wallet.json`
    : `${process.env.HOME}/.config/solana/id.json`

const payer = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))),
)
const connection = new Connection(rpcUrl, 'confirmed')

function loadProgram() {
  const idlPath = `${process.cwd()}/apps/web/src/lib/idl.json`
  const rawIdl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))

  const wallet: Wallet = {
    publicKey: payer.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
    payer,
  }

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
  setProvider(provider)

  return new Program(rawIdl, provider) as any
}

async function sendAndConfirm(methodBuilder: any) {
  const tx = await methodBuilder.transaction()
  tx.feePayer = payer.publicKey
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.sign(payer)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}

async function sendRawTx(tx: Transaction) {
  tx.feePayer = payer.publicKey
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.sign(payer)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}

const IDL_ACCOUNT = new PublicKey(
  '7Pfx9h5DvN9Ujt2MWTpdMD4bTsLp1Kd9HHUhNAwXD4cP',
)

async function main() {
  console.log('=== Beam Full Reset ===')
  console.log(`  Cluster:  ${cluster} (${rpcUrl})`)
  console.log(`  Admin:    ${payer.publicKey.toBase58()}`)
  console.log('')

  const program = loadProgram()
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [TREASURY_SEED, payer.publicKey.toBuffer()],
    PROGRAM_ID,
  )
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, treasuryPda.toBuffer()],
    PROGRAM_ID,
  )
  const treasuryInfo = await connection.getAccountInfo(treasuryPda)
  if (!treasuryInfo) {
    console.log('No treasury found. Checking for orphaned accounts...')
    const remaining = await connection.getProgramAccounts(PROGRAM_ID)
    const nonIdl = remaining.filter(({ pubkey }) => !pubkey.equals(IDL_ACCOUNT))
    if (nonIdl.length === 0) {
      console.log('Already clean. Nothing to do.')
    } else {
      console.log(`${nonIdl.length} orphaned account(s) found.`)
    }
    return
  }

  // Step 1: Remove all employees
  let treasury: { employees: PublicKey[]; tokenMint: PublicKey }
  try {
    treasury = await program.account.treasury.fetch(treasuryPda)
  } catch {
    console.log(
      'Cannot deserialize treasury. Try close_legacy_treasury manually.',
    )
    return
  }

  const employees: PublicKey[] = treasury.employees ?? []
  if (employees.length > 0) {
    console.log(`[1/3] Removing ${employees.length} employee(s)...`)
    for (const empWallet of employees) {
      const [employeePda] = PublicKey.findProgramAddressSync(
        [EMPLOYEE_SEED, treasuryPda.toBuffer(), empWallet.toBuffer()],
        PROGRAM_ID,
      )
      try {
        const sig = await sendAndConfirm(
          program.methods.removeEmployee(empWallet).accountsStrict({
            admin: payer.publicKey,
            treasury: treasuryPda,
            employeeInfo: employeePda,
          }),
        )
        console.log(
          `    ok ${empWallet.toBase58().slice(0, 12)}... : ${sig.slice(0, 24)}...`,
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(
          `    skip ${empWallet.toBase58().slice(0, 12)}...: ${msg.slice(0, 60)}`,
        )
      }
    }
  } else {
    console.log('[1/3] No employees to remove.')
  }

  // Step 2: Close all record accounts (payroll, reimbursement, transfer)
  // Skip treasury, vault, and IDL accounts
  console.log('[2/3] Closing record accounts...')
  const allAccounts = await connection.getProgramAccounts(PROGRAM_ID)
  const skipSet = new Set([
    treasuryPda.toBase58(),
    vaultPda.toBase58(),
    IDL_ACCOUNT.toBase58(),
  ])
  const recordAccounts = allAccounts.filter(
    ({ pubkey }) => !skipSet.has(pubkey.toBase58()),
  )

  if (recordAccounts.length > 0) {
    console.log(`    Found ${recordAccounts.length} record(s) to close.`)
    for (const { pubkey } of recordAccounts) {
      try {
        const sig = await sendAndConfirm(
          program.methods.closeRecord().accountsStrict({
            admin: payer.publicKey,
            treasury: treasuryPda,
            record: pubkey,
          }),
        )
        console.log(
          `    ok ${pubkey.toBase58().slice(0, 16)}... : ${sig.slice(0, 24)}...`,
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(
          `    skip ${pubkey.toBase58().slice(0, 16)}...: ${msg.slice(0, 60)}`,
        )
      }
    }
  } else {
    console.log('    No records to close.')
  }

  // Step 3: Close treasury (drains vault tokens + closes vault + closes treasury)
  console.log('[3/3] Closing treasury + vault...')

  // Ensure admin ATA exists for receiving drained tokens
  const adminAta = getAssociatedTokenAddressSync(
    treasury.tokenMint,
    payer.publicKey,
  )
  const ataInfo = await connection.getAccountInfo(adminAta)
  if (!ataInfo) {
    console.log('    Creating admin token account...')
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        adminAta,
        payer.publicKey,
        treasury.tokenMint,
      ),
    )
    await sendRawTx(tx)
  }

  try {
    const sig = await sendAndConfirm(
      program.methods.closeTreasury().accountsStrict({
        admin: payer.publicKey,
        treasury: treasuryPda,
        vault: vaultPda,
        adminTokenAccount: adminAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      }),
    )
    console.log(`    ok Treasury + vault closed: ${sig.slice(0, 24)}...`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`    Treasury close failed: ${msg.slice(0, 100)}`)
  }

  // Verify
  const remaining = await connection.getProgramAccounts(PROGRAM_ID)
  const nonIdl = remaining.filter(({ pubkey }) => !pubkey.equals(IDL_ACCOUNT))
  console.log('')
  if (nonIdl.length === 0) {
    console.log('All accounts closed. Clean slate!')
  } else {
    console.log(`${nonIdl.length} account(s) still remain:`)
    for (const { pubkey, account } of nonIdl) {
      console.log(
        `  ${pubkey.toBase58()} (${account.data.length}B, ${(account.lamports / 1e9).toFixed(4)} SOL)`,
      )
    }
  }

  console.log('')
  console.log('Done! You can now create a fresh treasury from the app.')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
