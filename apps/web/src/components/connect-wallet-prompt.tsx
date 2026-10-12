'use client'

import { Button } from '@beam/ui/components/button'
import { useConnectWallet, useWalletConnectors } from '@solana/connector/react'
import { Wallet } from 'lucide-react'
import Image from 'next/image'

export function ConnectWalletPrompt() {
  const connectors = useWalletConnectors()
  const { connect } = useConnectWallet()

  const handleConnect = () => {
    const first = connectors[0]
    if (first) {
      connect(first.id)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="mx-auto max-w-sm text-center">
        <Image
          src="/logo.svg"
          alt="Beam Finance"
          width={48}
          height={48}
          priority
          className="mx-auto mb-6 dark:invert"
        />
        <h1 className="font-bold text-2xl tracking-tight">
          Welcome to Beam Finance
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Connect your Solana wallet to access your treasury, manage payroll,
          and track expenses on-chain.
        </p>
        <Button size="lg" className="mt-8" onClick={handleConnect}>
          <Wallet className="mr-2" />
          Connect Wallet
        </Button>
      </div>
    </div>
  )
}
