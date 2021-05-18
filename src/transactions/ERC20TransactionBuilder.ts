import { Contract, BigNumber } from 'ethers'
import Safe from 'Safe'
import SafeTransaction from 'utils/transactions/SafeTransaction'
import RawTransactionBuilder from './RawTransactionBuilder'

class ERC20TransactionBuilder extends RawTransactionBuilder {
  #erc20Contract!: Contract

  constructor(safe: Safe, erc20Contract: Contract) {
    super(safe)
    this.#erc20Contract = erc20Contract
  }

  async transfer(to: string, value: BigNumber): Promise<SafeTransaction> {
    const transactionData = this.#erc20Contract.interface.encodeFunctionData('transfer', [
      to,
      value
    ])
    return this.createSafeTransaction(transactionData)
  }

  async transferFrom(from: string, to: string, value: BigNumber): Promise<SafeTransaction> {
    const transactionData = this.#erc20Contract.interface.encodeFunctionData('transferFrom', [
      from,
      to,
      value
    ])
    return this.createSafeTransaction(transactionData)
  }

  async approve(spender: string, amount: BigNumber): Promise<SafeTransaction> {
    const transactionData = this.#erc20Contract.interface.encodeFunctionData('approve', [
      spender,
      amount
    ])
    return this.createSafeTransaction(transactionData)
  }

  private createSafeTransaction(transactionData: string): Promise<SafeTransaction> {
    return this.rawTransaction(this.#erc20Contract.address, '0', transactionData)
  }
}

export default ERC20TransactionBuilder
