import TronWeb from 'tronweb';
import { TRON_CONFIG } from '../config/tron';
import { PaymentRequest, PaymentSession, PaymentStatus, Transaction, TransactionStatus } from '../types/payment';
import dbConnect from './db';
import { Payment } from '@/models/payment';
import { TrxService } from './trx';
import { CallbackService } from './callback';
import { decrypt } from './crypto';

export class PaymentService {
  private tronWeb: TronWeb;
  private trxService: TrxService;
  private callbackService: CallbackService;
  
  constructor() {
    this.tronWeb = new TronWeb({
      fullHost: TRON_CONFIG.API_URL,
      headers: { "TRON-PRO-API-KEY": TRON_CONFIG.API_KEY }
    });
    this.trxService = new TrxService();
    this.callbackService = new CallbackService();
    
    // Set default address to fee wallet
    if (process.env.FEE_WALLET_ADDRESS) {
      this.tronWeb.setAddress(process.env.FEE_WALLET_ADDRESS);
    }
  }

  async initializePayment(request: PaymentRequest): Promise<PaymentSession> {
    try {
      await dbConnect();

      // Generate a new address for payment
      const account = await this.tronWeb.createAccount();
      
      const session: PaymentSession = {
        id: crypto.randomUUID(),
        status: PaymentStatus.PENDING,
        amount: request.amount,
        receivedAmount: 0,
        remainingAmount: request.amount,
        orderId: request.orderId,
        address: account.address.base58,
        currency: request.currency,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
        callbackUrl: request.callbackUrl,
      };

      // Save to database
      await Payment.create({
        ...session,
        privateKey: account.privateKey,
      });

      // Send initial 1 TRX for account activation
      try {
        const txId = await this.trxService.sendTrxForActivation(account.address.base58);
        console.log('Sent activation TRX, txId:', txId);
      } catch (trxError) {
        console.error('Failed to send activation TRX:', trxError);
        // Don't throw error, continue with payment initialization
      }
      
      return session;
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      throw new Error('Payment initialization failed');
    }
  }

