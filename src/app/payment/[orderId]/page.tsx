'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TRON_CONFIG } from '@/config/tron';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentStatus {
  status: string;
  receivedAmount: number;
  remainingAmount: number;
  message: string;
}

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const address = searchParams.get('address');
  const amount = searchParams.get('amount');
  const orderId = params.orderId;

  const tronscanUrl = `${TRON_CONFIG.NETWORK === 'mainnet' 
    ? 'https://tronscan.org' 
    : 'https://nile.tronscan.org'}/#/address/${address}`;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status?address=${address}&amount=${amount}`);
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to check status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check immediately and then every 10 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, [address, amount]);

  // Countdown timer effect
  useEffect(() => {
    const endTime = localStorage.getItem(`payment_end_${orderId}`);
    if (!endTime) {
      const end = Date.now() + 30 * 60 * 1000; // 30 minutes from now
      localStorage.setItem(`payment_end_${orderId}`, end.toString());
    }

    const timer = setInterval(() => {
      const end = Number(localStorage.getItem(`payment_end_${orderId}`));
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        localStorage.removeItem(`payment_end_${orderId}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address || '');
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8 flex flex-col justify-center">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-800 shadow-xl border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Deposit</h2>
            {status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                status.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
                status.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {status.status === 'CONFIRMED' ? 'Completed' : status.status}
              </span>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Order ID</p>
              <p className="font-mono text-sm bg-gray-700/50 p-2 rounded-lg text-gray-300">{orderId}</p>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-400 text-sm">USDT (TRC20) Address</p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center"
                  >
                    Copy Address
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="flex flex-col items-center space-y-4">
                  <QRCodeSVG 
                    value={address || ''} 
                    size={160}
                    level="H"
                    includeMargin={true}
                    className="bg-white p-2 rounded-lg"
                  />
                  <p className="font-mono text-xs break-all text-gray-300">{address}</p>
                </div>
              </div>
              {showCopySuccess && (
                <div className="absolute top-0 right-0 mt-8 mr-2 px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">
                  Copied! ✓
                </div>
              )}
              <a 
                href={tronscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-flex items-center"
              >
                View on Tronscan
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </a>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-400 text-sm">Expected Amount</p>
                <div className="text-sm text-gray-400">
                  Time left: <span className={`font-mono ${timeLeft < 300 ? 'text-red-400' : 'text-blue-400'}`}>{formatTime(timeLeft)}</span>
                </div>
              </div>
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="flex items-baseline justify-center space-x-2">
                  <span className="text-2xl font-bold text-white">{amount}</span>
                  <span className="text-gray-400">USDT</span>
                </div>
              </div>
            </div>

            {status && (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    status.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
                    status.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {status.status === 'CONFIRMED' ? '✓ Payment completed successfully!' :
                     status.status === 'PARTIAL' ? `⚠️ Partial payment received. Please send ${status.remainingAmount} more USDT` :
                     '⏳ Waiting for payment confirmation...'}
                  </span>
                </div>
                
                {status.receivedAmount > 0 && (
                  <div className="bg-gray-700/30 p-3 rounded-lg mb-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Received</span>
                      <span className="text-white">{status.receivedAmount} USDT</span>
                    </div>
                    {status.status === 'PARTIAL' && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-600 text-sm">
                        <span className="text-gray-400">Remaining</span>
                        <span className="text-yellow-400">{status.remainingAmount} USDT</span>
                      </div>
                    )}
                  </div>
                )}

                {status.status === 'CONFIRMED' && (
                  <div className="text-center mt-6">
                    <div className="bg-emerald-500/10 text-emerald-400 p-6 rounded-lg mb-4">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
                      <p className="text-sm opacity-90">Your payment has been confirmed. Redirecting to dashboard...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 