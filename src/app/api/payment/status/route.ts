import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { Transaction, TransactionStatus } from '@/types/payment';

const paymentService = new PaymentService();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  try {
    const address = searchParams.get('address');
    const expectedAmount = searchParams.get('amount');

    if (!address || !expectedAmount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(expectedAmount);

    // Shorter timeout for Vercel
    const timeoutPromise = new Promise<Transaction | null>((_, reject) => {
      setTimeout(() => reject(new Error('Payment check timed out')), 8000); // 8 second timeout
    });

    const transactionPromise = paymentService.checkPayment(
      address,
      parsedAmount
    );

    const transaction = await Promise.race([transactionPromise, timeoutPromise]);

    // Return pending status if no transaction found
    if (!transaction) {
      return NextResponse.json({
        status: TransactionStatus.PENDING,
        message: 'No payment received yet',
        expectedAmount: parsedAmount,
        receivedAmount: 0,
        remainingAmount: parsedAmount
      }, { status: 200 }); // Ensure we return 200 for pending
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
    }, { status: 200 }); // Always return 200 for valid responses
  } catch (error) {
    console.error('Payment status check failed:', error);
    
    // Return a more informative error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to check payment status';
    const parsedAmount = parseFloat(searchParams.get('amount') || '0');
    
    // Return 200 with error status instead of 504/500 to prevent Vercel from showing error page
    return NextResponse.json(
      { 
        status: 'ERROR',
        error: errorMessage,
        message: 'Payment check will retry automatically...',
        expectedAmount: parsedAmount,
        receivedAmount: 0,
        remainingAmount: parsedAmount
      },
      { status: 200 }
    );
  }
} 