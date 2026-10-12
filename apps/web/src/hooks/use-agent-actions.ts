'use client'

import * as React from 'react'
import * as anchor from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { TOKEN_DECIMALS } from '@/lib/constants'
import {
  createRecordId,
  getContactPDA,
  getEmployeePDA,
  getPayrollPDA,
  getReimbursementPDA,
  getTransferPDA,
} from '@/lib/pda'
import { signAndSend } from '@/lib/send-tx'
import { useProgram } from './use-program'
import { useTreasury } from './use-treasury'
import { useWalletCompat } from './use-wallet-compat'

export interface AgentAction {
  action: string
  targetId?: string
  employeeWallet?: string
  employeeName?: string
  employeeDepartment?: string
  employeePosition?: string
  recipient?: string
  amount?: number
  description?: string
  memo?: string
  contactAddress?: string
  contactName?: string
  label: string
  reason: string
  requiresConfirmation: boolean
}

export function useAgentActions() {
  const { publicKey, connection, sendTransaction } = useWalletCompat()
  const { treasury, treasuryPDA, vaultPDA } = useTreasury()
  const { program } = useProgram()
  const queryClient = useQueryClient()

  const executeAction = React.useCallback(
    async (action: AgentAction): Promise<string> => {
      if (!publicKey || !connection || !sendTransaction || !program)
        throw new Error('Wallet not connected')
      if (!treasury || !treasuryPDA || !vaultPDA)
        throw new Error('Treasury not loaded')

      switch (action.action) {
        case 'add_employee': {
          if (!action.employeeWallet) throw new Error('Missing employee wallet')
          if (!action.employeeName?.trim())
            throw new Error('Missing employee name')
          if (!action.amount || action.amount <= 0)
            throw new Error('Invalid salary amount')

          const newEmpPk = new PublicKey(action.employeeWallet)
          const salaryAmount = Math.floor(action.amount * 10 ** TOKEN_DECIMALS)
          const [empInfoPda] = getEmployeePDA(treasuryPDA, newEmpPk)

          const tx = await program.methods
            .addEmployee(
              newEmpPk,
              action.employeeName.trim(),
              (action.employeeDepartment ?? '').trim(),
              (action.employeePosition ?? '').trim(),
              new anchor.BN(salaryAmount),
            )
            .accountsStrict({
              admin: publicKey,
              treasury: treasuryPDA,
              employeeInfo: empInfoPda,
              systemProgram: SystemProgram.programId,
            })
            .transaction()

          const addSig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
          )
          await queryClient.invalidateQueries({ queryKey: ['treasury'] })
          await queryClient.invalidateQueries({ queryKey: ['employees'] })
          return addSig
        }

        case 'remove_employee': {
          if (!action.employeeWallet) throw new Error('Missing employee wallet')

          const removeEmpPk = new PublicKey(action.employeeWallet)
          const [removeEmpInfoPda] = getEmployeePDA(treasuryPDA, removeEmpPk)

          const tx = await program.methods
            .removeEmployee(removeEmpPk)
            .accountsStrict({
              admin: publicKey,
              treasury: treasuryPDA,
              employeeInfo: removeEmpInfoPda,
            })
            .transaction()

          const removeSig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
          )
          await queryClient.invalidateQueries({ queryKey: ['treasury'] })
          await queryClient.invalidateQueries({ queryKey: ['employees'] })
          return removeSig
        }

        case 'pay_salary': {
          if (!action.employeeWallet) throw new Error('Missing employee wallet')
          const empPk = new PublicKey(action.employeeWallet)
          const recordId = createRecordId()
          const [payrollPda] = getPayrollPDA(treasuryPDA, empPk, recordId)
          const [employeeInfoPda] = getEmployeePDA(treasuryPDA, empPk)
          const employeeAta = getAssociatedTokenAddressSync(
            treasury.tokenMint,
            empPk,
          )
          const month = format(new Date(), 'MMMM yyyy')

          const tx = await program.methods
            .paySalary(
              new anchor.BN(recordId.toString()),
              action.memo || `${month} salary`,
            )
            .accountsStrict({
              admin: publicKey,
              treasury: treasuryPDA,
              vault: vaultPDA,
              employee: empPk,
              employeeInfo: employeeInfoPda,
              employeeTokenAccount: employeeAta,
              payroll: payrollPda,
              tokenMint: treasury.tokenMint,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              clock: SYSVAR_CLOCK_PUBKEY,
              systemProgram: SystemProgram.programId,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
            { skipPreflight: true },
          )
          await queryClient.invalidateQueries({ queryKey: ['treasury'] })
          await queryClient.invalidateQueries({ queryKey: ['payroll'] })
          await queryClient.invalidateQueries({ queryKey: ['employees'] })
          return sig
        }

        case 'transfer_from_treasury': {
          if (!action.recipient) throw new Error('Missing recipient')
          if (!action.amount || action.amount <= 0)
            throw new Error('Invalid amount')

          const recipientPk = new PublicKey(action.recipient)
          const tokenAmount = Math.floor(action.amount * 10 ** TOKEN_DECIMALS)
          const recordId = createRecordId()
          const [transferPda] = getTransferPDA(
            treasuryPDA,
            recipientPk,
            recordId,
          )
          const recipientAta = getAssociatedTokenAddressSync(
            treasury.tokenMint,
            recipientPk,
          )

          const tx = await program.methods
            .transferFromTreasury(
              new anchor.BN(recordId.toString()),
              new anchor.BN(tokenAmount),
              action.memo || 'Transfer',
            )
            .accountsStrict({
              admin: publicKey,
              treasury: treasuryPDA,
              vault: vaultPDA,
              recipient: recipientPk,
              recipientTokenAccount: recipientAta,
              transferRecord: transferPda,
              tokenMint: treasury.tokenMint,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              clock: SYSVAR_CLOCK_PUBKEY,
              systemProgram: SystemProgram.programId,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
            { skipPreflight: true },
          )
          await queryClient.invalidateQueries({ queryKey: ['treasury'] })
          await queryClient.invalidateQueries({ queryKey: ['transfers'] })
          return sig
        }

        case 'transfer_p2p': {
          if (!action.recipient) throw new Error('Missing recipient')
          if (!action.amount || action.amount <= 0)
            throw new Error('Invalid amount')

          const recipientPk = new PublicKey(action.recipient)
          const tokenAmount = Math.floor(action.amount * 10 ** TOKEN_DECIMALS)
          const recordId = createRecordId()
          const [transferPda] = getTransferPDA(treasuryPDA, publicKey, recordId)
          const senderAta = getAssociatedTokenAddressSync(
            treasury.tokenMint,
            publicKey,
          )
          const recipientAta = getAssociatedTokenAddressSync(
            treasury.tokenMint,
            recipientPk,
          )

          const tx = await program.methods
            .transferP2P(
              new anchor.BN(recordId.toString()),
              new anchor.BN(tokenAmount),
              action.memo || 'P2P Transfer',
            )
            .accountsStrict({
              sender: publicKey,
              recipient: recipientPk,
              treasury: treasuryPDA,
              senderTokenAccount: senderAta,
              recipientTokenAccount: recipientAta,
              transferRecord: transferPda,
              tokenMint: treasury.tokenMint,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              clock: SYSVAR_CLOCK_PUBKEY,
              systemProgram: SystemProgram.programId,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
            { skipPreflight: true },
          )
          await queryClient.invalidateQueries({ queryKey: ['transfers'] })
          return sig
        }

        case 'submit_reimbursement': {
          if (!action.amount || action.amount <= 0)
            throw new Error('Invalid amount')
          if (!action.description?.trim())
            throw new Error('Missing description')

          const tokenAmount = Math.floor(action.amount * 10 ** TOKEN_DECIMALS)
          const recordId = createRecordId()
          const [reimbPda] = getReimbursementPDA(
            treasuryPDA,
            publicKey,
            recordId,
          )

          const tx = await program.methods
            .submitReimbursement(
              new anchor.BN(recordId.toString()),
              new anchor.BN(tokenAmount),
              action.description.trim(),
            )
            .accountsStrict({
              employee: publicKey,
              treasury: treasuryPDA,
              reimbursement: reimbPda,
              clock: SYSVAR_CLOCK_PUBKEY,
              systemProgram: SystemProgram.programId,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
            { skipPreflight: true },
          )
          await queryClient.invalidateQueries({
            queryKey: ['reimbursements'],
          })
          return sig
        }

        case 'approve_reimbursement': {
          if (!action.targetId)
            throw new Error('Missing reimbursement target ID')
          const reimbPk = new PublicKey(action.targetId)
          const reimbAccount =
            await program.account.reimbursement.fetch(reimbPk)
          const [employeeInfoPda] = getEmployeePDA(
            treasuryPDA,
            reimbAccount.employee,
          )

          const tx = await program.methods
            .approveReimbursement()
            .accountsStrict({
              admin: publicKey,
              treasury: treasuryPDA,
              reimbursement: reimbPk,
              employeeInfo: employeeInfoPda,
              clock: SYSVAR_CLOCK_PUBKEY,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
          )
          await queryClient.invalidateQueries({
            queryKey: ['reimbursements'],
          })
          await queryClient.invalidateQueries({ queryKey: ['employees'] })
          return sig
        }

        case 'reject_reimbursement': {
          if (!action.targetId)
            throw new Error('Missing reimbursement target ID')
          const reimbPk = new PublicKey(action.targetId)

          const tx = await program.methods
            .rejectReimbursement()
            .accountsStrict({
              admin: publicKey,
              treasury: treasuryPDA,
              reimbursement: reimbPk,
              clock: SYSVAR_CLOCK_PUBKEY,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
          )
          await queryClient.invalidateQueries({
            queryKey: ['reimbursements'],
          })
          return sig
        }

        case 'add_contact': {
          if (!action.contactAddress) throw new Error('Missing contact address')
          if (!action.contactName?.trim())
            throw new Error('Missing contact name')

          const contactAddrPk = new PublicKey(action.contactAddress)
          const [contactPda] = getContactPDA(publicKey, contactAddrPk)

          const tx = await program.methods
            .addContact(contactAddrPk, action.contactName.trim())
            .accountsStrict({
              owner: publicKey,
              contact: contactPda,
              systemProgram: SystemProgram.programId,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
          )
          await queryClient.invalidateQueries({
            queryKey: ['contacts'],
          })
          return sig
        }

        case 'remove_contact': {
          if (!action.contactAddress) throw new Error('Missing contact address')

          const rmContactPk = new PublicKey(action.contactAddress)
          const [rmContactPda] = getContactPDA(publicKey, rmContactPk)

          const tx = await program.methods
            .removeContact(rmContactPk)
            .accountsStrict({
              owner: publicKey,
              contact: rmContactPda,
            })
            .transaction()

          const sig = await signAndSend(
            tx,
            publicKey,
            connection,
            sendTransaction,
          )
          await queryClient.invalidateQueries({
            queryKey: ['contacts'],
          })
          return sig
        }

        default:
          throw new Error(`Unknown action: ${action.action}`)
      }
    },
    [
      publicKey,
      connection,
      sendTransaction,
      program,
      treasury,
      treasuryPDA,
      vaultPDA,
      queryClient,
    ],
  )

  return { executeAction }
}
