'use client'

import { Button } from '@beam/ui/components/button'
import { usePrivacyMode } from '@beam/ui/components/privacy-provider'
import { Separator } from '@beam/ui/components/separator'
import { SidebarTrigger } from '@beam/ui/components/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@beam/ui/components/tooltip'
import { Eye, EyeOff, MessageSquare } from 'lucide-react'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/treasury': 'Treasury',
  '/employees': 'Employees',
  '/payroll': 'Payroll',
  '/reimbursements': 'Reimbursements',
  '/transfers': 'Transfers',
  '/history': 'History',
}

export function SiteHeader({
  aiOpen,
  onAiToggle,
}: {
  aiOpen: boolean
  onAiToggle: () => void
}) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Beam Finance'
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-balance font-medium text-base">{title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={aiOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8"
                  onClick={onAiToggle}
                  aria-label={
                    aiOpen ? 'Close AI assistant' : 'Open AI assistant'
                  }
                />
              }
            >
              <MessageSquare className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              {aiOpen ? 'Close AI assistant' : 'Open AI assistant'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={togglePrivacyMode}
                  aria-label={isPrivacyMode ? 'Show amounts' : 'Hide amounts'}
                />
              }
            >
              {isPrivacyMode ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {isPrivacyMode ? 'Show amounts' : 'Hide amounts'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
