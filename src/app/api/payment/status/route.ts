import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';

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

    const transaction = await paymentService.checkPayment(
      address,
      parseFloat(expectedAmount)
    );

    if (!transaction) {
      return NextResponse.json({
        status: 'PENDING',
        message: 'No payment received yet',
        expectedAmount: parseFloat(expectedAmount),
        receivedAmount: 0,
        remainingAmount: parseFloat(expectedAmount)
      });
    }

    const response = {
      status: transaction.status,
      expectedAmount: transaction.expectedAmount,
      receivedAmount: transaction.amount,
      remainingAmount: transaction.remainingAmount,
      message: transaction.status === 'PARTIAL' 
        ? `Partial payment received. Please send remaining ${transaction.remainingAmount} USDT`
        : transaction.status === 'CONFIRMED'
        ? 'Payment completed successfully'
        : 'Payment pending'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Payment status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
} 