  async checkPayment(address: string, expectedAmount: number): Promise<Transaction | null> {
    try {
      await dbConnect();
      const payment = await Payment.findOne({ address });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      // If already transferred, show as confirmed to users
      if (payment.transferredToMain) {
        return {
          txId: '',
          from: '',
          to: address,
          amount: payment.receivedAmount,
          expectedAmount: expectedAmount,
          remainingAmount: 0,
          currency: 'USDT',
          timestamp: new Date(),
          status: TransactionStatus.CONFIRMED
        };
      }

      console.log('Starting payment check for address:', address);
      console.log('Expected amount:', expectedAmount);

      // Check if payment has expired
      const now = new Date();
      const isExpired = payment.expiresAt < now;

      try {
        // Check TRX balance first
        const trxBalance = await this.tronWeb.trx.getBalance(address);
        console.log('TRX balance (SUN):', trxBalance);
        
        // Direct contract interaction for USDT
        console.log('Checking USDT contract:', TRON_CONFIG.USDT_CONTRACT);
        const contract = await this.tronWeb.contract().at(TRON_CONFIG.USDT_CONTRACT);
        console.log('Contract initialized');
        
        // Set the address before making contract calls
        this.tronWeb.setAddress(address);
        console.log('Address set for contract calls:', address);
        
        // Get balance with retries
        let balance;
        let lastError: Error | null = null;
        for (let i = 0; i < 3; i++) {
          try {
            balance = await contract.balanceOf(address).call();
            console.log('Raw balance response:', balance?.toString());
            break;
          } catch (err) {
            lastError = err as Error;
            console.error(`Attempt ${i + 1} failed:`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!balance) {
          throw new Error(`Failed to get balance after retries. Last error: ${lastError?.message}`);
        }

        const receivedAmount = Number(balance.toString()) / 1000000; // USDT uses 6 decimals
        console.log('Final calculated amount:', receivedAmount);
        
        if (receivedAmount > 0) {
          const transaction: Transaction = {
            txId: '',
            from: '',
            to: address,
            amount: receivedAmount,
            expectedAmount: expectedAmount,
            remainingAmount: Math.max(0, expectedAmount - receivedAmount),
            currency: 'USDT',
            timestamp: new Date(),
            status: this.determineTransactionStatus(receivedAmount, expectedAmount),
          };

          const status = this.getPaymentStatus(transaction);
            
          // Only proceed if payment is fully confirmed and amount matches
          if (status === PaymentStatus.CONFIRMED && receivedAmount >= expectedAmount) {
            try {
              // First attempt to send TRX and transfer to main wallet
              if (!payment.trxSent) {
                try {
                  const txId = await this.trxService.sendTrxForFees(address, receivedAmount);
                  console.log('Sent TRX for fees, txId:', txId);
                  
                  // Update payment status
                  await Payment.findOneAndUpdate(
                    { address },
                    { 
                      trxSent: true,
                      $push: { 
                        transactions: { 
                          txId, 
                          from: process.env.FEE_WALLET_ADDRESS, 
                          type: 'TRX_FEE',
                          timestamp: new Date() 
                        } 
                      }
                    }
                  );

                  // After sending TRX, wait a bit and then try to transfer to main wallet
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  let transferSuccess = false;
                  try {
                    // Decrypt private key before transfer
                    const decryptedPrivateKey = decrypt(payment.privateKey);
                    await this.transferToMainWallet(address, decryptedPrivateKey, receivedAmount);
                    console.log('Successfully transferred to main wallet');
                    transferSuccess = true;
                  } catch (transferError: unknown) {
                    console.error('Failed to transfer to main wallet:', transferError instanceof Error ? transferError.message : 'Unknown error');
                  }

                  // Send callback after transfer attempt, regardless of success
                  if (!payment.callbackSent) {
                    try {
                      await this.callbackService.sendPaymentCallback(payment, 'CONFIRMED', receivedAmount);
                      console.log('Successfully sent callback to main system');
                      
                      // Mark callback as sent
                      await Payment.findOneAndUpdate(
                        { address },
                        { callbackSent: true }
                      );
                    } catch (callbackError) {
                      console.error('Failed to send callback:', callbackError);
                    }
                  }
                } catch (trxError) {
                  console.error('Failed to send TRX for fees:', trxError);
                }
              }
            } catch (error) {
              console.error('Error in confirmation process:', error);
            }
          }

          // If payment has expired and there's a partial payment, try to transfer it
          if (isExpired && Number(balance.toString()) > 0 && !payment.transferredToMain) {
            try {
              await this.transferToMainWallet(address, payment.privateKey, receivedAmount);
              console.log('Transferred expired partial payment to main wallet');
            } catch (transferError: unknown) {
              console.error('Failed to transfer expired partial payment:', transferError instanceof Error ? transferError.message : 'Unknown error');
            }
          }

          await Payment.findOneAndUpdate(
            { address },
            {
              receivedAmount,
              remainingAmount: transaction.remainingAmount,
              status,
              lastChecked: new Date(),
              $push: { transactions: { amount: receivedAmount, timestamp: new Date() } }
            }
          );

          return transaction;
        }
        
        return null;
      } catch (error: unknown) {
        console.error('Contract interaction error:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    } catch (error: unknown) {
      console.error('Payment check failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private determineTransactionStatus(receivedAmount: number, expectedAmount: number): TransactionStatus {
    if (receivedAmount === 0) return TransactionStatus.PENDING;
    if (receivedAmount < expectedAmount) return TransactionStatus.PARTIAL;
    if (receivedAmount >= expectedAmount) return TransactionStatus.CONFIRMED;
    return TransactionStatus.FAILED;
  }

  async transferToMainWallet(fromAddress: string, privateKey: string, amount: number): Promise<boolean> {
    try {
      await dbConnect();
      const payment = await Payment.findOne({ address: fromAddress });
      
      if (!payment || payment.transferredToMain) {
        throw new Error('Payment not found or already transferred');
      }

      const contract = await this.tronWeb.contract().at(TRON_CONFIG.USDT_CONTRACT);
      
      // Set the private key for transaction signing
      this.tronWeb.setPrivateKey(privateKey);
      
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      let lastError;

      while (retryCount < maxRetries && !success) {
        try {
          // Transfer USDT to main wallet
          const transaction = await contract.transfer(
            TRON_CONFIG.MAIN_WALLET_ADDRESS,
            this.tronWeb.toSun(amount)
          ).send();
          
          // Update payment status
          await Payment.findOneAndUpdate(
            { address: fromAddress },
            {
              transferredToMain: true,
              status: PaymentStatus.TRANSFERRED,
              $push: {
                transactions: {
                  txId: transaction.txID,
                  from: fromAddress,
                  to: TRON_CONFIG.MAIN_WALLET_ADDRESS,
                  amount: amount,
                  timestamp: new Date(),
                  type: 'USDT_TRANSFER'
                }
              }
            }
          );

          // Send callback after successful transfer
          try {
            await this.callbackService.sendPaymentCallback(payment, 'CONFIRMED', amount);
            console.log('Successfully sent callback to main system after transfer');
          } catch (callbackError) {
            console.error('Failed to send callback after transfer:', callbackError);
          }

          success = true;
          break;
        } catch (error: any) {
          lastError = error;
          retryCount++;
          
          if (error.message?.includes('bandwidth') || error.message?.includes('energy')) {
            try {
              await this.trxService.sendTrxForFees(fromAddress, amount);
              await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (trxError) {
              console.error('Failed to send additional TRX:', trxError);
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!success) {
        throw lastError || new Error('Transfer failed after retries');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to transfer to main wallet:', error);
      throw new Error('Transfer failed');
    }
  }

  getPaymentStatus(transaction: Transaction): PaymentStatus {
    if (!transaction) return PaymentStatus.PENDING;
    
    switch (transaction.status) {
      case TransactionStatus.PARTIAL:
        return PaymentStatus.PARTIAL;
      case TransactionStatus.CONFIRMED:
        return PaymentStatus.CONFIRMED;
      case TransactionStatus.FAILED:
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }
} 