pragma solidity >=0.5.0 <0.7.0;

import { GnosisSafeProxy } from "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxy.sol";
import { IProxyCreationCallback } from "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockProxyCreationCallback is IProxyCreationCallback {
    function proxyCreated(GnosisSafeProxy proxy, address _mastercopy, bytes calldata initializer, uint256 saltNonce) external {}
}

contract MockERC20Token is ERC20 {
    string public name = "MockERC20";
    string public symbol = "MCK";
    uint8 public decimals = 0;
    uint256 public INITIAL_SUPPLY = 1000000000000000000000000000;

    constructor() public {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}