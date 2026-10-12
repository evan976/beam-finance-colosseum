// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/// @notice Test ERC20 with public `mint` and configurable decimals (e.g. 6 for USDT-like tokens).
contract MockERC20Mintable is ERC20 {
  uint8 private immutable _customDecimals;

  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_
  ) ERC20(name_, symbol_) {
    require(decimals_ <= 18, 'Decimals');
    _customDecimals = decimals_;
  }

  function decimals() public view override returns (uint8) {
    return _customDecimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
