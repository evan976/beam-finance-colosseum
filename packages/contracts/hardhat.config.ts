import 'dotenv/config'

import '@nomicfoundation/hardhat-toolbox'
import type { HardhatUserConfig } from 'hardhat/config'

const eduChainRpc =
  process.env.EDU_CHAIN_RPC_URL?.trim() ||
  'https://rpc.open-campus-codex.gelato.digital'

const ogMainnetRpc =
  process.env.OG_MAINNET_RPC_URL?.trim() || 'https://evmrpc.0g.ai'

const ogGalileoTestnetRpc =
  process.env.OG_TESTNET_RPC_URL?.trim() || 'https://evmrpc-testnet.0g.ai'

const deployerKey = process.env.DEPLOY_PRIVATE_KEY

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    eduChainTestnet: {
      url: eduChainRpc,
      chainId: 656476,
      accounts: deployerKey ? [deployerKey] : [],
    },
    ogMainnet: {
      url: ogMainnetRpc,
      chainId: 16661,
      accounts: deployerKey ? [deployerKey] : [],
    },
    ogGalileoTestnet: {
      url: ogGalileoTestnetRpc,
      chainId: 16602,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    apiKey: {
      // Blockscout: placeholder ok for public API on many instances
      eduChainTestnet: process.env.BLOCKSCOUT_API_KEY ?? 'empty',
      ogMainnet: process.env.OG_CHAINSCAN_API_KEY ?? 'empty',
      ogGalileoTestnet: process.env.OG_GALILEO_CHAINSCAN_API_KEY ?? 'empty',
    },
    customChains: [
      {
        network: 'eduChainTestnet',
        chainId: 656476,
        urls: {
          apiURL: 'https://edu-chain-testnet.blockscout.com/api',
          browserURL: 'https://edu-chain-testnet.blockscout.com',
        },
      },
      {
        network: 'ogMainnet',
        chainId: 16661,
        urls: {
          apiURL: 'https://chainscan.0g.ai/api',
          browserURL: 'https://chainscan.0g.ai',
        },
      },
      {
        network: 'ogGalileoTestnet',
        chainId: 16602,
        urls: {
          apiURL: 'https://chainscan-galileo.0g.ai/api',
          browserURL: 'https://chainscan-galileo.0g.ai',
        },
      },
    ],
  },
}

export default config
