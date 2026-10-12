'use client'

import * as React from 'react'
import type { Program } from '@coral-xyz/anchor'
import { useAnchorProvider } from '@/components/providers/anchor-provider'
import type { Beam } from '@/lib/beam'
import { getProgram } from '@/lib/program'

export function useProgram() {
  const provider = useAnchorProvider()
  const [program, setProgram] = React.useState<Program<Beam> | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!provider) {
      setProgram(null)
      return
    }
    try {
      setProgram(getProgram(provider))
    } catch (err: any) {
      setError(err.message)
    }
  }, [provider])

  return { program, error }
}
