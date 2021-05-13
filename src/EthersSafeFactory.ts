import { Contract, Signer, Event, ethers } from 'ethers'
import GnosisSafeProxyFactory from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json'
import GnosisSafe from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json'
import Safe from 'Safe'
import { EMPTY_DATA, ZERO_ADDRESS } from './utils/constants'
import EthersSafe from './EthersSafe'

interface SafeProxyFactoryConfigurationSimple {
  proxyFactoryAddress: string
  safeSingletonAddress: string
  data?: string
}

interface SafeProxyFactoryConfigurationExtended extends SafeProxyFactoryConfigurationSimple {
  nonce: number
  callbackAddress?: string
}

export type SafeProxyFactoryConfiguration =
  | SafeProxyFactoryConfigurationSimple
  | SafeProxyFactoryConfigurationExtended

interface SafeAccountConfiguration {
  owners: string[]
  threshold?: number
  to?: string
  data?: string
  fallbackHandler?: string
  paymentToken?: string
  payment?: number
  paymentReceiver?: string
}

class EthersSafeFactory {
  #safeProxyConfiguration!: SafeProxyFactoryConfiguration
  #signer!: Signer

  constructor(signer: Signer, safeProxyConfiguration: SafeProxyFactoryConfiguration) {
    this.#safeProxyConfiguration = safeProxyConfiguration
    this.#signer = signer
  }

  async createSafe(safeAccountConfiguration: SafeAccountConfiguration): Promise<Safe> {
    const { proxyFactoryAddress, safeSingletonAddress } = this.#safeProxyConfiguration
    if (!this.#signer.provider) {
      throw new Error('Signer must be connected to a provider')
    }
    const proxyFactoryContractCode = await this.#signer.provider.getCode(proxyFactoryAddress)
    if (proxyFactoryContractCode === EMPTY_DATA) {
      throw new Error('ProxyFactory contract is not deployed in the current network')
    }

    const safeSingletonContractCode = await this.#signer.provider.getCode(safeSingletonAddress)
    if (safeSingletonContractCode === EMPTY_DATA) {
      throw new Error('SafeSingleton contract is not deployed in the current network')
    }

    const { owners } = safeAccountConfiguration
    const {
      threshold = owners.length,
      to = ZERO_ADDRESS,
      data = EMPTY_DATA,
      fallbackHandler = ZERO_ADDRESS,
      paymentToken = ZERO_ADDRESS,
      payment = 0,
      paymentReceiver = ZERO_ADDRESS
    } = safeAccountConfiguration
    if (threshold <= 0) {
      throw new Error('Invalid threshold: it must be greater than or equal to 0')
    }
    if (threshold > owners.length) {
      throw new Error('Invalid threshold: it must be lower than or equal to owners length')
    }

    let createProxyTx = await this.createProxyTransaction()

    const receipt = await createProxyTx.wait()
    const proxyAddress = receipt.events.find((e: Event) => e.event === 'ProxyCreation').args[0]

    const gnosisSafe = new Contract(proxyAddress, GnosisSafe.abi, this.#signer)
    await gnosisSafe.setup(
      owners,
      threshold,
      to,
      data,
      fallbackHandler,
      paymentToken,
      payment,
      paymentReceiver
    )
    return await EthersSafe.create(ethers, gnosisSafe.address, this.#signer)
  }

  private async createProxyTransaction() {
    const {
      proxyFactoryAddress,
      safeSingletonAddress,
      data = EMPTY_DATA,
      nonce,
      callbackAddress
    } = this.#safeProxyConfiguration as SafeProxyFactoryConfigurationExtended
    const proxyFactory = new Contract(proxyFactoryAddress, GnosisSafeProxyFactory.abi, this.#signer)
    if (callbackAddress && nonce) {
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
}

export default EthersSafeFactory
