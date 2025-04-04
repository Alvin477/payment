import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Payment } from '@/models/payment';
import { PaymentService } from '@/lib/payment';
import { decrypt } from '@/lib/crypto';

const paymentService = new PaymentService();

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    const payment = await Payment.findOne({ address });
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.transferredToMain) {
      return NextResponse.json(
        { error: 'Already transferred to main wallet' },
        { status: 400 }
      );
    }

    if (!payment.trxSent) {
      return NextResponse.json(
        { error: 'Must send TRX first' },
        { status: 400 }
      );
    }

    // Decrypt the private key before passing to transferToMainWallet
    const decryptedPrivateKey = decrypt(payment.privateKey);

    const success = await paymentService.transferToMainWallet(
      address,
      decryptedPrivateKey,
      payment.receivedAmount
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      throw new Error('Transfer failed');
    }
  } catch (error) {
    console.error('Failed to transfer to main wallet:', error);
    return NextResponse.json(
      { error: 'Failed to transfer to main wallet' },
      { status: 500 }
    );
  }
} 