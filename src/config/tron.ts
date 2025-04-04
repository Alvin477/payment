export const TRON_CONFIG = {
  // TRON Mainnet settings
  NETWORK: 'mainnet' as 'mainnet' | 'nile',
  API_URL: 'https://api.trongrid.io',
  
  // USDT Contract on Mainnet
  USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Mainnet USDT contract address
  
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

