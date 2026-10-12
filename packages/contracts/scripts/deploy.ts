import { isAddress } from 'ethers'
import hre from 'hardhat'

async function main() {
  const hasKey = Boolean(
    process.env.DEPLOY_PRIVATE_KEY?.trim() ||
      process.env.SEPOLIA_PRIVATE_KEY?.trim(),
  )
  if (!hasKey) {
    throw new Error(
      'No deployer account. Set DEPLOY_PRIVATE_KEY or SEPOLIA_PRIVATE_KEY in packages/contracts/.env',
    )
  }

  const enableWhitelist = process.env.BEAM_ENABLE_WHITELIST === 'true'
  const raw = process.env.BEAM_INITIAL_WHITELIST ?? ''
  const initialWhitelist = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => isAddress(s))

  const Beam = await hre.ethers.getContractFactory('BeamFinance')
  const beam = await Beam.deploy(enableWhitelist, initialWhitelist)
  await beam.waitForDeployment()
  const address = await beam.getAddress()
  console.log('BeamFinance deployed to', address)
  console.log(
    'whitelistEnabled',
    enableWhitelist,
    'initial count',
    initialWhitelist.length,
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
