import { Contract, Signer, Event, ethers } from 'ethers'
import GnosisSafeProxyFactory from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json'
import GnosisSafe from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json'
import Safe from './Safe'
import { EMPTY_DATA, ZERO_ADDRESS } from './utils/constants'
import { validateIsDeployedFactory } from './utils/contracts'
import EthersSafe from './EthersSafe'
import { Interface } from '@ethersproject/abi'

export interface DeploymentOptions {
  nonce?: number
  callbackAddress?: string
}

interface SafeAccountConfiguration {
  owners: string[]
  threshold: number
  to?: string
  data?: string
  fallbackHandler?: string
  paymentToken?: string
  payment?: number
  paymentReceiver?: string
}

class EthersSafeFactory {
  #signer!: Signer
  #proxyFactoryAddress!: string
  #safeSingletonAddress!: string
  validateIsDeployed: (address: string, name: string) => Promise<void>

  constructor(signer: Signer, proxyFactoryAddress: string, safeSingletonAddress: string) {
    this.#signer = signer
    this.#proxyFactoryAddress = proxyFactoryAddress
    this.#safeSingletonAddress = safeSingletonAddress

    if (!this.#signer.provider)
      throw new Error('Signer must be connected to a provider')

    this.validateIsDeployed = validateIsDeployedFactory(this.#signer.provider!)
  }

  async createSafe(
    safeAccountConfiguration: SafeAccountConfiguration,
    deploymentOptions?: DeploymentOptions
  ): Promise<Safe> {
    await this.validateIsDeployed(this.#proxyFactoryAddress, 'ProxyFactory')
    await this.validateIsDeployed(this.#safeSingletonAddress, 'SafeSingleton')

    if (safeAccountConfiguration.owners.length <= 0)
      throw new Error('Invalid owners: it must have at least one')
    if (safeAccountConfiguration.threshold <= 0)
      throw new Error('Invalid threshold: it must be greater than or equal to 0')
    if (safeAccountConfiguration.threshold > safeAccountConfiguration.owners.length)
      throw new Error('Invalid threshold: it must be lower than or equal to owners length')

    const {
      owners,
      threshold,
      to = ZERO_ADDRESS,
      data = EMPTY_DATA,
      fallbackHandler = ZERO_ADDRESS,
      paymentToken = ZERO_ADDRESS,
      payment = 0,
      paymentReceiver = ZERO_ADDRESS
    } = safeAccountConfiguration

    const gnosisSafeInterface = new Interface(GnosisSafe.abi)
    const setupFunctionData = gnosisSafeInterface.encodeFunctionData('setup', [
      owners,
      threshold,
      to,
      data,
      fallbackHandler,
      paymentToken,
      payment,
      paymentReceiver
    ])

    const gnosisSafe = await this.deployProxy(deploymentOptions, setupFunctionData)
    return await EthersSafe.create(ethers, gnosisSafe.address, this.#signer)
  }

  private async createDeployProxyTransaction(
    deploymentOptions: DeploymentOptions = {},
    data: string
  ) {
    const proxyFactory = new Contract(
      this.#proxyFactoryAddress,
      GnosisSafeProxyFactory.abi,
      this.#signer
    )

    const { nonce, callbackAddress } = deploymentOptions

    if (callbackAddress && nonce) {
      return await proxyFactory.createProxyWithCallback(
        this.#safeSingletonAddress,
        data,
        nonce,
        callbackAddress
      )
    } else if (nonce) {
      return await proxyFactory.createProxyWithNonce(this.#safeSingletonAddress, data, nonce)
    } else {
      return await proxyFactory.createProxy(this.#safeSingletonAddress, data)
    }
  }

  private async deployProxy(deploymentOptions: DeploymentOptions = {}, setupFnData: string) {
    const receipt = await this.createDeployProxyTransaction(deploymentOptions, setupFnData).then(
      (tx) => tx.wait()
    )
    const proxyCreationEvent = receipt.events?.find((e: Event) => e.event === 'ProxyCreation')
    if (!proxyCreationEvent || !proxyCreationEvent.args) {
      throw new Error(
        'Proxy creation failed: check if the proxy has been deployed correctly and try again'
      )
    }
    const proxyAddress = proxyCreationEvent.args[0]
    return new Contract(proxyAddress, GnosisSafe.abi, this.#signer)
  }
}

export default EthersSafeFactory
