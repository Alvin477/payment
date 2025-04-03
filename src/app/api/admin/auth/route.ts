import { NextResponse } from 'next/server';
// Remove unused encrypt import if not needed
// import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.email || !body.password) {
            return NextResponse.json(
                { error: 'Missing credentials' },
                { status: 400 }
            );
        }

        // Add your authentication logic here
        if (body.email === process.env.ADMIN_EMAIL && 
            body.password === process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
} 