import { generateText, Output } from 'ai'
import { z } from 'zod'
import { model } from '@/lib/ai'

const anomalySchema = z.object({
  anomalies: z.array(
    z.object({
      id: z.string().describe('Transaction identifier or date'),
      type: z
        .enum(['payroll', 'reimbursement', 'transfer'])
        .describe('Transaction type'),
      severity: z.enum(['warning', 'critical']),
      reason: z.string().describe('Brief explanation of the anomaly'),
      amount: z.string().describe('The flagged amount'),
    }),
  ),
  summary: z
    .string()
    .describe('One-sentence overall assessment of treasury health'),
})

export async function POST(req: Request) {
  const { transactions, context } = await req.json()

  const prompt = [
    `You are a financial anomaly detection system for a corporate treasury on Solana.`,
    `Analyze the following transaction data and flag any anomalies.`,
    ``,
    `Consider these patterns as potentially anomalous:`,
    `- Amounts significantly higher than historical averages`,
    `- Unusual frequency of transactions from the same person`,
    `- Large transfers to new/unknown recipients`,
    `- Reimbursements with vague descriptions and high amounts`,
    `- Payroll amounts that differ from base salary`,
    ``,
    `## Treasury Context`,
    context ?? 'No additional context.',
    ``,
    `## Recent Transactions`,
    JSON.stringify(transactions, null, 2),
    ``,
    `Return an array of anomalies (may be empty if everything looks normal).`,
    `Also provide a one-sentence summary assessment.`,
    `Respond with reasons in the same language as the descriptions (Chinese or English).`,
  ].join('\n')

  const { output } = await generateText({
    model,
    output: Output.object({ schema: anomalySchema }),
    prompt,
  })

  return Response.json(output)
}
