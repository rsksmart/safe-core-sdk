import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { deployments, ethers } from 'hardhat'
import EthersSafe from '../src'
import { getAccounts } from './utils/setupConfig'
import { getSafeWithOwners } from './utils/setupContracts'
chai.use(chaiAsPromised)

describe('Safe Threshold', () => {
  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture()
    const accounts = await getAccounts()
    return {
      safe: await getSafeWithOwners([accounts[0].address]),
      accounts
    }
  })

  describe('getThreshold', async () => {
    it('should return the Safe threshold', async () => {
      const { safe, accounts } = await setupTests()
      const [account1] = accounts
      const safeSdk = await EthersSafe.create(ethers, safe.address, account1.signer)
      chai.expect(await safeSdk.getThreshold()).to.be.eq(1)
    })
  })

  describe('getChangeThresholdTx', async () => {
    it('should fail if the threshold is bigger than the number of owners', async () => {
      const { safe, accounts } = await setupTests()
      const [account1] = accounts
      const safeSdk = await EthersSafe.create(ethers, safe.address, account1.signer)
      const newThreshold = 2
      const numOwners = (await safeSdk.getOwners()).length
      chai.expect(newThreshold).to.be.gt(numOwners)
      await chai
        .expect(safeSdk.getChangeThresholdTx(newThreshold))
        .to.be.rejectedWith('Threshold cannot exceed owner count')
    })

    it('should fail if the threshold is not bigger than 0', async () => {
      const { safe, accounts } = await setupTests()
      const [account1] = accounts
      const safeSdk = await EthersSafe.create(ethers, safe.address, account1.signer)
      const newThreshold = 0
      await chai
        .expect(safeSdk.getChangeThresholdTx(newThreshold))
        .to.be.rejectedWith('Threshold needs to be greater than 0')
    })

    it('should change the threshold', async () => {
      const { accounts } = await setupTests()
      const [account1, account2] = accounts
      const safe = await getSafeWithOwners([account1.address, account2.address], 1)
      const safeSdk = await EthersSafe.create(ethers, safe.address, account1.signer)
      const newThreshold = 2
      chai.expect(await safeSdk.getThreshold()).to.be.not.eq(newThreshold)
      const tx = await safeSdk.getChangeThresholdTx(newThreshold)
      const txResponse = await safeSdk.executeTransaction(tx)
      await txResponse.wait()
      chai.expect(await safeSdk.getThreshold()).to.be.eq(newThreshold)
    })
  })
})
