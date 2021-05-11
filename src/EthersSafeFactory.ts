import { Contract, ContractFactory, Signer, Event, ethers, Transaction } from 'ethers'
import GnosisSafeProxyFactory from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json'
import GnosisSafe from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json'
import Safe from 'Safe'
import { EMPTY_DATA, ZERO_ADDRESS } from './utils/constants'
import EthersSafe from './EthersSafe'

interface SafeProxyFactoryConfig {
  safeSingletonAddress: string
  data?: string
  nonce?: number
  callbackAddress?: string
}

interface SafeConfiguration {
  signer: Signer
  owners: string[]
  threshold?: number
}

class EthersSafeFactory {
  static async createSafe(
    safeProxyConfiguration: SafeProxyFactoryConfig | string,
    safeConfiguration: SafeConfiguration
  ): Promise<Safe> {
    const { signer, owners } = safeConfiguration
    const { threshold = owners.length } = safeConfiguration
    if (threshold <= 0) {
      throw new Error('Invalid threshold: it must be greater than or equal to 0')
    }
    if (threshold > owners.length) {
      throw new Error('Invalid threshold: it must be lower than or equal to owners length')
    }

    let createProxyTx = await EthersSafeFactory.createProxyTransaction(
      safeProxyConfiguration,
      signer
    )

    const receipt = await createProxyTx.wait()
    const proxyAddress = receipt.events.find((e: Event) => e.event === 'ProxyCreation').args[0]

    const gnosisSafe = new Contract(proxyAddress, GnosisSafe.abi, signer)
    await gnosisSafe.setup(
      owners,
      threshold,
      ZERO_ADDRESS,
      EMPTY_DATA,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      0,
      ZERO_ADDRESS
    )
    return await EthersSafe.create(ethers, gnosisSafe.address, signer)
  }

  private static async createProxyTransactionFromConfiguration(
    proxyConfiguration: SafeProxyFactoryConfig,
    signer: Signer
  ) {
    const proxyFactoryFactory = new ContractFactory(
      GnosisSafeProxyFactory.abi,
      GnosisSafeProxyFactory.bytecode,
      signer
    )
    const proxyFactory = await proxyFactoryFactory.deploy()
    const { safeSingletonAddress, data = EMPTY_DATA, nonce, callbackAddress } = proxyConfiguration
    if (callbackAddress) {
      return await proxyFactory.createProxyWithCallback(
        safeSingletonAddress,
        data,
        nonce,
        callbackAddress
      )
    } else if (nonce) {
      return await proxyFactory.createProxyWithNonce(safeSingletonAddress, data, nonce)
    } else {
      return await proxyFactory.createProxy(safeSingletonAddress, data)
    }
  }

  private static async createProxyTransaction(
    safeProxyConfiguration: string | SafeProxyFactoryConfig,
    signer: Signer
  ) {
    if (typeof safeProxyConfiguration === 'string') {
      return await EthersSafeFactory.createProxyTransactionFromConfiguration(
        { safeSingletonAddress: safeProxyConfiguration },
        signer
      )
    } else {
      return await EthersSafeFactory.createProxyTransactionFromConfiguration(
        safeProxyConfiguration,
        signer
      )
    }
  }
}

export default EthersSafeFactory
