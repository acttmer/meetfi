// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ISafeOwnerManager {
  /**
   * @notice Returns if `owner` is an owner of the Safe.
   * @return Boolean if owner is an owner of the Safe.
   */
  function isOwner(address owner) external view returns (bool);
}
