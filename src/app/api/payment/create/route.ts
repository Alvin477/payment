import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';

const paymentService = new PaymentService();

export async function POST(request: Request) {
  try {
    // Initialize a test payment with a unique orderId
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderId = `MH-${timestamp}-${randomId}`;
    
    const testPayment = await paymentService.initializePayment({
      amount: 10, // 10 USDT test amount
      orderId,
      currency: 'USDT',
      callbackUrl: '/api/payment/callback'
    });

    if (!testPayment?.address) {
      throw new Error('Failed to generate payment address');
    }

    const response = {
      message: 'Test payment initialized',
      paymentAddress: testPayment.address,
      amount: testPayment.amount,
      orderId: testPayment.orderId,
      expiresAt: testPayment.expiresAt,
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Test payment failed:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Test payment failed' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const amount = searchParams.get('amount');

    if (!address || !amount) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing address or amount' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const status = await paymentService.checkPayment(
      address,
      parseFloat(amount)
    );

    const response = {
      status: status?.status || 'PENDING',
      receivedAmount: status?.amount || 0,
      remainingAmount: status?.remainingAmount || parseFloat(amount),
      message: !status ? 'Waiting for payment...' :
        status.status === 'PARTIAL' ? `Partial payment received. Please send ${status.remainingAmount} more USDT` :
        status.status === 'CONFIRMED' ? 'Payment confirmed!' :
        'Payment pending'
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Status check failed:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Status check failed' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 