import mongoose, { Model } from 'mongoose';
import { encrypt, decrypt } from '@/lib/crypto';

interface IAdmin {
  email: string;
  password: string;
  createdAt: Date;
}

const adminSchema = new mongoose.Schema<IAdmin>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    set: function(value: string) {
      // Only encrypt if the value hasn't been encrypted yet
      try {
        decrypt(value);
        return value; // If decryption succeeds, it's already encrypted
      } catch {
        return encrypt(value); // If decryption fails, encrypt the value
      }
    },
    get: function(value: string) {
      if (!value) return value;
      try {
        return decrypt(value);
      } catch (error) {
        console.error('Failed to decrypt password:', error);
        return value;
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

let Admin: Model<IAdmin>;

try {
  Admin = mongoose.model<IAdmin>('Admin');
} catch {
  Admin = mongoose.model<IAdmin>('Admin', adminSchema);
}

export { Admin }; 