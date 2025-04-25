// src/utils/contract.js
import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0xd9aB239C897A1595df704124c0bD77560CA3655F';

const ABI = [
  'function click()',
  'function getClicks(address) view returns (uint256)',
  'function owner() view returns (address)', // ✅ tambahkan ini
  'event Clicked(address indexed player, uint256 totalClicks)',
];

export function getContract(providerOrSigner) {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, providerOrSigner);
}

