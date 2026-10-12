'use client'

import * as React from 'react'
import { AnchorProvider as AnchorSdkProvider } from '@coral-xyz/anchor'
import { useWalletAdapterCompat } from '@solana/connector/compat'
import {
  useCluster,
  useDisconnectWallet,
  useTransactionSigner,
} from '@solana/connector/react'
import { Connection, PublicKey } from '@solana/web3.js'
import { resolveClusterUrl } from '@/lib/constants'

const AnchorContext = React.createContext<AnchorSdkProvider | null>(null)

export function AnchorProvider({ children }: { children: React.ReactNode }) {
  const { signer } = useTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { cluster } = useCluster()

  const disconnectFn = React.useCallback(async () => {
    try {
      await disconnect()
    } catch {
      // ignore disconnect errors
    }
  }, [disconnect])

  const compat = useWalletAdapterCompat(signer, disconnectFn)

  const provider = React.useMemo(() => {
    try {
      const url = resolveClusterUrl(cluster?.url)
      if (!compat.publicKey || !url) return null

      const anchorWallet = {
        publicKey: new PublicKey(compat.publicKey),
        signTransaction: compat.signTransaction,
        signAllTransactions: compat.signAllTransactions,
      }

      const connection = new Connection(url, 'confirmed')
      return new AnchorSdkProvider(connection, anchorWallet as any, {
        commitment: 'confirmed',
      })
    } catch {
      return null
    }
  }, [
    compat.publicKey,
    compat.signTransaction,
    compat.signAllTransactions,
    cluster,
  ])

  return (
    <AnchorContext.Provider value={provider}>{children}</AnchorContext.Provider>
  )
}

export function useAnchorProvider() {
  return React.useContext(AnchorContext)
}
