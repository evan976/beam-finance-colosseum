'use client'

import * as React from 'react'
import { useWalletAdapterCompat } from '@solana/connector/compat'
import {
  useAccount,
  useCluster,
  useDisconnectWallet,
  useTransactionSigner,
  useWallet,
} from '@solana/connector/react'
import {
  Connection,
  PublicKey,
  type SendOptions,
  type Transaction,
} from '@solana/web3.js'
import { resolveClusterUrl } from '@/lib/constants'

export function useWalletCompat() {
  const wallet = useWallet()
  const acct = useAccount()
  const { cluster } = useCluster()
  const { disconnect: rawDisconnect } = useDisconnectWallet()
  const { signer } = useTransactionSigner()

  const disconnect = React.useCallback(async () => {
    try {
      await rawDisconnect()
    } catch {
      // ignore disconnect errors
    }
  }, [rawDisconnect])

  const adapterCompat = useWalletAdapterCompat(signer, disconnect)

  const address = acct.address ?? (wallet.account as string | null)

  const publicKey = React.useMemo(
    () => (address ? new PublicKey(address) : null),
    [address],
  )

  const connection = React.useMemo(() => {
    const url = resolveClusterUrl(cluster?.url)
    if (!url) return null
    return new Connection(url, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60_000,
      disableRetryOnRateLimit: false,
    })
  }, [cluster])

  const sendTransaction = React.useCallback(
    async (
      transaction: Transaction,
      _connection: Connection,
      options?: SendOptions,
    ) => {
      if (!signer) throw new Error('Wallet not connected')
      return signer.signAndSendTransaction(transaction, options)
    },
    [signer],
  )

  return {
    publicKey,
    address: address ?? null,
    connected: wallet.isConnected || acct.connected,
    connecting: wallet.isConnecting,
    connection,
    disconnect,
    signAndSendTransaction: signer
      ? signer.signAndSendTransaction.bind(signer)
      : null,
    sendTransaction: signer ? sendTransaction : adapterCompat.sendTransaction,
    signTransaction: adapterCompat.signTransaction,
    signAllTransactions: adapterCompat.signAllTransactions,
  }
}
