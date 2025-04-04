import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Admin } from '@/models/admin';
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

        await dbConnect();
        const admin = await Admin.findOne({ email: body.email });
        
        if (!admin || admin.password !== body.password) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Authentication failed:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
} 