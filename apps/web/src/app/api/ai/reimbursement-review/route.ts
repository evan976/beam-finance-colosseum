import { generateText, Output } from 'ai'
import { z } from 'zod'
import { model } from '@/lib/ai'

const reviewSchema = z.object({
  risk: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const { reimbursement, employee, history } = body as {
    reimbursement: {
      amount: string
      description: string
      date: string
    }
    employee: {
      name: string
      position: string
      department: string
      baseSalary: string
    }
    history: {
      avgAmount: number
      totalCount: number
      recentCount: number
    }
  }

  const prompt = [
    `You are an expense review assistant for a corporate treasury.`,
    `Evaluate this reimbursement request and assess its risk level.`,
    ``,
    `## Reimbursement Request`,
    `- Amount: ${reimbursement.amount} USDT`,
    `- Description: ${reimbursement.description}`,
    `- Date: ${reimbursement.date}`,
    ``,
    `## Employee Info`,
    `- Name: ${employee.name}`,
    `- Position: ${employee.position}`,
    `- Department: ${employee.department}`,
    `- Base Salary: ${employee.baseSalary} USDT`,
    ``,
    `## Historical Stats`,
    `- Average reimbursement amount: ${history.avgAmount.toFixed(2)} USDT`,
    `- Total reimbursement count: ${history.totalCount}`,
    `- Recent (30 day) count: ${history.recentCount}`,
    ``,
    `Return risk as "low", "medium", or "high" and a brief one-sentence reason.`,
    `Respond in the same language the description is written in.`,
  ].join('\n')

  const { output } = await generateText({
    model,
    output: Output.object({ schema: reviewSchema }),
    prompt,
  })

  return Response.json(output)
}
