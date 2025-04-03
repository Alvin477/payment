import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Admin } from '@/models/admin';
import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    await dbConnect();
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Compare with decrypted password (handled by mongoose getter)
    if (admin.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
} 