// @ts-nocheck — Hardhat ethers helpers are partially typed vs. strict TS
import { expect } from 'chai'
import { parseEther } from 'ethers'
import hre from 'hardhat'

async function getSigners() {
  return hre.ethers.getSigners()
}

describe('BeamFinance', () => {
  it('exposes VERSION', async () => {
    const Beam = await hre.ethers.getContractFactory('BeamFinance')
    const beam = await Beam.deploy(false, [])
    await beam.waitForDeployment()
    expect(await beam.VERSION()).to.equal('0.1.0-evm')
  })

  it('runs treasury, reimbursement, payroll, and transfers', async () => {
    const [admin, employee, outsider] = await getSigners()
    const Token = await hre.ethers.getContractFactory('MockERC20')
    const token = await Token.deploy('Mock', 'MOCK')
    await token.waitForDeployment()
    const tokenAddr = await token.getAddress()

    const Beam = await hre.ethers.getContractFactory('BeamFinance')
    const beam = await Beam.deploy(false, [])
    await beam.waitForDeployment()
    const beamAddr = await beam.getAddress()

    await beam.connect(admin).createTreasury('Acme Corp', tokenAddr)

    const mintAmount = parseEther('10000')
    await token.mint(admin.address, mintAmount)
    await token.connect(admin).approve(beamAddr, mintAmount)
    await beam.connect(admin).depositToTreasury(parseEther('5000'))

    await beam
      .connect(admin)
      .addEmployee(employee.address, 'Pat', 'Eng', 'Dev', parseEther('100'))

    const recordId = 1n
    await beam
      .connect(employee)
      .submitReimbursement(admin.address, recordId, parseEther('50'), 'Flight')

    await beam.connect(admin).approveReimbursement(employee.address, recordId)

    const payId = 2n
    await beam.connect(admin).paySalary(employee.address, payId, 'Jan payroll')

    const bal = await token.balanceOf(employee.address)
    expect(bal).to.equal(parseEther('150'))

    await token.mint(employee.address, parseEther('1000'))
    await token.connect(employee).approve(beamAddr, parseEther('10'))
    const p2pId = 3n
    await beam
      .connect(employee)
      .transferP2p(
        admin.address,
        outsider.address,
        p2pId,
        parseEther('10'),
        'lunch',
      )
    expect(await token.balanceOf(outsider.address)).to.equal(parseEther('10'))

    const outId = 4n
    await beam
      .connect(admin)
      .transferFromTreasury(outsider.address, outId, parseEther('5'), 'bonus')
    expect(await token.balanceOf(outsider.address)).to.equal(parseEther('15'))
  })

  it('rejects reimbursement and enforces whitelist', async () => {
    const [admin, employee] = await getSigners()
    const Token = await hre.ethers.getContractFactory('MockERC20')
    const token = await Token.deploy('Mock', 'MOCK')
    await token.waitForDeployment()

    const Beam = await hre.ethers.getContractFactory('BeamFinance')
    const beam = await Beam.deploy(true, [admin.address])
    await beam.waitForDeployment()

    await expect(
      beam.connect(employee).createTreasury('X', await token.getAddress()),
    ).to.be.revertedWith('NotWhitelistedAdmin')

    await beam.connect(admin).createTreasury('Y', await token.getAddress())
    await beam.connect(admin).addEmployee(employee.address, 'A', 'B', 'C', 1n)

    const rid = 99n
    await beam
      .connect(employee)
      .submitReimbursement(admin.address, rid, 100n, 'x')
    await beam.connect(admin).rejectReimbursement(employee.address, rid)

    const rk = await beam.reimbursementKey(admin.address, employee.address, rid)
    const r = await beam.reimbursements(rk)
    expect(r.status).to.equal(2)
  })

  it('stores contacts and lists keys', async () => {
    const [alice, bob] = await getSigners()
    const Beam = await hre.ethers.getContractFactory('BeamFinance')
    const beam = await Beam.deploy(false, [])
    await beam.waitForDeployment()

    await beam.connect(alice).addContact(bob.address, 'Bob Wallet')
    const ck = await beam.contactKey(alice.address, bob.address)
    const keys = await beam.getContactKeys(alice.address)
    expect(keys.length).to.equal(1)
    expect(keys[0]).to.equal(ck)
    const c = await beam.contacts(ck)
    expect(c.exists).to.equal(true)
    expect(c.addr).to.equal(bob.address)
    expect(c.name).to.equal('Bob Wallet')

    await beam.connect(alice).removeContact(bob.address)
    expect((await beam.getContactKeys(alice.address)).length).to.equal(0)
    expect((await beam.contacts(ck)).exists).to.equal(false)
  })

  it('closes treasury and drains vault', async () => {
    const [admin] = await getSigners()
    const Token = await hre.ethers.getContractFactory('MockERC20')
    const token = await Token.deploy('Mock', 'MOCK')
    await token.waitForDeployment()
    const Beam = await hre.ethers.getContractFactory('BeamFinance')
    const beam = await Beam.deploy(false, [])
    await beam.waitForDeployment()
    const beamAddr = await beam.getAddress()

    await beam.connect(admin).createTreasury('Z', await token.getAddress())
    await token.mint(admin.address, parseEther('100'))
    await token.connect(admin).approve(beamAddr, parseEther('100'))
    await beam.connect(admin).depositToTreasury(parseEther('100'))

    await beam.connect(admin).closeTreasury()
    expect(await token.balanceOf(admin.address)).to.equal(parseEther('100'))
    const t = await beam.treasuries(admin.address)
    expect(t.exists).to.equal(false)
  })

  it('rescues only unaccounted ERC20 tokens', async () => {
    const [owner, outsider] = await getSigners()
    const Token = await hre.ethers.getContractFactory('MockERC20')
    const token = await Token.deploy('Mock', 'MOCK')
    await token.waitForDeployment()
    const tokenAddr = await token.getAddress()

    const Beam = await hre.ethers.getContractFactory('BeamFinance')
    const beam = await Beam.deploy(false, [])
    await beam.waitForDeployment()
    const beamAddr = await beam.getAddress()

    await token.mint(owner.address, parseEther('100'))
    await token.connect(owner).transfer(beamAddr, parseEther('25'))

    await expect(
      beam
        .connect(outsider)
        .rescueUnaccountedTokens(tokenAddr, outsider.address, parseEther('25')),
    ).to.be.reverted

    await beam
      .connect(owner)
      .rescueUnaccountedTokens(tokenAddr, outsider.address, parseEther('25'))
    expect(await token.balanceOf(outsider.address)).to.equal(parseEther('25'))
  })
})
