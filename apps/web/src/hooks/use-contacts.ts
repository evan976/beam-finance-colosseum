'use client'

import type { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useProgram } from './use-program'

export interface ContactRecord {
  publicKey: PublicKey
  owner: PublicKey
  address: PublicKey
  name: string
}

export function useContacts(owner: PublicKey | null) {
  const { program } = useProgram()

  const query = useQuery({
    queryKey: queryKeys.contacts(owner),
    queryFn: async (): Promise<ContactRecord[]> => {
      if (!program || !owner) return []

      const all = await program.account.contact.all()
      return all
        .filter((a) => a.account.owner.toBase58() === owner.toBase58())
        .map((a) => ({
          publicKey: a.publicKey,
          owner: a.account.owner,
          address: a.account.address,
          name: a.account.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: !!program && !!owner,
  })

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
