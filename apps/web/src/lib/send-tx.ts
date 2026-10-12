import type { Connection, PublicKey, Transaction } from '@solana/web3.js'

type SendFn = (
  tx: Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean },
) => Promise<string>

export async function signAndSend(
  tx: Transaction,
  feePayer: PublicKey,
  connection: Connection,
  sendTransaction: SendFn,
  opts?: { skipPreflight?: boolean },
) {
  tx.feePayer = feePayer
  const latest = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = latest.blockhash

  let sig: string
  try {
    sig = await sendTransaction(tx, connection, {
      skipPreflight: opts?.skipPreflight ?? false,
    })
  } catch (error) {
    try {
      const simulation = await connection.simulateTransaction(tx)
      if (simulation.value.err) {
        const logs =
          simulation.value.logs?.join('\n') ?? 'No simulation logs available'
        throw new Error(
          `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}\n${logs}`,
        )
      }
    } catch (simulationError) {
      if (
        simulationError instanceof Error &&
        simulationError.message.startsWith('Transaction simulation failed:')
      ) {
        throw simulationError
      }
    }

    throw error
  }

  const confirmation = await connection.confirmTransaction(
    {
      signature: sig,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    'confirmed',
  )

  if (confirmation.value.err) {
    const txInfo = await connection.getTransaction(sig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })
    const logs = txInfo?.meta?.logMessages?.join('\n') ?? 'No logs available'
    throw new Error(
      `Transaction failed: ${JSON.stringify(confirmation.value.err)}\n${logs}`,
    )
  }

  return sig
}
