import mongoose from 'mongoose';
import { PaymentStatus } from '@/types/payment';
import { encrypt, decrypt } from '@/lib/crypto';

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  },
  amount: {
    type: Number,
    required: true,
  },
  receivedAmount: {
    type: Number,
    default: 0,
  },
  remainingAmount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  privateKey: {
    type: String,
    required: true,
    set: (value: string) => encrypt(value),
    get: (value: string) => value ? decrypt(value) : value,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  callbackUrl: String,
  lastChecked: Date,
  transferredToMain: {
    type: Boolean,
    default: false,
  },
  trxSent: {
    type: Boolean,
    default: false,
  },
  transactions: [{
    txId: String,
    from: String,
    to: String,
    amount: Number,
    timestamp: Date,
    type: {
      type: String,
      enum: ['PAYMENT', 'TRX_ACTIVATION', 'TRX_FEE', 'TRX_RECOVERY', 'USDT_TRANSFER'],
      default: 'PAYMENT'
    }
  }],
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Remove encryption/decryption from pre-save as it's handled by the schema
paymentSchema.pre('save', function(next) {
  next();
});

let Payment: mongoose.Model<any>;

try {
  Payment = mongoose.model('Payment');
} catch {
  Payment = mongoose.model('Payment', paymentSchema);
}

export { Payment }; 