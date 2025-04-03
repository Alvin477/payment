export interface PaymentRequest {
  amount: number;
  orderId: string;
  currency: string;
  callbackUrl?: string;
}

export interface PaymentSession {
  id: string;
  status: PaymentStatus;
  amount: number;
  receivedAmount: number;
  remainingAmount: number;
  orderId: string;
  address: string;
  currency: string;
  createdAt: Date;
  expiresAt: Date;
  callbackUrl?: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  RECEIVED = 'RECEIVED',
  CONFIRMED = 'CONFIRMED',
  TRANSFERRED = 'TRANSFERRED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export interface Transaction {
  txId: string;
  from: string;
  to: string;
  amount: number;
  expectedAmount: number;
  remainingAmount: number;
  currency: string;
  timestamp: Date;
  status: TransactionStatus;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
} 