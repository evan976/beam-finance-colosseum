/**
 * Create a new SPL token mint for local/devnet testing.
 * Usage (from packages/anchor): bun run create-token [cluster]
 *   cluster: localnet (default) | devnet
 */
import * as fs from 'node:fs'
import {
  createInitializeMint2Instruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'

const CLUSTERS: Record<string, string> = {
  localnet: 'http://localhost:8899',
  devnet: 'https://api.devnet.solana.com',
}

const cluster = process.argv[2] ?? 'devnet'
const rpcUrl = process.env.SOLANA_RPC_URL ?? CLUSTERS[cluster]
if (!rpcUrl) {
  console.error(`Unknown cluster: ${cluster}`)
  process.exit(1)
}

const walletPath =
  process.env.SOLANA_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`

const payer = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))),
)

const connection = new Connection(rpcUrl, 'confirmed')
const mintKeypair = Keypair.generate()
const decimals = 6

async function main() {
  console.log('=== Create SPL Token Mint ===')
  console.log(`  Cluster:   ${cluster} (${rpcUrl})`)
  console.log(`  Payer:     ${payer.publicKey.toBase58()}`)
  console.log(`  Decimals:  ${decimals}`)
  console.log('')

  const balance = await connection.getBalance(payer.publicKey)
  if (balance === 0) {
    console.log('Payer has no SOL, requesting airdrop...')
    const sig = await connection.requestAirdrop(payer.publicKey, 2e9)
    await connection.confirmTransaction(sig, 'confirmed')
  }

  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mintKeypair.publicKey,
      decimals,
      payer.publicKey,
      payer.publicKey,
    ),
  )

  tx.feePayer = payer.publicKey
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.sign(payer, mintKeypair)

  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(sig, 'confirmed')

  console.log('Token mint created!')
  console.log(`  Mint:      ${mintKeypair.publicKey.toBase58()}`)
  console.log(`  Authority: ${payer.publicKey.toBase58()}`)
  console.log(`  Tx:        ${sig}`)
  console.log('')
  console.log(
    'Update USDC_DEVNET_MINT in apps/web/src/lib/constants.ts if needed:',
  )
  console.log(
    `  export const USDC_DEVNET_MINT = new PublicKey('${mintKeypair.publicKey.toBase58()}')`,
  )
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
