import { utils } from 'ethers'
import { ZERO_ADDRESS } from '../constants'
import { estimateTxGas } from './gas'
import {
  OperationType,
  SafeBasicTransactionData,
  SafeTransactionData,
  SafeTransactionDataPartial
} from './SafeTransaction'

export function standardizeBasicSafeTransaction(
  tx: SafeTransactionDataPartial
): SafeBasicTransactionData {
  const standardizedTxs: SafeBasicTransactionData = {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation: tx.operation ?? OperationType.Call
  }
  return standardizedTxs
}

export async function standardizeSafeTransaction(
  safeContract: any,
  tx: SafeTransactionDataPartial
): Promise<SafeTransactionData> {
  const standardizedTxs = {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation: tx.operation ?? OperationType.Call,
    baseGas: tx.baseGas ?? 0,
    gasPrice: tx.gasPrice ?? 0,
    gasToken: tx.gasToken || ZERO_ADDRESS,
    refundReceiver: tx.refundReceiver || ZERO_ADDRESS,
    nonce: tx.nonce ?? (await safeContract.nonce()).toNumber()
  }
  const safeTxGas =
    tx.safeTxGas ??
    (await estimateTxGas(
      safeContract,
      standardizedTxs.to,
      standardizedTxs.value,
      standardizedTxs.data,
      standardizedTxs.operation
    ))
  return {
    ...standardizedTxs,
    safeTxGas
  }
}

const encodeMetaTransaction = (tx: SafeBasicTransactionData): string => {
  const data = utils.arrayify(tx.data)
  const encoded = utils.solidityPack(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
    [tx.operation, tx.to, tx.value, data.length, data]
  )
  return encoded.slice(2)
}

export const encodeMultiSendData = (txs: SafeBasicTransactionData[]): string => {
  return '0x' + txs.map((tx) => encodeMetaTransaction(tx)).join('')
}