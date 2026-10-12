/**
 * Add Metaplex token metadata (one-off).
 * Usage (from packages/anchor): bun run add-token-metadata
 */
import * as fs from 'node:fs'
import {
  createV1,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import {
  keypairIdentity,
  percentAmount,
  publicKey,
} from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

const MINT = '2vr18p7afj7VUrpXNh1kvYFPPLr2Ceh14eG47cHJLY3X'

const umi = createUmi('https://api.devnet.solana.com')
  .use(mplTokenMetadata())
  .use(mplToolbox())

const walletFile = JSON.parse(
  fs.readFileSync(
    `${process.env.HOME}/.config/solana/devnet-wallet.json`,
    'utf-8',
  ),
)
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletFile))
umi.use(keypairIdentity(keypair))

const mint = publicKey(MINT)

async function addMetadata() {
  console.log('Adding metadata to token:', MINT)
  console.log('Authority:', keypair.publicKey)

  const tx = await createV1(umi, {
    mint,
    authority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity.publicKey,
    name: 'Beam USD',
    symbol: 'USDT',
    uri: '',
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi)

  const txSig = base58.deserialize(tx.signature)
  console.log('Metadata added!')
  console.log(`https://explorer.solana.com/tx/${txSig[0]}?cluster=devnet`)
}

addMetadata().catch(console.error)
