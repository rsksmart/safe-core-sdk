import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { BigNumber } from 'ethers'
import { deployments, ethers, waffle } from 'hardhat'
import EthersSafe from '../src'
import EthersSafeFactory from '../src/EthersSafeFactory'

import { getSafeWithOwners } from './utils/setup'
chai.use(chaiAsPromised)

describe('Safe creation', () => {
  const [user1, user2, user3] = waffle.provider.getWallets()

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture()
    const SafeDeployment = await deployments.get('GnosisSafe')
    return {
      safeSingletonAddress: SafeDeployment.address
    }
  })

  describe('EthersSafeFactory.create', () => {
    const owners = [user1.address, user2.address, user3.address]

    it('should fail if the threshold is less than or equal to zero', async () => {
      const { safeSingletonAddress } = await setupTests()
      await chai
        .expect(EthersSafeFactory.createSafe(safeSingletonAddress, user1, owners, -1))
        .rejectedWith('Invalid threshold: it must be greater than or equal to')
    })

    it('should fail if the threshold is greater than the owners length', async () => {
      const { safeSingletonAddress } = await setupTests()
      await chai
        .expect(EthersSafeFactory.createSafe(safeSingletonAddress, user1, owners, 4))
        .rejectedWith('Invalid threshold: it must be lower than or equal to owners length')
    })

    it('should successfully create a safeSDK instance if the threshold is set properly', async () => {
      const { safeSingletonAddress } = await setupTests()
      const safeSdk = await EthersSafeFactory.createSafe(safeSingletonAddress, user1, owners, 2)
      chai.expect(safeSdk).not.to.be.undefined
    })

    it('should successfully create a safeSDK instance if the threshold is not set', async () => {
      const { safeSingletonAddress } = await setupTests()
      const safeSdk = await EthersSafeFactory.createSafe(safeSingletonAddress, user1, owners)
      chai.expect(safeSdk).not.to.be.undefined
    })
  })
})
