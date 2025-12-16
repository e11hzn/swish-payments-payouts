'use client';

import { useState } from 'react';

export default function Home() {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMessage, setPayoutMessage] = useState('');
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [payoutResponse, setPayoutResponse] = useState(null);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentResponse(null);
    const res = await fetch('/api/paymentrequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paymentAmount, message: paymentMessage }),
    });
    const data = await res.json();
    setPaymentResponse(data);
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutResponse(null);
    const res = await fetch('/api/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: payoutAmount, message: payoutMessage }),
    });
    const data = await res.json();
    setPayoutResponse(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-16 px-8 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50 mb-8">
          Swish Test
        </h1>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Payment Request</h2>
            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label htmlFor="paymentAmount" className="block mb-2">Amount</label>
                <input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="paymentMessage" className="block mb-2">Message</label>
                <input
                  id="paymentMessage"
                  type="text"
                  value={paymentMessage}
                  onChange={(e) => setPaymentMessage(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
                Create Payment
              </button>
            </form>
            {paymentResponse && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold">Response:</h3>
                <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(paymentResponse, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="p-8 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Payout Request</h2>
            <form onSubmit={handlePayoutSubmit}>
              <div className="mb-4">
                <label htmlFor="payoutAmount" className="block mb-2">Amount</label>
                <input
                  id="payoutAmount"
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="payoutMessage" className="block mb-2">Message</label>
                <input
                  id="payoutMessage"
                  type="text"
                  value={payoutMessage}
                  onChange={(e) => setPayoutMessage(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
                Create Payout
              </button>
            </form>
            {payoutResponse && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold">Response:</h3>
                <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(payoutResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
