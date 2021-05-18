import Safe from 'Safe'

abstract class TransactionBuilderAbstract {
  #safe!: Safe

  constructor(safe: Safe) {
    this.#safe = safe
  }

  protected get safe(): Safe {
    return this.#safe
  }
}

export default TransactionBuilderAbstract
