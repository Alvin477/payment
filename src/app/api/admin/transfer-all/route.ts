import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Payment } from '@/models/payment';
import { PaymentService } from '@/lib/payment';

const paymentService = new PaymentService();

export async function POST() {
  try {
    await dbConnect();
    
    // Find all confirmed payments that haven't been transferred
    const payments = await Payment.find({
      status: 'CONFIRMED',
      transferredToMain: false,
      trxSent: true
    });
    
    if (payments.length === 0) {
      return NextResponse.json({ message: 'No pending transfers found' });
    }

    const results = [];
    
    // Process each payment
    for (const payment of payments) {
      try {
        const success = await paymentService.transferToMainWallet(
          payment.address,
          payment.privateKey,
          payment.receivedAmount
        );
        
        results.push({
          address: payment.address,
          success,
          orderId: payment.orderId
        });
      } catch (error) {
        console.error(`Failed to transfer payment ${payment.orderId}:`, error);
        results.push({
          address: payment.address,
          success: false,
          orderId: payment.orderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: payments.length,
      results
    });
  } catch (error) {
    console.error('Failed to process bulk transfer:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk transfer' },
      { status: 500 }
    );
  }
} 