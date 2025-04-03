import dbConnect from '../lib/db';
import { Admin } from '../models/admin';

async function createAdmin() {
  try {
    await dbConnect();
    
    const admin = new Admin({
      email: 'mula@gmail.com',
      password: '12345678',
      createdAt: new Date()
    });

    await admin.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin(); 