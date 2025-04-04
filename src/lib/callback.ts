import crypto from 'crypto';

export class CallbackService {
  private maxRetries = 3;

  async sendPaymentCallback(payment: any, status: string, receivedAmount: number): Promise<boolean> {
    const payload = {
      orderId: payment.orderId,
      status: status,
      amount: Number(payment.amount),
      receivedAmount: Number(receivedAmount),
      address: payment.address,
      timestamp: new Date().toISOString()
    };

    // Generate signature exactly as Laravel verifies it
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.ENCRYPTION_KEY || '')
      .update(payloadString)
      .digest('hex');

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log('Sending callback to:', payment.callbackUrl);
        console.log('Callback payload:', payload);

        const response = await fetch(payment.callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Signature': signature
          },
          body: payloadString
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Callback failed with status ${response.status}: ${JSON.stringify(error)}`);
        }

        console.log('Successfully sent callback to main system');
        return true;
      } catch (error: any) {
        lastError = error;
        console.error(`Callback attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return false;
  }
} 