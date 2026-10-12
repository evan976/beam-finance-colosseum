import { isAddress } from 'ethers'
import hre from 'hardhat'

/**
 * Verify BeamFinance on Etherscan (Sepolia) or Blockscout (EDU Chain testnet).
 * Same whitelist env as deploy. Sepolia needs ETHERSCAN_API_KEY.
 *
 * Usage:
 *   BEAM_FINANCE_ADDRESS=0x... bun run verify:sepolia
 *   BEAM_FINANCE_ADDRESS=0x... bun run verify:edu-testnet
 *   BEAM_FINANCE_ADDRESS=0x... bun run verify:og-mainnet
 *   BEAM_FINANCE_ADDRESS=0x... bun run verify:og-testnet
 */
async function main() {
  const address = process.env.BEAM_FINANCE_ADDRESS
  if (typeof address !== 'string' || !isAddress(address)) {
    throw new Error('Set BEAM_FINANCE_ADDRESS to the deployed contract address')
  }

  const enableWhitelist = process.env.BEAM_ENABLE_WHITELIST === 'true'
  const raw = process.env.BEAM_INITIAL_WHITELIST ?? ''
  const initialWhitelist = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => isAddress(s))

  await hre.run('verify:verify', {
    address,
    constructorArguments: [enableWhitelist, initialWhitelist],
  })
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
