import TronWeb from 'tronweb';
import { TRON_CONFIG } from '../config/tron';

export class TrxService {
  private tronWeb: TronWeb;
  private feeWalletPrivateKey: string;
  
  constructor() {
    if (!process.env.FEE_WALLET_PRIVATE_KEY) {
      throw new Error('FEE_WALLET_PRIVATE_KEY is required');
    }

    this.feeWalletPrivateKey = process.env.FEE_WALLET_PRIVATE_KEY;
    this.tronWeb = new TronWeb({
      fullHost: TRON_CONFIG.API_URL,
      headers: { "TRON-PRO-API-KEY": TRON_CONFIG.API_KEY },
      privateKey: this.feeWalletPrivateKey
    });
  }

  private async calculateRequiredTrx(toAddress: string, usdtAmount: number): Promise<number> {
    try {
      // Get account info to check if activated
      const account = await this.tronWeb.trx.getAccount(toAddress);
      const isActivated = account.activated || false;

      // Base costs in SUN:
      // 1. Account activation if needed: 1 TRX = 1,000,000 SUN
      // 2. USDT transfer energy: ~30,000 SUN
      // 3. Bandwidth cost: ~10,000 SUN
      // 4. Safety margin: ~60,000 SUN
      
      let requiredTrx = 0;
      
      // If not activated, need 1 TRX
      if (!isActivated) {
        requiredTrx += 1_000_000; // 1 TRX
      }

      // Calculate transfer costs based on USDT amount
      // More USDT = slightly more energy
      const baseFee = 100_000; // 0.1 TRX
      const amountFactor = Math.ceil(usdtAmount / 100) * 10_000; // Additional 0.01 TRX per 100 USDT
      
      requiredTrx += baseFee + amountFactor;

      console.log(`Calculated required TRX: ${this.tronWeb.fromSun(requiredTrx)} TRX`);
      console.log(`- Account activated: ${isActivated}`);
      console.log(`- Base fee: ${this.tronWeb.fromSun(baseFee)} TRX`);
      console.log(`- Amount-based fee: ${this.tronWeb.fromSun(amountFactor)} TRX`);

      return requiredTrx;
    } catch (error) {
      console.error('Failed to calculate required TRX:', error);
      // Return a safe default if calculation fails
      return 2_000_000; // 2 TRX as fallback
    }
  }

  async sendTrxForActivation(toAddress: string): Promise<string> {
    try {
      // Send 1 TRX for activation
      const trxAmount = 1_000_000; // 1 TRX in SUN units
      const transaction = await this.tronWeb.trx.sendTransaction(toAddress, trxAmount);
      if (!transaction.result) throw new Error('Failed to send TRX');
      return transaction.txid;
    } catch (error) {
      console.error('Failed to send activation TRX:', error);
      throw error;
    }
  }

  async sendTrxForFees(toAddress: string, usdtAmount: number): Promise<string> {
    try {
      // Calculate required TRX based on USDT amount and account status
      const requiredTrx = await this.calculateRequiredTrx(toAddress, usdtAmount);
      console.log(`Sending ${this.tronWeb.fromSun(requiredTrx)} TRX for fees`);

      const transaction = await this.tronWeb.trx.sendTransaction(
        toAddress,
        requiredTrx,
        { feeLimit: 10000 }
      );

      if (transaction.result) {
        return transaction.txid;
      }

      throw new Error('Failed to send TRX');
    } catch (error) {
      console.error('Failed to send TRX for fees:', error);
      throw new Error('Failed to send TRX for fees');
    }
  }

  async checkTrxBalance(address: string): Promise<number> {
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      return this.tronWeb.fromSun(balance);
    } catch (error) {
      console.error('Failed to check TRX balance:', error);
      throw new Error('Failed to check TRX balance');
    }
  }
} 