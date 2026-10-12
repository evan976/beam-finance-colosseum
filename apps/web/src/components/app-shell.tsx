'use client'

import * as React from 'react'
import { PrivacyProvider } from '@beam/ui/components/privacy-provider'
import { SidebarInset, SidebarProvider } from '@beam/ui/components/sidebar'
import dynamic from 'next/dynamic'
import { AppSidebar } from '@/components/app-sidebar'
import { ConnectWalletPrompt } from '@/components/connect-wallet-prompt'
import { SiteHeader } from '@/components/site-header'
import { useTreasury } from '@/hooks/use-treasury'
import { useWalletCompat } from '@/hooks/use-wallet-compat'

const AiChat = dynamic(
  () => import('@/components/ai-chat').then((mod) => mod.AiChat),
  { ssr: false },
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const { publicKey, connected } = useWalletCompat()
  const { treasury, isAdmin, isLoading } = useTreasury()
  const [aiOpen, setAiOpen] = React.useState(false)

  if (!connected || !publicKey) {
    return <ConnectWalletPrompt />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      </div>
    )
  }

  return (
    <PrivacyProvider>
      <SidebarProvider
        className="h-svh overflow-hidden"
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          isAdmin={isAdmin}
          treasuryName={treasury?.name}
        />
        <SidebarInset className="min-w-0 overflow-hidden">
          <SiteHeader
            aiOpen={aiOpen}
            onAiToggle={() => {
              React.startTransition(() => {
                setAiOpen((open) => !open)
              })
            }}
          />
          <div className="@container/main min-h-0 flex-1 overflow-y-auto p-4 pt-0">
            <div className="pt-4 lg:pt-6">{children}</div>
          </div>
        </SidebarInset>
        <AiChat open={aiOpen} onOpenChange={setAiOpen} />
      </SidebarProvider>
    </PrivacyProvider>
  )
}
