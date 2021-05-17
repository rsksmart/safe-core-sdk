import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Signer } from 'ethers'
import { deployments, waffle } from 'hardhat'
import EthersSafeFactory from '../src/EthersSafeFactory'
chai.use(chaiAsPromised)

describe('Safe creation', () => {
  const [user1, user2, user3] = waffle.provider.getWallets()

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture()
    const SafeDeployment = await deployments.get('GnosisSafe')
    const FactoryDeployment = await deployments.get('GnosisSafeProxyFactory')
    return {
      safeSingletonAddress: SafeDeployment.address,
      proxyFactoryAddress: FactoryDeployment.address
    }
  })

  const verifyOwnersAndThreshold = async (safeSdk: any, owners: string[], threshold?: number) => {
    if (!threshold) {
      threshold = owners.length
    }
    const retrievedOwners: string[] = await safeSdk.getOwners()
    const retrievedThreshold: number = await safeSdk.getThreshold()
    chai.expect(retrievedOwners).to.deep.equal(owners)
    chai.expect(retrievedThreshold).to.equal(threshold)
  }

  describe('EthersSafeFactory.create', () => {
    const owners: string[] = [user1.address, user2.address, user3.address]
    let safeSingletonAddress: string
    let proxyFactoryAddress: string

    beforeEach(async () => {
      ;({ safeSingletonAddress, proxyFactoryAddress } = await setupTests())
    })

    it('should fail if the signer is not connected to a provider', async () => {
      // Used to mock a signer without provider
      const mockedSigner = {}
      await chai
        .expect(
          () => new EthersSafeFactory(
            mockedSigner as Signer,
            proxyFactoryAddress,
            safeSingletonAddress
          )
        )
        .throws('Signer must be connected to a provider')
    })

    it('should fail if the proxyFactoryAddress is not valid', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        '0x0DA0C3e52C977Ed3cBc641fF02DD271c3ED55aFe',
        safeSingletonAddress
      )
      await chai
        .expect(
          ethersSafeFactory.createSafe({
            owners,
            threshold: -1
          })
        )
        .rejectedWith('ProxyFactory contract is not deployed in the current network')
    })

    it('should fail if the safeSingletonAddress is not valid', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        '0x0DA0C3e52C977Ed3cBc641fF02DD271c3ED55aFe'
      )
      await chai
        .expect(
          ethersSafeFactory.createSafe({
            owners,
            threshold: -1
          })
        )
        .rejectedWith('SafeSingleton contract is not deployed in the current network')
    })

    it('should fail if the threshold is less than or equal to zero', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        safeSingletonAddress
      )
      await chai
        .expect(
          ethersSafeFactory.createSafe({
            owners,
            threshold: -1
          })
        )
        .rejectedWith('Invalid threshold: it must be greater than or equal to')
    })

    it('should fail if the threshold is greater than the owners length', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        safeSingletonAddress
      )
      await chai
        .expect(
          ethersSafeFactory.createSafe({
            owners,
            threshold: 4
          })
        )
        .rejectedWith('Invalid threshold: it must be lower than or equal to owners length')
    })

    it('should successfully create a safeSDK instance if the threshold is set properly', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        safeSingletonAddress
      )
      const expectedThreshold = 2
      const safeSdk = await ethersSafeFactory.createSafe({
        owners,
        threshold: expectedThreshold
      })
      await verifyOwnersAndThreshold(safeSdk, owners, expectedThreshold)
    })

    it('should successfully create a safeSDK instance if the threshold is not set', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        safeSingletonAddress
      )
      const safeSdk = await ethersSafeFactory.createSafe({ owners })
      await verifyOwnersAndThreshold(safeSdk, owners)
    })
    it('should successfully create a safeSDK instance with nonce', async () => {
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        safeSingletonAddress
      )
      const safeSdk = await ethersSafeFactory.createSafe({ owners }, { nonce: 123456 })
      await verifyOwnersAndThreshold(safeSdk, owners)
    })

    it('should successfully create a safeSDK instance with callback and nonce', async () => {
      const proxyCreationCallback = await deployments.get('MockProxyCreationCallback')
      const ethersSafeFactory = new EthersSafeFactory(
        user1,
        proxyFactoryAddress,
        safeSingletonAddress
      )
      const safeSdk = await ethersSafeFactory.createSafe(
        { owners },
        {
          nonce: 123456,
          callbackAddress: proxyCreationCallback.address
        }
      )
      await verifyOwnersAndThreshold(safeSdk, owners)
    })
  })
})
