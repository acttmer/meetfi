// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ISafeOwnerManager.sol";

contract MeetingNFT is ERC1155, ERC1155Supply, ERC1155URIStorage, Ownable {
  mapping(uint256 => address) _safeAddresses;

  constructor() ERC1155("") {}

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override(ERC1155, ERC1155Supply) {
    ERC1155Supply._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function getSafeAddress(uint256 id) public view virtual returns (address) {
    address existingSafeAddress = _safeAddresses[id];
    require(existingSafeAddress != address(0), "token is not minted");

    return existingSafeAddress;
  }

  function uri(
    uint256 tokenId
  )
    public
    view
    virtual
    override(ERC1155, ERC1155URIStorage)
    returns (string memory)
  {
    return ERC1155URIStorage.uri(tokenId);
  }

  function mint(
    uint256 id,
    address safeAddress,
    string memory uri_
  ) external virtual {
    address existingSafeAddress = _safeAddresses[id];
    require(existingSafeAddress == address(0), "should use obtain method");

    _mint(_msgSender(), id, 1, "");
    _setURI(uri_);
    _safeAddresses[id] = safeAddress;
  }

  function obtain(uint256 id) external virtual {
    address existingSafeAddress = _safeAddresses[id];
    require(existingSafeAddress != address(0), "token is not minted");

    ISafeOwnerManager safe = ISafeOwnerManager(existingSafeAddress);
    require(safe.isOwner(_msgSender()), "caller must be safe owner");

    _mint(_msgSender(), id, 1, "");
  }
}
