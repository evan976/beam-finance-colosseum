import { isAddress, parseUnits, Wallet } from 'ethers'
import hre from 'hardhat'

/**
 * Deploy MockERC20Mintable and mint to an address (test "USDT" / any symbol).
 *
 * Required: DEPLOY_PRIVATE_KEY or SEPOLIA_PRIVATE_KEY in packages/contracts/.env
 *
 * Env (optional):
 *   MOCK_TOKEN_NAME       default: Test USDT
 *   MOCK_TOKEN_SYMBOL     default: USDT
 *   MOCK_TOKEN_DECIMALS   default: 6 (mainnet USDT-like)
 *   MOCK_MINT_TO          recipient (default: deployer address)
 *   MOCK_MINT_AMOUNT      human amount, default: 1000000 (1M units in decimal form)
 *
 * Examples:
 *   bun run deploy:mock-token:og-testnet
 *   bun run deploy:mock-token:edu-testnet
 *   MOCK_MINT_TO=0x... MOCK_MINT_AMOUNT=5000 bun run deploy:mock-token:og-testnet
 */
async function main() {
  const hasKey = Boolean(process.env.DEPLOY_PRIVATE_KEY?.trim())
  if (!hasKey) {
    throw new Error('Set DEPLOY_PRIVATE_KEY in packages/contracts/.env')
  }

  const name = process.env.MOCK_TOKEN_NAME ?? 'Test USDT'
  const symbol = process.env.MOCK_TOKEN_SYMBOL ?? 'USDT'
  const decimals = Number(process.env.MOCK_TOKEN_DECIMALS ?? '6')
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('MOCK_TOKEN_DECIMALS must be an integer 0–18')
  }

  const key = process.env.DEPLOY_PRIVATE_KEY
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Missing deployer private key')
  }
  const deployerAddress = new Wallet(key.trim()).address as `0x${string}`

  const rawTo = process.env.MOCK_MINT_TO?.trim()
  const mintTo = rawTo && isAddress(rawTo) ? rawTo : deployerAddress

  const amountHuman = process.env.MOCK_MINT_AMOUNT ?? '1000000'

  const Token = await hre.ethers.getContractFactory('MockERC20Mintable')
  const token = await Token.deploy(name, symbol, decimals)
  await token.waitForDeployment()
  const address = await token.getAddress()

  const amount = parseUnits(amountHuman, decimals)
  const mint = token.mint
  if (!mint) throw new Error('MockERC20Mintable mint function is unavailable')
  const tx = await mint(mintTo, amount)
  await tx.wait()

  console.log('MockERC20Mintable deployed to', address)
  console.log('Name:', name, 'Symbol:', symbol, 'Decimals:', decimals)
  console.log('Minted', amountHuman, symbol, 'to', mintTo)
  console.log('')
  console.log('Token address:', address)
  console.log('Decimals:', decimals)
  console.log('Symbol:', symbol)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
