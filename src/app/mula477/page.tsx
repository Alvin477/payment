'use client';

import React, { useEffect, useState } from 'react';
import { PaymentStatus } from '@/types/payment';

interface Payment {
  _id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  receivedAmount: number;
  remainingAmount: number;
  address: string;
  privateKey: string;
  createdAt: string;
  transferredToMain: boolean;
  trxSent: boolean;
}

interface PaginatedResponse {
  payments: Payment[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'PARTIAL':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'PENDING':
        return 'bg-blue-500/10 text-blue-400';
      case 'EXPIRED':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

export default function AdminPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ status: 'ALL', transferStatus: 'ALL' });

  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (auth) {
      setIsLoggedIn(true);
      fetchPayments();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const token = btoa(`${email}:${password}`);
      localStorage.setItem('adminAuth', token);
      setIsLoggedIn(true);
      fetchPayments();
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const fetchPayments = async () => {
    try {
      const auth = localStorage.getItem('adminAuth');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...filter
      });
      
      const res = await fetch(`/api/admin/payments?${params}`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      const data: PaginatedResponse = await res.json();
      setPayments(data.payments);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [currentPage, filter]);

  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSendTrx = async (address: string) => {
    try {
      const auth = localStorage.getItem('adminAuth');
      const res = await fetch('/api/admin/send-trx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ address })
      });
      if (!res.ok) {
        throw new Error('Failed to send TRX');
      }
      alert('TRX sent successfully');
      fetchPayments();
    } catch (error) {
      alert('Failed to send TRX: ' + (error as Error).message);
    }
  };

  const handleTransferToMain = async (address: string) => {
    try {
      const auth = localStorage.getItem('adminAuth');
      const res = await fetch('/api/admin/transfer-to-main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ address })
      });
      if (!res.ok) {
        throw new Error('Failed to transfer');
      }
      alert('Transfer successful');
      fetchPayments();
    } catch (error) {
      alert('Transfer failed: ' + (error as Error).message);
    }
  };

  const handleTransferAll = async () => {
    try {
      const auth = localStorage.getItem('adminAuth');
      const res = await fetch('/api/admin/transfer-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        }
      });
      
      const data = await res.json();
      
      if (data.message === 'No pending transfers found') {
        alert('No pending transfers found');
        return;
      }
      
      if (data.success) {
        const successful = data.results.filter((r: { success: boolean }) => r.success).length;
        const failed = data.results.filter((r: { success: boolean }) => !r.success).length;
        alert(`Transfers completed:\nSuccessful: ${successful}\nFailed: ${failed}`);
      } else {
        throw new Error('Bulk transfer failed');
      }
      
      fetchPayments();
    } catch (error) {
      alert('Transfer all failed: ' + (error as Error).message);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Admin Login</h1>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchPayments}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm md:text-base"
            >
              Refresh
            </button>
            <button
              onClick={handleTransferAll}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm md:text-base"
            >
              Transfer All
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('adminAuth');
                setIsLoggedIn(false);
                setPayments([]);
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm md:text-base"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={filter.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full md:w-auto bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select
                value={filter.transferStatus}
                onChange={(e) => handleFilterChange('transferStatus', e.target.value)}
                className="w-full md:w-auto bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Transfers</option>
                <option value="PENDING_TRANSFER">Pending Transfer</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {payments.map((payment) => (
                  <React.Fragment key={payment._id}>
                    <tr className="hover:bg-gray-800/30">
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="font-mono text-gray-300">{payment.orderId}</span>
                        <span className="md:hidden mt-1 block">
                          <StatusBadge status={payment.status} />
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-300">{payment.amount} USDT</div>
                        {payment.receivedAmount > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Received: {payment.receivedAmount} USDT
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm hidden lg:table-cell">
                        <div className="font-mono text-gray-400 truncate max-w-[200px]">
                          {payment.address}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setExpandedRow(expandedRow === payment._id ? null : payment._id)}
                            className="px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-xs"
                          >
                            {expandedRow === payment._id ? 'Hide' : 'View'}
                          </button>
                          {payment.status === 'CONFIRMED' && !payment.transferredToMain && payment.trxSent && (
                            <button
                              onClick={() => handleTransferToMain(payment.address)}
                              className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors text-xs"
                            >
                              Transfer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === payment._id && (
                      <tr className="bg-gray-800/30">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="lg:hidden">
                              <div className="text-xs font-medium text-gray-400 mb-1">Address</div>
                              <div className="font-mono text-gray-300 break-all text-sm">
                                {payment.address}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-400 mb-1">Private Key</div>
                              <div className="font-mono text-gray-300 break-all text-sm">
                                {payment.privateKey}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-xs font-medium text-gray-400 mb-1">Created</div>
                                <div className="text-gray-300">
                                  {new Date(payment.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-400 mb-1">TRX Sent</div>
                                <div className="text-gray-300">
                                  {payment.trxSent ? 'Yes' : 'No'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-400 mb-1">Transferred</div>
                                <div className="text-gray-300">
                                  {payment.transferredToMain ? 'Yes' : 'No'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 