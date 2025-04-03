import { NextResponse } from 'next/server';

export async function authenticate(req: Request) {
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
        return new NextResponse(
            JSON.stringify({ error: 'API key required' }),
            { status: 401 }
        );
    }

    if (apiKey !== process.env.ADMIN_API_KEY) {
        return new NextResponse(
            JSON.stringify({ error: 'Invalid API key' }),
            { status: 401 }
        );
    }

    return null; // Authentication successful
} 