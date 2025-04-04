import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { Transaction, TransactionStatus } from '@/types/payment';

const paymentService = new PaymentService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const expectedAmount = searchParams.get('amount');

    if (!address || !expectedAmount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Add timeout to the payment check
    const timeoutPromise = new Promise<Transaction | null>((_, reject) => {
      setTimeout(() => reject(new Error('Payment check timed out')), 25000);
    });

    const transactionPromise = paymentService.checkPayment(
      address,
      parseFloat(expectedAmount)
    );

    const transaction = await Promise.race([transactionPromise, timeoutPromise]);

    // Return pending status if no transaction found
    if (!transaction) {
      return NextResponse.json({
        status: TransactionStatus.PENDING,
        message: 'No payment received yet',
        expectedAmount: parseFloat(expectedAmount),
        receivedAmount: 0,
        remainingAmount: parseFloat(expectedAmount)
      });
    }

    // Return transaction details if found
    return NextResponse.json({
      status: transaction.status,
      expectedAmount: transaction.expectedAmount,
      receivedAmount: transaction.amount,
      remainingAmount: transaction.remainingAmount,
      message: transaction.status === TransactionStatus.PARTIAL 
        ? `Partial payment received. Please send remaining ${transaction.remainingAmount} USDT`
        : transaction.status === TransactionStatus.CONFIRMED
        ? 'Payment completed successfully'
        : 'Payment pending'
    });
  } catch (error) {
    console.error('Payment status check failed:', error);
    
    // Return a more informative error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to check payment status';
    const statusCode = errorMessage.includes('timed out') ? 504 : 500;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        status: 'ERROR',
        message: 'Payment status check failed, please try again'
      },
      { status: statusCode }
    );
  }
} 