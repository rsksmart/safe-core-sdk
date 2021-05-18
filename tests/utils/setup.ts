import { AddressZero } from '@ethersproject/constants'
import { BigNumber, BigNumberish } from 'ethers'
import { deployments, ethers, waffle } from 'hardhat'

export const getSafeSingleton = async () => {
  const SafeDeployment = await deployments.get('GnosisSafe')
  const Safe = await ethers.getContractFactory('GnosisSafe')
  return Safe.attach(SafeDeployment.address)
}

export const getFactory = async () => {
  const FactoryDeployment = await deployments.get('GnosisSafeProxyFactory')
  const Factory = await ethers.getContractFactory('GnosisSafeProxyFactory')
  return Factory.attach(FactoryDeployment.address)
}

export const getSafeTemplate = async () => {
  const singleton = await getSafeSingleton()
  const factory = await getFactory()
  const template = await factory.callStatic.createProxy(singleton.address, '0x')
  await factory.createProxy(singleton.address, '0x').then((tx: any) => tx.wait())
  const Safe = await ethers.getContractFactory('GnosisSafe')
  return Safe.attach(template)
}

export const getSafeWithOwners = async (owners: string[], threshold?: number) => {
  const template = await getSafeTemplate()
  await template.setup(
    owners,
    threshold || owners.length,
    AddressZero,
    '0x',
    AddressZero,
    AddressZero,
    0,
    AddressZero
  )
  return template
}

export const getDailyLimitModule = async () => {
  const DailyLimitModuleDeployment = await deployments.get('DailyLimitModule')
  const DailyLimitModule = await ethers.getContractFactory('DailyLimitModule')
  return DailyLimitModule.attach(DailyLimitModuleDeployment.address)
}

export const getSocialRecoveryModule = async () => {
  const SocialRecoveryModuleDeployment = await deployments.get('SocialRecoveryModule')
  const SocialRecoveryModule = await ethers.getContractFactory('SocialRecoveryModule')
  return SocialRecoveryModule.attach(SocialRecoveryModuleDeployment.address)
}

export const balanceVerifierFactory = (
  getBalance: (address: string) => Promise<BigNumber>
) => async (address: string) => {
  const balanceBefore = await getBalance(address)
  return async (expected: BigNumberish): Promise<boolean> => {
    const balanceAfter = await getBalance(address)
    const diff = balanceAfter.sub(balanceBefore)
    return diff.eq(expected)
  }
}
