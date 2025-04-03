import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Admin } from '@/models/admin';

export async function GET() {
  try {
    await dbConnect();
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'mula@gmail.com' });
    if (existingAdmin) {
      return NextResponse.json({ message: 'Admin user already exists' });
    }
    
    // Create new admin with default credentials
    const admin = new Admin({
      email: 'mula@gmail.com',
      password: '12345678', // Will be encrypted by mongoose schema
      createdAt: new Date()
    });

    await admin.save();
    
    return NextResponse.json({ 
      message: 'Admin user created successfully',
      credentials: {
        email: 'mula@gmail.com',
        password: '12345678'
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
} 