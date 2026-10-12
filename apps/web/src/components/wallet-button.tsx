'use client'

import * as React from 'react'
import { Button } from '@beam/ui/components/button'
import {
  useAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWallet,
  useWalletConnectors,
} from '@solana/connector/react'
import { Check, Copy, LogOut, Wallet } from 'lucide-react'

export function WalletButton() {
  const { address, formatted } = useAccount()
  const { isConnected } = useWallet()
  const connectors = useWalletConnectors()
  const { connect } = useConnectWallet()
  const { disconnect } = useDisconnectWallet()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  const handleConnect = React.useCallback(() => {
    const first = connectors[0]
    if (first) {
      connect(first.id)
    }
  }, [connectors, connect])

  if (!isConnected || !address) {
    return (
      <Button variant="outline" size="sm" onClick={handleConnect}>
        <Wallet />
        Connect Wallet
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? <Check /> : <Copy />}
        {formatted}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
      >
        <LogOut />
      </Button>
    </div>
  )
}
