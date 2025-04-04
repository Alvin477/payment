import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Payment } from '@/models/payment';
import { CallbackService } from '@/lib/callback';

export async function POST() {
  try {
    await dbConnect();
    
    // Find payments that need callback retry
    const pendingCallbacks = await Payment.find({
      callbackPending: true,
      callbackAttempts: { $lt: 5 },
      lastCallbackAttempt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes ago
    }).limit(5);

    const callbackService = new CallbackService();
    const results = [];

    for (const payment of pendingCallbacks) {
      try {
        const success = await callbackService.sendPaymentCallback(
          payment,
          'CONFIRMED',
          payment.receivedAmount
        );

        if (success) {
          await Payment.findByIdAndUpdate(payment._id, {
            callbackPending: false,
            lastCallbackAttempt: new Date(),
            $inc: { callbackAttempts: 1 }
          });
          results.push({ orderId: payment.orderId, status: 'success' });
        } else {
          await Payment.findByIdAndUpdate(payment._id, {
            lastCallbackAttempt: new Date(),
            $inc: { callbackAttempts: 1 }
          });
          results.push({ orderId: payment.orderId, status: 'failed' });
        }
      } catch (error: any) {
        console.error(`Callback retry failed for order ${payment.orderId}:`, error);
        results.push({ 
          orderId: payment.orderId, 
          status: 'error', 
          message: error?.message || 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Callback retry endpoint error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 