import { PublicKey } from '@solana/web3.js'
import {
  CONTACT_SEED,
  EMPLOYEE_SEED,
  PAYROLL_SEED,
  PROGRAM_ID,
  REIMBURSEMENT_SEED,
  TRANSFER_SEED,
  TREASURY_SEED,
  VAULT_SEED,
} from './constants'

function u64ToLeBytes(value: bigint | number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(value), true)
  return new Uint8Array(buf)
}

export function createRecordId(): bigint {
  return BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000))
}

export function getTreasuryPDA(admin: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [TREASURY_SEED, admin.toBuffer()],
    PROGRAM_ID,
  )
}

export function getEmployeePDA(treasury: PublicKey, employee: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [EMPLOYEE_SEED, treasury.toBuffer(), employee.toBuffer()],
    PROGRAM_ID,
  )
}

export function getVaultPDA(treasury: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, treasury.toBuffer()],
    PROGRAM_ID,
  )
}

export function getPayrollPDA(
  treasury: PublicKey,
  employee: PublicKey,
  recordId: bigint | number,
) {
  return PublicKey.findProgramAddressSync(
    [
      PAYROLL_SEED,
      treasury.toBuffer(),
      employee.toBuffer(),
      u64ToLeBytes(recordId),
    ],
    PROGRAM_ID,
  )
}

export function getReimbursementPDA(
  treasury: PublicKey,
  employee: PublicKey,
  recordId: bigint | number,
) {
  return PublicKey.findProgramAddressSync(
    [
      REIMBURSEMENT_SEED,
      treasury.toBuffer(),
      employee.toBuffer(),
      u64ToLeBytes(recordId),
    ],
    PROGRAM_ID,
  )
}

export function getTransferPDA(
  treasury: PublicKey,
  sender: PublicKey,
  recordId: bigint | number,
) {
  return PublicKey.findProgramAddressSync(
    [
      TRANSFER_SEED,
      treasury.toBuffer(),
      sender.toBuffer(),
      u64ToLeBytes(recordId),
    ],
    PROGRAM_ID,
  )
}

export function getContactPDA(owner: PublicKey, address: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [CONTACT_SEED, owner.toBuffer(), address.toBuffer()],
    PROGRAM_ID,
  )
}
