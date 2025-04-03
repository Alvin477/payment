import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Payment } from '@/models/payment';
import { TrxService } from '@/lib/trx';

const trxService = new TrxService();

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

    if (payment.trxSent) {
      return NextResponse.json(
        { error: 'TRX already sent' },
        { status: 400 }
      );
    }

    const txId = await trxService.sendTrxForFees(address, payment.receivedAmount);
    
    // Update payment record
    await Payment.findOneAndUpdate(
      { address },
      { 
        trxSent: true,
        $push: {
          transactions: {
            txId,
            from: process.env.FEE_WALLET_ADDRESS,
            type: 'TRX_FEE',
            timestamp: new Date(),
          }
        }
      }
    );

    return NextResponse.json({ success: true, txId });
  } catch (error) {
    console.error('Failed to send TRX:', error);
    return NextResponse.json(
      { error: 'Failed to send TRX' },
      { status: 500 }
    );
  }
} 