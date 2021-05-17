import { providers } from 'ethers'
import { EMPTY_DATA } from './constants'

export const validateIsDeployedFactory = (signerOrProvider: providers.Provider) => (address: string, name: string) =>
  signerOrProvider.getCode(address).then((code: string) => {
    if (code === EMPTY_DATA) {
      throw new Error(`${name} contract is not deployed in the current network`)
    }
  })
