import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Payment } from '@/models/payment';

export async function GET() {
  try {
    await dbConnect();
    
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .select('orderId status amount receivedAmount remainingAmount address createdAt transferredToMain trxSent privateKey')
      .lean();
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
} 