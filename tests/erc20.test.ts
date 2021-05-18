import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { BigNumber } from 'ethers'
import { deployments, ethers, waffle } from 'hardhat'
import EthersSafe, { ERC20TransactionBuilder, SafeTransaction } from '../src'
import { getSafeWithOwners, balanceVerifierFactory } from './utils/setup'
chai.use(chaiAsPromised)

describe('ERC20 transaction builder', () => {
  const [user1, user2, user3, user4] = waffle.provider.getWallets()

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture()
    const MockERC20Factory = await ethers.getContractFactory('MockERC20Token')
    const MockERC20Token = await MockERC20Factory.deploy()
    await MockERC20Token.deployed()
    const safe = await getSafeWithOwners([user1.address, user2.address])
    const ethersSafe = await EthersSafe.create(ethers, safe.address, user1)
    const erc20TransactionBuilder = new ERC20TransactionBuilder(ethersSafe, MockERC20Token)

    const signAndExecuteTx = async (safeERC20: EthersSafe, safeTransaction: SafeTransaction) => {
      await safeERC20.signTransaction(safeTransaction)

      const safeSDk2 = await safeERC20.connect(user2)
      const txResponse = await safeSDk2.executeTransaction(safeTransaction)
      await txResponse.wait()
    }

    const accountBalanceVerifier = async (accountAddress: string) => {
      const balanceVerifier = balanceVerifierFactory((addr) => MockERC20Token.balanceOf(addr))
      return await balanceVerifier(accountAddress)
    }

    return {
      ethersSafe,
      erc20TransactionBuilder,
      MockERC20Token,
      signAndExecuteTx,
      accountBalanceVerifier
    }
  })

  it('should create a Safe ERC20 transfer transaction', async () => {
    const {
      ethersSafe,
      MockERC20Token,
      erc20TransactionBuilder,
      signAndExecuteTx,
      accountBalanceVerifier
    } = await setupTests()
    const balanceVerifier = await accountBalanceVerifier(user3.address)

    const expectedTransfer = 123456
    await MockERC20Token.transfer(ethersSafe.getAddress(), 1_000_000)
    const safeTransaction = await erc20TransactionBuilder.transfer(
      user3.address,
      BigNumber.from(expectedTransfer)
    )
    await signAndExecuteTx(ethersSafe, safeTransaction)

    expect(await balanceVerifier(expectedTransfer)).to.be.true
  })

  it('should create a Safe ERC20 transferFrom transaction', async () => {
    const {
      ethersSafe,
      MockERC20Token,
      erc20TransactionBuilder,
      signAndExecuteTx,
      accountBalanceVerifier
    } = await setupTests()

    const from = user3.address
    const to = user4.address

    const balanceVerifier = await accountBalanceVerifier(to)
    // fill account 3 balance and give safe the required permissions
    await MockERC20Token.transfer(from, 1_000_000)
    const fromToken = await MockERC20Token.connect(user3)
    await fromToken.approve(ethersSafe.getAddress(), 1_000_000)

    await MockERC20Token.transfer(ethersSafe.getAddress(), 1_000_000)
    const expectedTransfer = 123456
    const safeTransaction = await erc20TransactionBuilder.transferFrom(
      from,
      to,
      BigNumber.from(expectedTransfer)
    )

    await signAndExecuteTx(ethersSafe, safeTransaction)

    expect(await balanceVerifier(expectedTransfer)).to.be.true
  })

  it('should create a Safe ERC20 approve transaction', async () => {
    const {
      ethersSafe,
      MockERC20Token,
      erc20TransactionBuilder,
      signAndExecuteTx
    } = await setupTests()

    await MockERC20Token.transfer(ethersSafe.getAddress(), 1_000_000)

    const safeAllowanceBefore = await MockERC20Token.allowance(
      user3.address,
      ethersSafe.getAddress()
    )
    expect(safeAllowanceBefore).to.eq(0)
    const expectedAllowance = BigNumber.from(1_000_000)

    const safeTransaction = await erc20TransactionBuilder.approve(user3.address, expectedAllowance)

    await signAndExecuteTx(ethersSafe, safeTransaction)

    const safeAllowanceAfter = await MockERC20Token.allowance(
      ethersSafe.getAddress(),
      user3.address
    )
    expect(safeAllowanceAfter.eq(expectedAllowance)).to.be.true
  })
})
