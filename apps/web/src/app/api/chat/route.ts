import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai'
import { z } from 'zod'
import { model } from '@/lib/ai'

export async function POST(req: Request) {
  const { messages, context } = await req.json()

  const isAdmin = context?.raw?.isAdmin === true

  const systemPrompt = [
    `You are Beam AI, a financial assistant for a Solana-based corporate treasury management platform called Beam Finance.`,
    `You help admins and employees understand their treasury data, payroll, reimbursements, and transfers.`,
    `Answer questions concisely and accurately based on the data provided below.`,
    `Always respond in the same language the user writes in (Chinese or English).`,
    `When presenting financial data, use clear formatting with tables or bullet points.`,
    `Currency unit is ${context?.tokenSymbol ?? 'USDT'}.`,
    ``,
    `## Privacy & Access Control`,
    ``,
    `Current user role: ${isAdmin ? 'Admin' : 'Employee'}.`,
    isAdmin
      ? [
          `As Admin you can view: treasury balance, all employees and their salaries, all payroll/reimbursement/transfer records.`,
          `You CANNOT view any employee's personal wallet token balance — you only know their salary rate and payment history.`,
          `If asked about an employee's personal wallet balance, explain that this is private information you do not have access to.`,
        ].join(' ')
      : [
          `As Employee you can ONLY view your own data: your salary, your payroll history, your reimbursements, and your transfers.`,
          `You CANNOT view: treasury balance, other employees' information, company-wide financial data, or any other employee's records.`,
          `If asked about treasury balance, other employees, or company finances, politely decline and explain this is admin-only information.`,
        ].join(' '),
    ``,
    `## Action Rules`,
    ``,
    `When the user requests an on-chain action, you MUST collect all required information before calling suggest_action. Never call suggest_action with missing required fields.`,
    `Required fields by action:`,
    `- add_employee: employeeWallet, employeeName, employeeDepartment, employeePosition, amount (monthly salary). Admin only. Ask for any missing field.`,
    `- remove_employee: employeeWallet. Admin only. Look up by name if needed, confirm before proceeding.`,
    `- submit_reimbursement: amount AND description (expense reason). If either is missing, ask the user.`,
    `- pay_salary: employeeWallet. Admin only. If ambiguous, look up the employee by name first.`,
    `- transfer_from_treasury: recipient address AND amount. Admin only.`,
    `- transfer_p2p: recipient address AND amount. Available to both admin and employee.`,
    `- approve_reimbursement / reject_reimbursement: targetId. Admin only.`,
    `- add_contact: contactAddress AND contactName. Available to everyone. Saves a wallet address to the user's on-chain address book.`,
    `- remove_contact: contactAddress. Available to everyone.`,
    `When the user mentions transferring to a contact by name (e.g. "transfer to my Binance"), look up the address from the contacts data below and use it as the recipient.`,
    ``,
    `## Current Data`,
    ``,
    context?.summary ?? 'No treasury data available.',
  ].join('\n')

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      get_treasury_summary: tool({
        description:
          'Get treasury summary (admin: full details; employee: only your own info)',
        inputSchema: z.object({}),
        execute: async () => {
          if (!context?.raw) return { error: 'No treasury data' }
          const { raw } = context
          if (!raw.isAdmin) {
            const me = raw.employees[0]
            return {
              company: raw.treasuryName,
              role: 'Employee',
              yourSalary: me ? `${me.baseSalary} USDT` : 'Not found',
              note: 'Treasury balance is only visible to admins.',
            }
          }
          return {
            name: raw.treasuryName,
            balance: `${raw.balance} USDT`,
            employeeCount: raw.employeeCount,
            totalMonthlyPayroll: raw.employees
              .reduce(
                (s: number, e: { baseSalary: string }) =>
                  s + Number(e.baseSalary),
                0,
              )
              .toFixed(2),
          }
        },
      }),
      get_pending_reimbursements: tool({
        description:
          'Get pending reimbursement requests (admin: all; employee: your own)',
        inputSchema: z.object({}),
        execute: async () => {
          if (!context?.raw) return { error: 'No data' }
          return context.raw.reimbursements.filter(
            (r: { status: string }) => r.status === 'pending',
          )
        },
      }),
      get_recent_transactions: tool({
        description: 'Get recent records (admin: all; employee: only your own)',
        inputSchema: z.object({
          type: z
            .enum(['payroll', 'reimbursement', 'transfer', 'all'])
            .describe('Type of transactions to retrieve'),
          limit: z
            .number()
            .optional()
            .describe('Max number of records to return'),
        }),
        execute: async ({
          type,
          limit = 20,
        }: {
          type: string
          limit?: number
        }) => {
          if (!context?.raw) return { error: 'No data' }
          const { raw } = context
          if (type === 'payroll') return raw.payrolls.slice(0, limit)
          if (type === 'reimbursement')
            return raw.reimbursements.slice(0, limit)
          if (type === 'transfer') return raw.transfers.slice(0, limit)
          return {
            payrolls: raw.payrolls.slice(0, limit),
            reimbursements: raw.reimbursements.slice(0, limit),
            transfers: raw.transfers.slice(0, limit),
          }
        },
      }),
      get_employee_details: tool({
        description: isAdmin
          ? 'Get detailed information about employees including names, positions, departments, and salaries'
          : 'Get your own employee profile',
        inputSchema: z.object({
          name: z
            .string()
            .optional()
            .describe('Filter by employee name (admin only)'),
        }),
        execute: async ({ name }: { name?: string }) => {
          if (!context?.raw) return { error: 'No data' }
          if (!context.raw.isAdmin) {
            return context.raw.employees
          }
          let emps = context.raw.employees
          if (name) {
            const lower = name.toLowerCase()
            emps = emps.filter((e: { name: string }) =>
              e.name.toLowerCase().includes(lower),
            )
          }
          return emps
        },
      }),
      get_contacts: tool({
        description:
          "Get the user's saved contacts (address book). Use to resolve contact names to wallet addresses for transfers.",
        inputSchema: z.object({}),
        execute: async () => {
          if (!context?.raw?.contacts) return []
          return context.raw.contacts
        },
      }),
      suggest_action: tool({
        description: [
          'Suggest an on-chain action for the user to confirm.',
          'Use this when the user asks to perform an operation.',
          'For add_employee: set employeeWallet, employeeName, employeeDepartment, employeePosition, and amount (monthly salary). Admin only.',
          'For remove_employee: set employeeWallet. Admin only.',
          'For pay_salary: set employeeWallet. Admin only.',
          'For transfer_from_treasury: set recipient, amount, and memo. Admin only. If user specifies a contact name, resolve it to the address first.',
          'For transfer_p2p: set recipient, amount, and memo. If user specifies a contact name, resolve it to the address first.',
          'For submit_reimbursement: set amount and description.',
          'For approve/reject_reimbursement: set targetId to the reimbursement PDA. Admin only.',
          'For add_contact: set contactAddress and contactName.',
          'For remove_contact: set contactAddress.',
        ].join(' '),
        inputSchema: z.object({
          action: z
            .enum([
              'add_employee',
              'remove_employee',
              'pay_salary',
              'transfer_from_treasury',
              'transfer_p2p',
              'submit_reimbursement',
              'approve_reimbursement',
              'reject_reimbursement',
              'add_contact',
              'remove_contact',
            ])
            .describe('The action to suggest'),
          targetId: z
            .string()
            .optional()
            .describe(
              'Public key of the target record (reimbursement PDA for approve/reject)',
            ),
          employeeWallet: z
            .string()
            .optional()
            .describe(
              'Employee wallet public key (required for add/remove_employee and pay_salary)',
            ),
          employeeName: z
            .string()
            .optional()
            .describe('Employee name (required for add_employee)'),
          employeeDepartment: z
            .string()
            .optional()
            .describe('Department (required for add_employee)'),
          employeePosition: z
            .string()
            .optional()
            .describe('Position/title (required for add_employee)'),
          recipient: z
            .string()
            .optional()
            .describe('Recipient wallet public key (required for transfers)'),
          amount: z
            .number()
            .optional()
            .describe(
              'Amount in token units (monthly salary for add_employee, expense amount for submit_reimbursement, transfer amount for transfers)',
            ),
          description: z
            .string()
            .optional()
            .describe(
              'Expense description (required for submit_reimbursement)',
            ),
          memo: z
            .string()
            .optional()
            .describe('Transaction memo (optional for transfers/salary)'),
          contactAddress: z
            .string()
            .optional()
            .describe(
              'Contact wallet address (required for add_contact/remove_contact)',
            ),
          contactName: z
            .string()
            .optional()
            .describe('Contact display name (required for add_contact)'),
          label: z
            .string()
            .describe(
              'Human-readable label, e.g. "Add Alice as Frontend Engineer"',
            ),
          reason: z
            .string()
            .describe('Brief explanation of why this action is suggested'),
        }),
        execute: async (params) => {
          return { ...params, requiresConfirmation: true }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
