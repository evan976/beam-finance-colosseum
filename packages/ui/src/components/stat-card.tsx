'use client'

import type * as React from 'react'
import { Card, CardContent } from '@beam/ui/components/card'
import { usePrivacyMode } from '@beam/ui/components/privacy-provider'
import { cn } from '@beam/ui/lib/utils'
import NumberFlow from '@number-flow/react'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  description?: string
  trend?: {
    value: string
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
  className?: string
  hideInPrivacy?: boolean
  animated?: boolean
}

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  className,
  hideInPrivacy = true,
  animated = false,
}: StatCardProps) {
  const { isPrivacyMode } = usePrivacyMode()

  const shouldHide = isPrivacyMode && hideInPrivacy
  const isNumeric = typeof value === 'number'

  let displayValue: React.ReactNode = value

  if (shouldHide) {
    displayValue = isNumeric ? '****' : '******'
  } else if (animated && isNumeric) {
    displayValue = (
      <NumberFlow
        value={value}
        transformTiming={{ duration: 400, easing: 'ease-out' }}
        spinTiming={{ duration: 400, easing: 'ease-out' }}
        opacityTiming={{ duration: 200, easing: 'ease-out' }}
      />
    )
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground text-sm">{label}</p>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-3">
          <p
            className={cn(
              'truncate font-bold text-3xl tracking-tight',
              shouldHide && 'select-none',
            )}
          >
            {displayValue}
          </p>
          {description && (
            <p className="mt-0.5 text-muted-foreground text-xs">
              {description}
            </p>
          )}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend.direction === 'up' && (
              <ArrowUpRight className="size-3.5 text-emerald-500" />
            )}
            {trend.direction === 'down' && (
              <ArrowDownRight className="size-3.5 text-rose-500" />
            )}
            <span
              className={cn(
                'font-medium',
                trend.direction === 'up' && 'text-emerald-500',
                trend.direction === 'down' && 'text-rose-500',
                trend.direction === 'neutral' && 'text-muted-foreground',
              )}
            >
              {trend.value}
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
