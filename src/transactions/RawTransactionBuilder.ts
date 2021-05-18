import Safe from 'Safe'
import SafeTransaction from '../utils/transactions/SafeTransaction'
import TransactionBuilderAbstract from './TransactionBuilderAbstract'

class RawTransactionBuilder extends TransactionBuilderAbstract {
  constructor(safe: Safe) {
    super(safe)
  }

  rawTransaction(to: string, value: string, data: string): Promise<SafeTransaction> {
    return this.safe.createTransaction({
      to,
      data,
      value
    })
  }
}

export default RawTransactionBuilder
