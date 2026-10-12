/**
 * Airdrop SOL and mint test tokens to a wallet.
 * Usage (from packages/anchor): bun run airdrop [address] [cluster]
 *   address: wallet pubkey (default: local wallet)
 *   cluster: localnet (default) | devnet
 */
import * as fs from 'node:fs'
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js'

const CLUSTERS: Record<string, string> = {
  localnet: 'http://localhost:8899',
  devnet: 'https://api.devnet.solana.com',
}

const TOKEN_MINT =
  process.env.TOKEN_MINT ?? '24kW8PP2TPuDWpN8zJ8rjfbApS9FRZVSi7NrJQDoeQ7b'
const TOKEN_DECIMALS = 6
const SOL_AMOUNT = 5
const TOKEN_AMOUNT = 100_000

const cluster = process.argv[3] ?? 'devnet'
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

const targetAddress = process.argv[2] ?? payer.publicKey.toBase58()
const target = new PublicKey(targetAddress)
const mint = new PublicKey(TOKEN_MINT)
const connection = new Connection(rpcUrl, 'confirmed')

async function main() {
  console.log('=== Airdrop SOL + Tokens ===')
  console.log(`  Cluster:  ${cluster} (${rpcUrl})`)
  console.log(`  Target:   ${target.toBase58()}`)
  console.log(`  Mint:     ${mint.toBase58()}`)
  console.log(`  SOL:      ${SOL_AMOUNT}`)
  console.log(`  Tokens:   ${TOKEN_AMOUNT.toLocaleString()}`)
  console.log('')

  // Airdrop SOL
  try {
    console.log(`Airdropping ${SOL_AMOUNT} SOL...`)
    const sig = await connection.requestAirdrop(
      target,
      SOL_AMOUNT * LAMPORTS_PER_SOL,
    )
    await connection.confirmTransaction(sig, 'confirmed')
    console.log('  SOL airdrop confirmed.')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`  SOL airdrop skipped: ${msg}`)
  }

  // Create ATA + mint tokens
  const ata = getAssociatedTokenAddressSync(mint, target)
  const rawAmount = BigInt(TOKEN_AMOUNT) * BigInt(10 ** TOKEN_DECIMALS)

  const tx = new Transaction()

  const ataInfo = await connection.getAccountInfo(ata)
  if (!ataInfo) {
    console.log('Creating associated token account...')
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        target,
        mint,
      ),
    )
  }

  console.log(`Minting ${TOKEN_AMOUNT.toLocaleString()} tokens...`)
  tx.add(createMintToInstruction(mint, ata, payer.publicKey, rawAmount))

  tx.feePayer = payer.publicKey
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.sign(payer)

  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(sig, 'confirmed')

  const balance = await connection.getTokenAccountBalance(ata)
  console.log('')
  console.log('Done!')
  console.log(`  ATA:     ${ata.toBase58()}`)
  console.log(`  Balance: ${balance.value.uiAmountString} tokens`)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
