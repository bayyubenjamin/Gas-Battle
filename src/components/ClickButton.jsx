import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';

const RISE_TESTNET_PARAMS = {
  chainId: '0xaa39db',
  chainName: 'RISE Testnet',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.riselabs.xyz'],
  blockExplorerUrls: ['https://explorer.testnet.riselabs.xyz'],
};

function getMetaMaskProvider() {
  const { ethereum } = window;
  if (!ethereum) return null;
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    return ethereum.providers.find((p) => p.isMetaMask) || null;
  }
  return ethereum.isMetaMask ? ethereum : null;
}

export default function ClickButton() {
  const MAIN_OWNER = '0xc25f0bfc89859c7076c5400968a900323b48005d'.toLowerCase();
  const [account, setAccount] = useState(null);
  const [clicks, setClicks] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [contractOwner, setContractOwner] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  async function ensureRise(provider) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: RISE_TESTNET_PARAMS.chainId }],
      });
      console.log('✅ Switched to RISE Testnet');
    } catch (err) {
      if (err.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [RISE_TESTNET_PARAMS],
        });
        console.log('✅ Added RISE Testnet');
      } else {
        console.error('❌ ensureRise error:', err);
        throw err;
      }
    }
  }

  async function connectWallet() {
    console.log('🚀 connectWallet() called');
    const mmProvider = getMetaMaskProvider();
    if (!mmProvider) return alert('MetaMask not found—please install it or disable other wallets.');

    try {
      await ensureRise(mmProvider);
      const [addr] = await mmProvider.request({ method: 'eth_requestAccounts' });
      console.log('🔗 Connected (MetaMask):', addr);
      setAccount(addr);

      const provider = new ethers.providers.Web3Provider(mmProvider);
      const contract = getContract(provider);

      // Ambil owner kontrak dari blockchain
      let ownerAddress = '';
      try {
        ownerAddress = await contract.owner();
        console.log('🔑 Contract owner is:', ownerAddress);
        setContractOwner(ownerAddress);
        setIsOwner(addr.toLowerCase() === ownerAddress.toLowerCase());
      } catch (ownerErr) {
        console.error('❌ Error getting contract owner:', ownerErr);
      }

      // Ambil jumlah klik user
      try {
        const initial = await contract.getClicks(addr);
        console.log('👀 initial clicks:', initial.toString());
        setClicks(initial.toNumber());
      } catch (clickErr) {
        console.error('❌ Error getting clicks:', clickErr);
      }

    } catch (err) {
      console.error('❌ connectWallet error:', err);
      alert(err.message || err);
    }
  }

  async function handleClick() {
    console.log('🔥 handleClick() called, account=', account);
    if (!account) return alert('Please connect wallet first');

    const mmProvider = getMetaMaskProvider();
    if (!mmProvider) return alert('MetaMask not found');

    try {
      setIsLoading(true);
      await ensureRise(mmProvider);

      const provider = new ethers.providers.Web3Provider(mmProvider);
      const signer = provider.getSigner();
      console.log('✍️ Signer obtained:', await signer.getAddress());

      const contract = getContract(signer);
      console.log('📟 Sending click() transaction...');

      let tx;
      try {
        tx = await contract.click();
      } catch (sendErr) {
        console.error('❌ Transaction rejected or failed to send:', sendErr);
        setIsLoading(false);
        return alert('Tx failed or rejected: ' + sendErr.message);
      }

      console.log('⏳ TX sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ TX confirmed, receipt:', receipt);

      const updated = await contract.getClicks(account);
      console.log('🔄 Updated clicks:', updated.toString());
      setClicks(updated.toNumber());
      setSuccessMessage('Transaction successful! 🎉');
      setIsLoading(false);
    } catch (err) {
      console.error('❌ handleClick error:', err);
      setIsLoading(false);
      alert(err.message || err);
    }
  }

  return (
    <div className="text-center mt-10">
      {account ? (
        <>
          {contractOwner && (
            <p className="text-sm text-gray-500">
              Contract Owner: <strong>{contractOwner}</strong>
            </p>
          )}
          {isOwner && (
            <p className="text-sm text-blue-500">
              🎯 You are connected as the owner wallet
            </p>
          )}
          <p>Total Clicks: <strong>{clicks}</strong></p>
          <button
            type="button"
            onClick={handleClick}
            className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2 ${isLoading ? 'opacity-50' : ''}`}>
            {isLoading ? 'Processing...' : 'Gas!'}
          </button>
          {successMessage && (
            <p className="text-green-500 mt-2">{successMessage}</p>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={connectWallet}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          Connect Wallet
        </button>
      )}
    </div>
  );
}

