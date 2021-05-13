pragma solidity >=0.5.0 <0.7.0;

import { GnosisSafeProxy } from "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxy.sol";
import { IProxyCreationCallback } from "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";

contract MockProxyCreationCallback is IProxyCreationCallback {
    function proxyCreated(GnosisSafeProxy proxy, address _mastercopy, bytes calldata initializer, uint256 saltNonce) external {}
}