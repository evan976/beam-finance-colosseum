import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import { expect } from 'chai'
import type { Beam } from '../target/types/beam'

describe('beam', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.beam as Program<Beam>
  const methods = program.methods!
  const acct = program.account!
  const admin = provider.wallet

  const employee1 = Keypair.generate()
  const employee2 = Keypair.generate()

  let tokenMint: PublicKey
  let treasuryPda: PublicKey
  let vaultPda: PublicKey

  let recordId = 0
  const nextRecordId = () => new anchor.BN(++recordId)

  before(async () => {
    ;[treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), admin.publicKey.toBuffer()],
      program.programId,
    )
    ;[vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), treasuryPda.toBuffer()],
      program.programId,
    )

    for (const kp of [employee1, employee2]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        5 * LAMPORTS_PER_SOL,
      )
      await provider.connection.confirmTransaction(sig)
    }

    tokenMint = await createMint(
      provider.connection,
      (admin as any).payer,
      admin.publicKey,
      null,
      6,
    )
  })

  function employeePda(wallet: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('employee'), treasuryPda.toBuffer(), wallet.toBuffer()],
      program.programId,
    )
    return pda
  }

  it('creates a treasury', async () => {
    await methods
      .createTreasury('Beam Corp')
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        vault: vaultPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const treasury = await acct.treasury!.fetch(treasuryPda)
    expect(treasury.name).to.equal('Beam Corp')
    expect(treasury.admin.toBase58()).to.equal(admin.publicKey.toBase58())
    expect(treasury.tokenMint.toBase58()).to.equal(tokenMint.toBase58())
    expect(treasury.employees).to.have.length(0)
  })

  it('funds the treasury vault with tokens', async () => {
    const fundAmount = 1_000_000_000

    await mintTo(
      provider.connection,
      (admin as any).payer,
      tokenMint,
      vaultPda,
      admin.publicKey,
      fundAmount,
    )

    const balance = await provider.connection.getTokenAccountBalance(vaultPda)
    expect(Number(balance.value.amount)).to.equal(fundAmount)
  })

  it('adds employees', async () => {
    await methods
      .addEmployee(
        employee1.publicKey,
        'Alice',
        'Engineering',
        'Developer',
        new anchor.BN(100_000_000),
      )
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        employeeInfo: employeePda(employee1.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    await methods
      .addEmployee(
        employee2.publicKey,
        'Bob',
        'Design',
        'Designer',
        new anchor.BN(80_000_000),
      )
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        employeeInfo: employeePda(employee2.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const treasury = await acct.treasury!.fetch(treasuryPda)
    expect(treasury.employees).to.have.length(2)

    const emp1 = await acct.employee!.fetch(employeePda(employee1.publicKey))
    expect(emp1.name).to.equal('Alice')
    expect(emp1.baseSalary.toNumber()).to.equal(100_000_000)
  })

  it('prevents duplicate employee', async () => {
    try {
      await methods
        .addEmployee(
          employee1.publicKey,
          'Alice',
          'Engineering',
          'Developer',
          new anchor.BN(100_000_000),
        )
        .accountsStrict({
          admin: admin.publicKey,
          treasury: treasuryPda,
          employeeInfo: employeePda(employee1.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err).to.exist
    }
  })

  it('pays salary from treasury', async () => {
    const rid = nextRecordId()
    const emp1Ata = getAssociatedTokenAddressSync(
      tokenMint,
      employee1.publicKey,
    )

    const [payrollPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('payroll'),
        treasuryPda.toBuffer(),
        employee1.publicKey.toBuffer(),
        rid.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId,
    )

    await methods
      .paySalary(rid, 'March salary')
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        vault: vaultPda,
        employee: employee1.publicKey,
        employeeInfo: employeePda(employee1.publicKey),
        employeeTokenAccount: emp1Ata,
        payroll: payrollPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const balance = await provider.connection.getTokenAccountBalance(emp1Ata)
    expect(Number(balance.value.amount)).to.equal(100_000_000)

    const payroll = await acct.payroll!.fetch(payrollPda)
    expect(payroll.memo).to.equal('March salary')
    expect(payroll.baseSalary.toNumber()).to.equal(100_000_000)
    expect(payroll.reimbursementAmount.toNumber()).to.equal(0)
  })

  it('employee submits reimbursement', async () => {
    const rid = nextRecordId()

    const [reimbursementPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('reimbursement'),
        treasuryPda.toBuffer(),
        employee1.publicKey.toBuffer(),
        rid.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId,
    )

    await methods
      .submitReimbursement(rid, new anchor.BN(10_000_000), 'Office supplies')
      .accountsStrict({
        employee: employee1.publicKey,
        treasury: treasuryPda,
        reimbursement: reimbursementPda,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .signers([employee1])
      .rpc()

    const reimb = await acct.reimbursement!.fetch(reimbursementPda)
    expect(reimb.status).to.equal(0)
    expect(reimb.description).to.equal('Office supplies')
    expect(reimb.amount.toNumber()).to.equal(10_000_000)
  })

  it('admin approves reimbursement', async () => {
    const reimbursements = await acct.reimbursement!.all([
      {
        memcmp: {
          offset: 8,
          bytes: employee1.publicKey.toBase58(),
        },
      },
    ])

    const pending = reimbursements.find((r) => r.account.status === 0)
    expect(pending).to.not.be.undefined

    await methods
      .approveReimbursement()
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        reimbursement: pending!.publicKey,
        employeeInfo: employeePda(employee1.publicKey),
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc()

    const reimb = await acct.reimbursement!.fetch(pending!.publicKey)
    expect(reimb.status).to.equal(1)

    const emp = await acct.employee!.fetch(employeePda(employee1.publicKey))
    expect(emp.pendingReimbursement.toNumber()).to.equal(10_000_000)
  })

  it('next salary includes reimbursement', async () => {
    const rid = nextRecordId()
    const emp1Ata = getAssociatedTokenAddressSync(
      tokenMint,
      employee1.publicKey,
    )

    const balanceBefore =
      await provider.connection.getTokenAccountBalance(emp1Ata)

    const [payrollPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('payroll'),
        treasuryPda.toBuffer(),
        employee1.publicKey.toBuffer(),
        rid.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId,
    )

    await methods
      .paySalary(rid, 'April salary + reimbursement')
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        vault: vaultPda,
        employee: employee1.publicKey,
        employeeInfo: employeePda(employee1.publicKey),
        employeeTokenAccount: emp1Ata,
        payroll: payrollPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const balanceAfter =
      await provider.connection.getTokenAccountBalance(emp1Ata)
    const paid =
      Number(balanceAfter.value.amount) - Number(balanceBefore.value.amount)
    expect(paid).to.equal(110_000_000)

    const payroll = await acct.payroll!.fetch(payrollPda)
    expect(payroll.baseSalary.toNumber()).to.equal(100_000_000)
    expect(payroll.reimbursementAmount.toNumber()).to.equal(10_000_000)

    const emp = await acct.employee!.fetch(employeePda(employee1.publicKey))
    expect(emp.pendingReimbursement.toNumber()).to.equal(0)
  })

  it('P2P transfer between employees', async () => {
    const rid = nextRecordId()
    const amount = new anchor.BN(5_000_000)

    const senderAta = getAssociatedTokenAddressSync(
      tokenMint,
      employee1.publicKey,
    )
    const recipientAta = getAssociatedTokenAddressSync(
      tokenMint,
      employee2.publicKey,
    )

    const [transferPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('transfer'),
        treasuryPda.toBuffer(),
        employee1.publicKey.toBuffer(),
        rid.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId,
    )

    await methods
      .transferP2P(rid, amount, 'Lunch money')
      .accountsStrict({
        sender: employee1.publicKey,
        recipient: employee2.publicKey,
        treasury: treasuryPda,
        senderTokenAccount: senderAta,
        recipientTokenAccount: recipientAta,
        transferRecord: transferPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .signers([employee1])
      .rpc()

    const balance =
      await provider.connection.getTokenAccountBalance(recipientAta)
    expect(Number(balance.value.amount)).to.equal(5_000_000)

    const record = await acct.transfer!.fetch(transferPda)
    expect(record.transferType).to.equal(1)
    expect(record.memo).to.equal('Lunch money')
  })

  it('removes an employee', async () => {
    await methods
      .removeEmployee(employee2.publicKey)
      .accountsStrict({
        admin: admin.publicKey,
        treasury: treasuryPda,
        employeeInfo: employeePda(employee2.publicKey),
      })
      .rpc()

    const treasury = await acct.treasury!.fetch(treasuryPda)
    expect(treasury.employees).to.have.length(1)
  })

  // --- Contact (Address Book) tests ---

  function contactPda(owner: PublicKey, address: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('contact'), owner.toBuffer(), address.toBuffer()],
      program.programId,
    )
    return pda
  }

  const contactAddress = Keypair.generate().publicKey

  it('adds a contact', async () => {
    const pda = contactPda(admin.publicKey, contactAddress)

    await methods
      .addContact(contactAddress, 'Binance')
      .accountsStrict({
        owner: admin.publicKey,
        contact: pda,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const contact = await acct.contact!.fetch(pda)
    expect(contact.owner.toBase58()).to.equal(admin.publicKey.toBase58())
    expect(contact.address.toBase58()).to.equal(contactAddress.toBase58())
    expect(contact.name).to.equal('Binance')
  })

  it('prevents duplicate contact', async () => {
    const pda = contactPda(admin.publicKey, contactAddress)

    try {
      await methods
        .addContact(contactAddress, 'Binance Dup')
        .accountsStrict({
          owner: admin.publicKey,
          contact: pda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err).to.exist
    }
  })

  it('removes a contact', async () => {
    const pda = contactPda(admin.publicKey, contactAddress)

    await methods
      .removeContact(contactAddress)
      .accountsStrict({
        owner: admin.publicKey,
        contact: pda,
      })
      .rpc()

    try {
      await acct.contact!.fetch(pda)
      expect.fail('Account should be closed')
    } catch (err: any) {
      expect(err.message).to.include('Account does not exist')
    }
  })

  it('rejects closing a non-record account through close_record', async () => {
    const address = Keypair.generate().publicKey
    const pda = contactPda(admin.publicKey, address)

    await methods
      .addContact(address, 'Protected Contact')
      .accountsStrict({
        owner: admin.publicKey,
        contact: pda,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    try {
      await methods
        .closeRecord()
        .accountsStrict({
          admin: admin.publicKey,
          treasury: treasuryPda,
          record: pda,
        })
        .rpc()
      expect.fail('Should have rejected the contact account')
    } catch (err: any) {
      expect(err).to.exist
    }

    const contact = await acct.contact!.fetch(pda)
    expect(contact.name).to.equal('Protected Contact')

    await methods
      .removeContact(address)
      .accountsStrict({
        owner: admin.publicKey,
        contact: pda,
      })
      .rpc()
  })
})
