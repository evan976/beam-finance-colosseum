'use client'

import * as React from 'react'
import { AppProvider, getDefaultConfig } from '@solana/connector/react'

const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim() || 'devnet') as
  | 'mainnet'
  | 'mainnet-beta'
  | 'devnet'
  | 'testnet'
  | 'localnet'

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || undefined

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const config = React.useMemo(
    () =>
      getDefaultConfig({
        appName: 'Beam Finance',
        appUrl: typeof window !== 'undefined' ? window.location.origin : '',
        autoConnect: true,
        enableMobile: true,
        network: CLUSTER,
        ...(RPC_URL
          ? {
              clusters: [
                {
                  id: `solana:${CLUSTER === 'mainnet-beta' ? 'mainnet' : CLUSTER}`,
                  label: CLUSTER,
                  url: RPC_URL,
                },
              ],
            }
          : {}),
        wallets: {
          featured: ['phantom', 'solflare', 'backpack'],
        },
      }),
    [],
  )

  return <AppProvider connectorConfig={config}>{children}</AppProvider>
}
