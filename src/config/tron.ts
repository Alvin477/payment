export const TRON_CONFIG = {
  // TRON Nile Testnet settings
  NETWORK: 'nile' as 'mainnet' | 'nile',
  API_URL: 'https://nile.trongrid.io',
  
  // USDT Contract on Nile Testnet
  USDT_CONTRACT: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', // Updated to correct Nile testnet USDT address
  
  // Main wallet will be set later
  MAIN_WALLET_ADDRESS: process.env.MAIN_WALLET_ADDRESS || '',
  
  // TronGrid API Key
  API_KEY: process.env.TRON_API_KEY || '',
} as const;

export const TRON_EVENTS = {
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  TRANSFER_COMPLETED: 'TRANSFER_COMPLETED',
} 