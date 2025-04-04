import crypto from 'crypto';

export class CallbackService {
  private maxRetries = 3;

  async sendPaymentCallback(payment: any, status: string, receivedAmount: number) {
    let retryCount = 0;
    let lastError;

    while (retryCount < this.maxRetries) {
      try {
        if (!payment.callbackUrl) {
          console.log('No callback URL specified');
          return;
        }

        const payload = {
          orderId: payment.orderId,
          status,
          amount: payment.amount,
          receivedAmount,
          address: payment.address,
          timestamp: new Date().toISOString()
        };

        // Generate signature using API key as secret
        const signature = crypto
          .createHmac('sha256', process.env.ADMIN_API_KEY || '')
          .update(JSON.stringify(payload))
          .digest('hex');

        console.log('Sending callback to:', payment.callbackUrl);
        console.log('Callback payload:', payload);

        const response = await fetch(payment.callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Callback failed with status ${response.status}: ${await response.text()}`);
        }

        console.log('Callback sent successfully');
        return true;
      } catch (error) {
        lastError = error;
        retryCount++;
        
        console.error(`Callback attempt ${retryCount} failed:`, error);
        
        if (retryCount < this.maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('All callback attempts failed:', lastError);
    return false;
  }
} 