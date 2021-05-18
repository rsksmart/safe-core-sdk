import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { BigNumber } from 'ethers'
import { deployments, ethers, waffle } from 'hardhat'
import EthersSafe, { SafeTransaction } from '../src'
import RawTransactionBuilder from '../src/transactions/RawTransactionBuilder'
import { EMPTY_DATA } from '../src/utils/constants'
import { balanceVerifierFactory, getSafeWithOwners } from './utils/setup'
chai.use(chaiAsPromised)

describe('Raw transaction builder', () => {
  const [user1, user2, user3] = waffle.provider.getWallets()

  const accountBalanceVerifier = async (accountAddress: string) => {
    const balanceVerifier = balanceVerifierFactory((addr) => waffle.provider.getBalance(addr))
    return balanceVerifier(accountAddress)
  }

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture()
    const safe = await getSafeWithOwners([user1.address, user2.address])
    // Fill the balance the safe account
    await user1.sendTransaction({
      to: safe.address,
      value: BigNumber.from('1000000000000000000')
    })
    const safeSdk = await EthersSafe.create(ethers, safe.address, user1)
    const transactionBuilder = new RawTransactionBuilder(safeSdk)

    const signAndExecuteTx = async (safeERC20: EthersSafe, safeTransaction: SafeTransaction) => {
      await safeERC20.signTransaction(safeTransaction)

      const safeSDk2 = await safeERC20.connect(user2)
      const txResponse = await safeSDk2.executeTransaction(safeTransaction)
      await txResponse.wait()
    }

    return {
      safeSdk,
      transactionBuilder,
      signAndExecuteTx
    }
  })

  it('should create a valid safe transaction', async () => {
    const { safeSdk, transactionBuilder, signAndExecuteTx } = await setupTests()

    const balanceVerifier = await accountBalanceVerifier(user3.address)
    const expectedTransfer = 123456
    const safeTx = await transactionBuilder.rawTransaction(
      user3.address,
      expectedTransfer.toString(),
      EMPTY_DATA
    )

    await signAndExecuteTx(safeSdk, safeTx)
    expect(await balanceVerifier(expectedTransfer)).to.be.true
  })
})
