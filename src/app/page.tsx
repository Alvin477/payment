'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }
      
      if (!data.orderId || !data.paymentAddress || !data.amount) {
        throw new Error('Invalid response from server');
      }

      window.location.href = `/payment/${data.orderId}?address=${data.paymentAddress}&amount=${data.amount}`;
    } catch (error: unknown) {
      console.error('Failed to initiate payment:', error);
      setError((error as Error).message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">USDT Payment System</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <button
        onClick={initiatePayment}
        disabled={loading}
        className={`${
          loading 
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-700'
        } text-white font-bold py-3 px-6 rounded-lg text-lg relative min-w-[200px]`}
      >
        {loading ? (
          <>
            <span className="opacity-0">Initiate Payment</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            </div>
          </>
        ) : (
          'Initiate Payment'
        )}
      </button>
    </main>
  );
}
