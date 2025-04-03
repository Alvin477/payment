import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { authenticate } from '@/middleware/auth';

export async function POST(request: Request) {
    try {
        // Check authentication
        const authError = await authenticate(request);
        if (authError) return authError;

        const body = await request.json();
        
        // Validate request
        if (!body.amount || !body.orderId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        
        // Initialize payment
        const paymentService = new PaymentService();
        const session = await paymentService.initializePayment({
            amount: parseFloat(body.amount),
            orderId: body.orderId,
            currency: body.currency || 'USDT',
            callbackUrl: body.callbackUrl
        });
        
        return NextResponse.json(session);
    } catch (error) {
        console.error('Payment initialization failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Payment initialization failed' },
            { status: 500 }
        );
    }
} 