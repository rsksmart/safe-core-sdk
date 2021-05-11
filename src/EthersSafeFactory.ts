import { Contract, ContractFactory, Signer, Event, ethers } from 'ethers'
import GnosisSafeProxyFactory from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json'
import GnosisSafe from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json'
import Safe from 'Safe'
import { ZERO_ADDRESS } from './utils/constants'
import EthersSafe from './EthersSafe'

class EthersSafeFactory {
  static async createSafe(
    safeSingletonAddress: string,
    signer: Signer,
    owners: string[],
    threshold?: number
  ): Promise<Safe> {
    if (threshold === undefined) {
      threshold = owners.length
    }
    if (threshold <= 0) {
      throw new Error('Invalid threshold: it must be greater than or equal to 0')
    }
    if (threshold > owners.length) {
      throw new Error('Invalid threshold: it must be lower than or equal to owners length')
    }
    const proxyFactoryFactory = new ContractFactory(
      GnosisSafeProxyFactory.abi,
      GnosisSafeProxyFactory.bytecode,
      signer
    )
    const proxyFactory = await proxyFactoryFactory.deploy()
    const createProxyTx = await proxyFactory.createProxy(safeSingletonAddress, '0x')
    const receipt = await createProxyTx.wait()
    const proxyAddress = receipt.events.find((e: Event) => e.event === 'ProxyCreation').args[0]

    const gnosisSafe = new Contract(proxyAddress, GnosisSafe.abi, signer)
    await gnosisSafe.setup(
      owners,
      threshold,
      ZERO_ADDRESS,
      '0x',
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      0,
      ZERO_ADDRESS
    )
    return await EthersSafe.create(ethers, gnosisSafe.address, signer)
  }
}

export default EthersSafeFactory
