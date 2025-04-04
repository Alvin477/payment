import TronWeb from 'tronweb';
import { TRON_CONFIG } from '../config/tron';
import { PaymentRequest, PaymentSession, PaymentStatus, Transaction, TransactionStatus } from '../types/payment';
import dbConnect from './db';
import { Payment } from '@/models/payment';
import { TrxService } from './trx';
import { CallbackService } from './callback';

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
            
          // If payment is confirmed and TRX hasn't been sent for fees, send it
          if (status === PaymentStatus.CONFIRMED && !payment.trxSent) {
            // Send callback first
            await this.callbackService.sendPaymentCallback(payment, 'CONFIRMED', receivedAmount);
            
            try {
              const txId = await this.trxService.sendTrxForFees(address, receivedAmount);
              console.log('Sent TRX for fees, txId:', txId);
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

              // After sending TRX, wait a bit and then transfer to main wallet
              await new Promise(resolve => setTimeout(resolve, 3000));
              try {
                await this.transferToMainWallet(address, payment.privateKey, receivedAmount);
                console.log('Automatically transferred to main wallet after confirmation');
              } catch (transferError: unknown) {
                console.error('Failed to auto-transfer to main wallet:', transferError instanceof Error ? transferError.message : 'Unknown error');
              }
            } catch (trxError) {
              console.error('Failed to send TRX for fees:', trxError);
            }
          }

          // If payment has expired and there's a partial payment, transfer it to main wallet
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

          // Wait for 5 seconds to ensure USDT transfer is fully confirmed
          console.log('Waiting 5 seconds for USDT transfer confirmation...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Recover TRX with retries
          let trxRecovered = false;
          let recoveryAttempts = 0;
          const maxRecoveryAttempts = 5;

          while (!trxRecovered && recoveryAttempts < maxRecoveryAttempts) {
            try {
              console.log(`TRX recovery attempt ${recoveryAttempts + 1}/${maxRecoveryAttempts}`);
              
              // Check current TRX balance
              const balance = await this.tronWeb.trx.getBalance(fromAddress);
              const balanceNum = Number(balance);
              console.log(`Current TRX balance: ${this.tronWeb.fromSun(balanceNum)} TRX`);

              // Keep 0.1 TRX (100,000 SUN) for safety
              const MIN_TRX_KEEP = 100000;
              
              if (balanceNum <= MIN_TRX_KEEP) {
                console.log('Balance too low to recover, skipping...');
                break;
              }

              const amountToRecover = balanceNum - MIN_TRX_KEEP;
              console.log(`Attempting to recover ${this.tronWeb.fromSun(amountToRecover)} TRX`);

              // Force the transaction with minimum fee
              const tx = await this.tronWeb.trx.sendTransaction(
                process.env.FEE_WALLET_ADDRESS!,
                amountToRecover,
                { feeLimit: 10000 }
              );

              if (tx.result) {
                console.log(`Successfully recovered TRX, txId: ${tx.txid}`);
                
                // Record TRX recovery in transactions
                await Payment.findOneAndUpdate(
                  { address: fromAddress },
                  {
                    $push: {
                      transactions: {
                        txId: tx.txid,
                        from: fromAddress,
                        to: process.env.FEE_WALLET_ADDRESS,
                        amount: this.tronWeb.fromSun(amountToRecover),
                        timestamp: new Date(),
                        type: 'TRX_RECOVERY'
                      }
                    }
                  }
                );

                // Verify final balance
                const finalBalance = await this.tronWeb.trx.getBalance(fromAddress);
                console.log(`Final wallet balance: ${this.tronWeb.fromSun(finalBalance)} TRX`);
                
                trxRecovered = true;
                break;
              }
            } catch (recoveryError: any) {
              console.error(`Recovery attempt ${recoveryAttempts + 1} failed:`, recoveryError.message);
              recoveryAttempts++;
              
              if (recoveryAttempts < maxRecoveryAttempts) {
                console.log('Waiting 3 seconds before next recovery attempt...');
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          }

          if (!trxRecovered) {
            console.error('Failed to recover TRX after all attempts');
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