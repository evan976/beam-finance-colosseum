import { type AnchorProvider, Program } from '@coral-xyz/anchor'
import type { Beam } from './beam'
import idlJson from './idl.json'

export function getProgram(provider: AnchorProvider) {
  return new Program<Beam>(idlJson as unknown as Beam, provider)
}
