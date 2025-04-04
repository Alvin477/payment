import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Payment } from '@/models/payment';
import { decrypt } from '@/lib/crypto';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const transferStatus = searchParams.get('transferStatus');
    
    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    
    if (transferStatus === 'PENDING_TRANSFER') {
      query.status = 'CONFIRMED';
      query.transferredToMain = false;
      query.trxSent = true;
    }
    
    const skip = (page - 1) * limit;
    
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .select('orderId status amount receivedAmount remainingAmount address createdAt transferredToMain trxSent privateKey')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Payment.countDocuments(query)
    ]);
    
    // Process payments and decrypt private keys
    const processedPayments = payments.map(payment => {
      const data = { ...payment };
      if (data.privateKey) {
        try {
          data.privateKey = decrypt(data.privateKey);
        } catch (error) {
          console.error('Failed to decrypt private key:', error);
        }
      }
      return data;
    });

    return NextResponse.json({
      payments: processedPayments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
} 