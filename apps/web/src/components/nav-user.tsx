'use client'

import * as React from 'react'
import { Badge } from '@beam/ui/components/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@beam/ui/components/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@beam/ui/components/sidebar'
import { useAccount, useDisconnectWallet } from '@solana/connector/react'
import {
  Check,
  Copy,
  EllipsisVerticalIcon,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Wallet,
} from 'lucide-react'
import { useTheme } from 'next-themes'

export function NavUser({ isAdmin }: { isAdmin: boolean }) {
  const { address, formatted } = useAccount()
  const { disconnect } = useDisconnectWallet()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  const handleDisconnect = React.useCallback(async () => {
    try {
      await disconnect()
    } catch {
      // Wallet may already be disconnected or adapter threw during cleanup
    }
  }, [disconnect])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium font-mono text-xs">
                {formatted ?? 'Not connected'}
              </span>
              <span className="truncate text-foreground/70 text-xs">
                {isAdmin ? 'Admin' : 'Employee'}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Wallet className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium font-mono text-xs">
                      {formatted}
                    </span>
                    <Badge
                      variant="outline"
                      className="mt-0.5 w-fit text-[10px]"
                    >
                      {isAdmin ? 'Admin' : 'Employee'}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied!' : 'Copy Address'}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun className="dark:hidden" />
                <Moon className="hidden dark:block" />
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    <Sun />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDisconnect}>
              <LogOut />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
